from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.utils import timezone
import os

from .models import ZoomSession, ZoomCapture
from .serializers import (
    ZoomSessionSerializer,
    ZoomCaptureSerializer,
    ZoomSessionStartSerializer,
    ZoomCaptureRequestSerializer,
    ZoomCaptureDetailSerializer
)
from detection.models import AnalysisRecord
from detection.services import AIModelService
from media_files.services import FileService


class ZoomSessionStartView(APIView):
    """Zoom 세션 시작 API"""
    
    def post(self, request):
        serializer = ZoomSessionStartSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        session_name = serializer.validated_data['session_name']
        
        # 세션 생성
        session = ZoomSession.objects.create(
            user=request.user,
            session_name=session_name,
            start_time=timezone.now(),
            session_status='active'
        )
        
        return Response(
            ZoomSessionSerializer(session).data,
            status=status.HTTP_201_CREATED
        )


class ZoomCaptureView(APIView):
    """
    Zoom 캡처 분석 API (30초 간격 제어)
    
    프론트엔드: 5초마다 캡처 → 즉시 백엔드 전송
    백엔드: 30초에 1번만 AI 서버로 전송 (과부하 방지)
    """
    
    def post(self, request, session_id):
        serializer = ZoomCaptureRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        screenshot = serializer.validated_data['screenshot']
        participant_count = serializer.validated_data['participant_count']
        
        # 세션 확인
        try:
            session = ZoomSession.objects.get(
                session_id=session_id,
                user=request.user,
                session_status='active'
            )
        except ZoomSession.DoesNotExist:
            return Response(
                {'error': '활성화된 세션을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # ✅ 30초 경과 확인
        now = timezone.now()
        should_analyze = False
        
        if session.last_ai_analysis_time is None:
            # 첫 캡처 → 즉시 분석
            should_analyze = True
        else:
            # 마지막 AI 분석으로부터 30초 경과 여부 확인
            time_since_last_analysis = (now - session.last_ai_analysis_time).total_seconds()
            if time_since_last_analysis >= 30:
                should_analyze = True
        
        # ✅ FileService로 파일 저장
        file_service = FileService(request.user)
        
        try:
            # 파일 업로드 (S3 사용)
            media_file = file_service.upload_file(
                uploaded_file=screenshot,
                file_type='screenshot',
                purpose='zoom',
                is_temporary=True,
                metadata={'session_id': session_id},
                use_s3=True
            )
            
            # S3 URL 생성
            from media_files.storage import S3Storage
            
            if media_file.storage_type == 's3':
                s3_storage = S3Storage()
                s3_url = s3_storage.get_presigned_url(media_file.s3_key)
            else:
                s3_url = request.build_absolute_uri(f'/media/{media_file.file_path}')
            
            # ✅ AI 분석 여부 결정
            if should_analyze:
                # AI 분석 수행
                ai_service = AIModelService()
                result = ai_service.analyze_image(s3_url)
                
                if not result['success']:
                    # AI 분석 실패 시 기본값
                    analysis_result = 'safe'
                    confidence_score = 0
                    detection_details = None
                else:
                    # ResultUrl Presigned URL 변환
                    import re
                    for face in result['face_quality_scores']:
                        if 'ResultUrl' in face and face['ResultUrl']:
                            original_url = face['ResultUrl']
                            match = re.search(r'amazonaws\.com/(.+?)$', original_url)
                            if match:
                                s3_key = match.group(1)
                                s3_storage = S3Storage()
                                face['ResultUrl'] = s3_storage.get_presigned_url(s3_key)
                    
                    # 분석 결과 처리
                    face_scores = result['face_quality_scores']
                    is_any_deepfake = any(face['is_deepfake'] for face in face_scores)
                    avg_confidence = sum(face['rate'] for face in face_scores) / len(face_scores) if face_scores else 0
                    
                    if is_any_deepfake:
                        analysis_result = 'deepfake' if avg_confidence >= 0.8 else 'suspicious'
                    else:
                        analysis_result = 'safe'
                    
                    confidence_score = avg_confidence * 100
                    detection_details = face_scores
                
                # ✅ 마지막 AI 분석 시간 업데이트 (중요!)
                session.last_ai_analysis_time = now
                session.save(update_fields=['last_ai_analysis_time'])
                
                processing_time = result.get('processing_time', 0)
            else:
                # ✅ AI 분석 스킵 (30초 미경과)
                analysis_result = 'safe'
                confidence_score = 0
                detection_details = None
                processing_time = 0
            
            # 분석 기록 저장
            record = AnalysisRecord.objects.create(
                user=request.user,
                analysis_type='zoom',
                file_name=media_file.original_name,
                file_size=media_file.file_size,
                file_format=media_file.file_format,
                original_path=media_file.file_path,
                analysis_result=analysis_result,
                confidence_score=confidence_score,
                detection_details=detection_details,
                processing_time=processing_time,
                ai_model_version='v1.0'
            )
            
            # 관계 연결
            media_file.related_model = 'AnalysisRecord'
            media_file.related_record_id = record.record_id
            media_file.save()
            
            # Zoom 캡처 기록
            is_deepfake = analysis_result in ['suspicious', 'deepfake']
            
            capture = ZoomCapture.objects.create(
                session=session,
                record=record,
                participant_count=participant_count,
                alert_triggered=is_deepfake
            )
            
            # 세션 통계 업데이트
            session.total_captures += 1
            if is_deepfake:
                session.suspicious_detections += 1
            session.save()
            
            # ✅ 즉시 응답
            return Response({
                'capture_id': capture.capture_id,
                'session_id': session.session_id,  # ✅ 추가
                'image_url': None,  # 일단 None (조회 API에서 제공)
                'timestamp': capture.capture_timestamp.isoformat(),  # ✅ 추가
                'is_deepfake': is_deepfake,
                'confidence': float(confidence_score),  # ✅ confidence_score → confidence
                'ai_result': {  # ✅ 구조 변경
                    'face_count': len(detection_details) if detection_details else 0,
                    'face_quality_scores': detection_details or []
                },
                # 기존 필드들 (호환성)
                'queued': not should_analyze,
                'ai_analyzed': should_analyze,
                'analysis_result': analysis_result,
                'next_analysis_in': 30 if should_analyze else int(30 - time_since_last_analysis)
            }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )





class ZoomSessionEndView(APIView):
    """Zoom 세션 종료 API"""
    
    def post(self, request, session_id):
        try:
            session = ZoomSession.objects.get(
                session_id=session_id,
                user=request.user,
                session_status='active'
            )
        except ZoomSession.DoesNotExist:
            return Response(
                {'error': '활성화된 세션을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        session.end_time = timezone.now()
        session.session_status = 'completed'
        session.save()
        
        # ✅ 응답 구조 변경
        return Response({
            'session_id': session.session_id,
            'session_name': session.session_name,
            'start_time': session.start_time.isoformat(),
            'end_time': session.end_time.isoformat(),
            'total_captures': session.total_captures,
            'deepfake_count': session.suspicious_detections,  # ✅ 필드명 변경
            'status': session.session_status  # ✅ session_status → status
        }, status=status.HTTP_200_OK)

class ZoomSessionListView(generics.ListAPIView):
    """Zoom 세션 목록 조회 API"""
    
    serializer_class = ZoomSessionSerializer
    
    def get_queryset(self):
        queryset = ZoomSession.objects.filter(user=self.request.user)
        
        # 필터링
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(session_status=status_filter)
        
        return queryset

class ZoomSessionDetailView(generics.RetrieveAPIView):
    """Zoom 세션 상세 조회 API"""
    
    serializer_class = ZoomSessionSerializer
    
    def get_queryset(self):
        return ZoomSession.objects.filter(user=self.request.user)


class ZoomCaptureDetailView(generics.RetrieveAPIView):
    """Zoom 캡처 상세 조회 API"""
    
    serializer_class = ZoomCaptureDetailSerializer
    
    def get_queryset(self):
        return ZoomCapture.objects.filter(
            session__user=self.request.user
        ).select_related('record', 'session')


class ZoomSessionReportView(APIView):
    """Zoom 세션 보고서 API"""
    
    def get(self, request, session_id):
        try:
            session = ZoomSession.objects.get(
                session_id=session_id,
                user=request.user
            )
        except ZoomSession.DoesNotExist:
            return Response(
                {'error': '세션을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 캡처 목록
        captures = ZoomCapture.objects.filter(session=session).select_related('record')
        
        # 요약 정보
        summary = {
            'total_captures': session.total_captures,
            'suspicious_detections': session.suspicious_detections,
            'detection_rate': round(
                (session.suspicious_detections / session.total_captures * 100)
                if session.total_captures > 0 else 0, 2
            ),
            'duration_seconds': session.duration,
            'average_participants': round(
                sum([c.participant_count for c in captures]) / len(captures)
                if len(captures) > 0 else 0, 1
            )
        }
        
        data = {
            'session': ZoomSessionSerializer(session).data,
            'captures': ZoomCaptureSerializer(captures, many=True).data,
            'summary': summary
        }
        
        return Response(data)