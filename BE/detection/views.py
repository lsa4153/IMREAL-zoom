from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Q
from django.conf import settings
import os

from .models import AnalysisRecord
from .serializers import (
    AnalysisRecordSerializer,
    AnalysisRecordListSerializer,
    ImageAnalysisRequestSerializer,
    VideoAnalysisRequestSerializer,
    AnalysisStatisticsSerializer
)
from .services import AIModelService
from media_files.services import FileService


class ImageAnalysisView(APIView):
    """이미지 딥페이크 분석 API (단일 사람)"""
    
    def post(self, request):
        serializer = ImageAnalysisRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        image = serializer.validated_data['image']
        analysis_type = serializer.validated_data['analysis_type']
        
        # ✅ FileService 사용
        file_service = FileService(request.user)
        
        try:
            # ✅ 통합 파일 업로드
            media_file = file_service.upload_file(
                uploaded_file=image,
                file_type='image',
                purpose='detection',
                is_temporary=True,  # 분석 후 삭제
                use_s3=True
            )
            
            # ✅ S3 URL 생성
            from media_files.storage import S3Storage
            
            if media_file.storage_type == 's3':
                s3_storage = S3Storage()
                s3_url = s3_storage.get_presigned_url(media_file.s3_key)
            else:
                # 로컬 파일인 경우 전체 URL 생성
                s3_url = request.build_absolute_uri(f'/media/{media_file.file_path}')
            
            # AI 분석 (S3 URL 전달)
            ai_service = AIModelService()
            result = ai_service.analyze_image(s3_url)
            
            if not result['success']:
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # AI 분석
            ai_service = AIModelService()
            result = ai_service.analyze_image(s3_url)

            if not result['success']:
                return Response(...)

            # ✅ ResultUrl을 Presigned URL로 변환 (먼저!)
            from media_files.storage import S3Storage
            import re

            for face in result['face_quality_scores']:  # ← result에서 직접!
                if 'ResultUrl' in face and face['ResultUrl']:
                    original_url = face['ResultUrl']
                    
                    # S3 키 추출
                    match = re.search(r'amazonaws\.com/(.+?)$', original_url)
                    if match:
                        s3_key = match.group(1)
                        
                        # Presigned URL 생성
                        s3_storage = S3Storage()
                        face['ResultUrl'] = s3_storage.get_presigned_url(s3_key)

            # ✅ 이제 변환된 face_quality_scores로 판정 계산
            face_scores = result['face_quality_scores']
            is_any_deepfake = any(face['is_deepfake'] for face in face_scores)
            avg_confidence = sum(face['rate'] for face in face_scores) / len(face_scores) if face_scores else 0

            # 분석 결과 결정
            if is_any_deepfake:
                analysis_result = 'deepfake' if avg_confidence >= 0.8 else 'suspicious'
            else:
                analysis_result = 'safe'

            # 분석 기록 저장
            record = AnalysisRecord.objects.create(
                user=request.user,
                analysis_type=analysis_type,
                file_name=media_file.original_name,
                file_size=media_file.file_size,
                file_format=media_file.file_format,
                original_path=media_file.file_path,
                analysis_result=analysis_result,
                confidence_score=avg_confidence * 100,  # 0-100 스케일
                detection_details=face_scores,  # ✅ 다중 얼굴 결과 저장
                processing_time=result['processing_time'],
                ai_model_version='v1.0'
            )
            
            media_file.related_model = 'AnalysisRecord'
            media_file.related_record_id = record.record_id
            media_file.save()
            
            # ✅ 새로운 API 응답 구조
            return Response({
                'record_id': record.record_id,
                'face_count': result['face_count'],
                'face_quality_scores': result['face_quality_scores'],
                'processing_time': result['processing_time']
            }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VideoAnalysisView(APIView):
    """영상 딥페이크 분석 API (다중 사람)"""
    
    def post(self, request):
        serializer = VideoAnalysisRequestSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        video = serializer.validated_data['video']
        
        # ✅ FileService 사용
        file_service = FileService(request.user)
        
        try:
            # ✅ 통합 파일 업로드
            media_file = file_service.upload_file(
                uploaded_file=video,
                file_type='video',
                purpose='detection',
                is_temporary=True,  # 분석 후 삭제
                use_s3=True
            )
            
            # ✅ S3 URL 생성
            from media_files.storage import S3Storage
            
            if media_file.storage_type == 's3':
                s3_storage = S3Storage()
                s3_url = s3_storage.get_presigned_url(media_file.s3_key)
            else:
                # 로컬 파일인 경우 전체 URL 생성
                s3_url = request.build_absolute_uri(f'/media/{media_file.file_path}')
            
            # AI 분석 (S3 URL 전달)
            ai_service = AIModelService()
            result = ai_service.analyze_video(s3_url)
            
            if not result['success']:
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # AI 분석
            ai_service = AIModelService()
            result = ai_service.analyze_image(s3_url)

            if not result['success']:
                return Response(...)

            # ✅ ResultUrl을 Presigned URL로 변환 (먼저!)
            from media_files.storage import S3Storage
            import re

            for face in result['face_quality_scores']:  # ← result에서 직접!
                if 'ResultUrl' in face and face['ResultUrl']:
                    original_url = face['ResultUrl']
                    
                    # S3 키 추출
                    match = re.search(r'amazonaws\.com/(.+?)$', original_url)
                    if match:
                        s3_key = match.group(1)
                        
                        # Presigned URL 생성
                        s3_storage = S3Storage()
                        face['ResultUrl'] = s3_storage.get_presigned_url(s3_key)

            # ✅ 이제 변환된 face_quality_scores로 판정 계산
            face_scores = result['face_quality_scores']
            is_any_deepfake = any(face['is_deepfake'] for face in face_scores)
            avg_confidence = sum(face['rate'] for face in face_scores) / len(face_scores) if face_scores else 0

            # 분석 결과 결정
            if is_any_deepfake:
                analysis_result = 'deepfake' if avg_confidence >= 0.8 else 'suspicious'
            else:
                analysis_result = 'safe'
            
            # 분석 기록 저장
            record = AnalysisRecord.objects.create(
                user=request.user,
                analysis_type='video',
                file_name=media_file.original_name,
                file_size=media_file.file_size,
                file_format=media_file.file_format,
                original_path=media_file.file_path,
                analysis_result=analysis_result,
                confidence_score=avg_confidence * 100,  # 0-100 스케일
                detection_details=face_scores,  # ✅ 다중 얼굴 결과 저장
                processing_time=result['processing_time'],
                ai_model_version='v1.0'
            )
            
            # ✅ 관계 연결
            media_file.related_model = 'AnalysisRecord'
            media_file.related_record_id = record.record_id
            media_file.save()
            
            # ✅ 새로운 API 응답 구조
            return Response({
                'record_id': record.record_id,
                'face_count': result['face_count'],
                'face_quality_scores': result['face_quality_scores'],
                'processing_time': result['processing_time']
            }, status=status.HTTP_201_CREATED)
        
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class AnalysisRecordListView(generics.ListAPIView):
    """분석 기록 목록 조회 API"""
    
    serializer_class = AnalysisRecordListSerializer
    
    def get_queryset(self):
        queryset = AnalysisRecord.objects.filter(user=self.request.user)
        
        # 필터링
        analysis_type = self.request.query_params.get('type', None)
        if analysis_type:
            queryset = queryset.filter(analysis_type=analysis_type)
        
        analysis_result = self.request.query_params.get('result', None)
        if analysis_result:
            queryset = queryset.filter(analysis_result=analysis_result)
        
        return queryset


class AnalysisRecordDetailView(generics.RetrieveDestroyAPIView):
    """분석 기록 상세 조회/삭제 API"""
    
    serializer_class = AnalysisRecordSerializer
    
    def get_queryset(self):
        return AnalysisRecord.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        """
        분석 기록 삭제 시 관련 파일도 삭제
        """
        # 관련 미디어 파일 찾기
        from media_files.models import MediaFile
        
        media_files = MediaFile.objects.filter(
            related_model='AnalysisRecord',
            related_record_id=instance.record_id,
            is_deleted=False
        )
        
        # FileService로 파일 삭제
        file_service = FileService(self.request.user)
        for media_file in media_files:
            try:
                file_service.delete_file(media_file.file_id, hard_delete=True)
            except:
                pass
        
        # 분석 기록 삭제
        instance.delete()


class AnalysisStatisticsView(APIView):
    """분석 통계 API"""
    
    def get(self, request):
        # 사용자의 전체 분석 통계
        records = AnalysisRecord.objects.filter(user=request.user)
        
        stats = records.aggregate(
            total=Count('record_id'),
            safe=Count('record_id', filter=Q(analysis_result='safe')),
            suspicious=Count('record_id', filter=Q(analysis_result='suspicious')),
            deepfake=Count('record_id', filter=Q(analysis_result='deepfake'))
        )
        
        # 최근 5개 분석 기록
        recent = records[:5]
        
        data = {
            'total_analyses': stats['total'],
            'safe_count': stats['safe'],
            'suspicious_count': stats['suspicious'],
            'deepfake_count': stats['deepfake'],
            'recent_analyses': AnalysisRecordListSerializer(recent, many=True).data
        }
        
        return Response(data)


class AIHealthCheckView(APIView):
    """AI 서버 상태 확인 API"""
    
    def get(self, request):
        ai_service = AIModelService()
        is_healthy = ai_service.check_health()
        
        return Response({
            'status': 'healthy' if is_healthy else 'unhealthy',
            'fastapi_url': ai_service.fastapi_url
        })