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
    ZoomCaptureRequestSerializer
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
    """Zoom 캡처 분석 API"""
    
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
        
        # ✅ FileService 사용
        file_service = FileService(request.user)
        
        try:
            # ✅ 통합 파일 업로드
            media_file = file_service.upload_file(
                uploaded_file=screenshot,
                file_type='screenshot',
                purpose='zoom',
                is_temporary=True,  # 분석 후 삭제
                metadata={'session_id': session_id},
                use_s3=False
            )
            
            # AI 분석
            ai_service = AIModelService()
            full_path = os.path.join(settings.MEDIA_ROOT, media_file.file_path)
            result = ai_service.analyze_image(full_path)
            
            if not result['success']:
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # ✅ 새로운 API 명세에 맞춰 분석 결과 계산
            if 'face_quality_scores' in result:
                # 새로운 다중 얼굴 감지 방식
                face_scores = result['face_quality_scores']
                is_any_deepfake = any(face['is_deepfake'] for face in face_scores)
                avg_confidence = sum(face['rate'] for face in face_scores) / len(face_scores) if face_scores else 0
                
                # 분석 결과 결정
                if is_any_deepfake:
                    analysis_result = 'deepfake' if avg_confidence >= 0.8 else 'suspicious'
                else:
                    analysis_result = 'safe'
                
                confidence_score = avg_confidence * 100  # 0-100 스케일
                detection_details = face_scores
            else:
                # 이전 방식 (하위 호환)
                analysis_result = result.get('analysis_result', 'safe')
                confidence_score = result.get('confidence_score', 0)
                detection_details = None
            
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
                processing_time=result['processing_time'],
                ai_model_version='v1.0'
            )
            
            # ✅ 관계 연결
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
            
            # ✅ 임시 파일 즉시 삭제
            file_service.delete_file(media_file.file_id, hard_delete=True)
            
            return Response({
                'capture_id': capture.capture_id,
                'is_deepfake': is_deepfake,
                'confidence_score': float(confidence_score),  # ← 변수 사용!
                'analysis_result': analysis_result,  # ← 변수 사용!
                'alert_triggered': is_deepfake
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
        
        # 세션 종료
        session.end_time = timezone.now()
        session.session_status = 'completed'
        session.save()
        
        return Response(
            ZoomSessionSerializer(session).data,
            status=status.HTTP_200_OK
        )


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