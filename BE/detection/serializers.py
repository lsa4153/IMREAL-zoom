from rest_framework import serializers
from .models import AnalysisRecord


class AnalysisRecordSerializer(serializers.ModelSerializer):
    """분석 기록 Serializer"""
    
    analysis_type_display = serializers.CharField(
        source='get_analysis_type_display',
        read_only=True
    )
    analysis_result_display = serializers.CharField(
        source='get_analysis_result_display',
        read_only=True
    )
    # ✅ is_deepfake 필드 추가
    is_deepfake = serializers.SerializerMethodField()
    # ✅ 동적 URL 생성
    image_url = serializers.SerializerMethodField()
    heatmap_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalysisRecord
        fields = [
            'record_id',
            'user',
            'analysis_type',
            'analysis_type_display',
            'file_name',
            'file_size',
            'file_format',
            'original_path',
            'processed_path',
            'heatmap_path',
            'image_url',  # ✅ 추가
            'heatmap_url',  # ✅ 추가
            'analysis_result',
            'analysis_result_display',
            'is_deepfake',
            'confidence_score',
            'detection_details',
            'processing_time',
            'ai_model_version',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'record_id',
            'user',
            'created_at',
            'updated_at'
        ]
    
    def get_is_deepfake(self, obj):
        """analysis_result를 기반으로 is_deepfake 계산"""
        return obj.analysis_result in ['suspicious', 'deepfake']
    
    def get_image_url(self, obj):
        """원본 이미지 URL (매번 새로운 Presigned URL 생성)"""
        if not obj.original_path:
            return None
        
        from media_files.models import MediaFile
        from media_files.storage import S3Storage
        
        try:
            media_file = MediaFile.objects.get(
                related_model='AnalysisRecord',
                related_record_id=obj.record_id,
                is_deleted=False
            )
            
            # S3인 경우 매번 새로운 Presigned URL 생성
            if media_file.storage_type == 's3' and media_file.s3_key:
                s3_storage = S3Storage()
                return s3_storage.get_presigned_url(media_file.s3_key)
            
            # 로컬 파일인 경우
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{media_file.file_path}')
            
        except MediaFile.DoesNotExist:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{obj.original_path}')
        
        return None
    
    def get_heatmap_url(self, obj):
        """히트맵 이미지 URL (매번 새로운 Presigned URL 생성)"""
        if not obj.heatmap_path:
            return None
        
        from media_files.storage import S3Storage
        
        # S3 경로인지 확인
        if obj.heatmap_path.startswith('http'):
            # 이미 전체 URL인 경우 (AI 서버에서 받은 ResultUrl)
            # S3 키 추출 필요
            if 's3.amazonaws.com' in obj.heatmap_path or 's3.' in obj.heatmap_path:
                try:
                    # URL에서 S3 키 추출 시도
                    import re
                    match = re.search(r'amazonaws\.com/(.+?)(\?|$)', obj.heatmap_path)
                    if match:
                        s3_key = match.group(1)
                        s3_storage = S3Storage()
                        return s3_storage.get_presigned_url(s3_key)
                except:
                    pass
            # 추출 실패시 원본 URL 반환
            return obj.heatmap_path
        
        # 로컬 경로인 경우
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/media/{obj.heatmap_path}')
        
        return None


class ImageAnalysisRequestSerializer(serializers.Serializer):
    """이미지 분석 요청 Serializer"""
    
    image = serializers.ImageField(required=True)
    analysis_type = serializers.ChoiceField(
        choices=['image', 'screenshot'],
        default='image'
    )


class VideoAnalysisRequestSerializer(serializers.Serializer):
    """영상 분석 요청 Serializer"""
    
    video = serializers.FileField(required=True)
    
    def validate_video(self, value):
        # 파일 확장자 검증
        ext = value.name.split('.')[-1].lower()
        if ext not in ['mp4', 'mov', 'avi']:
            raise serializers.ValidationError(
                "MP4, MOV, AVI 파일만 업로드 가능합니다."
            )
        
        # 파일 크기 검증 (500MB)
        if value.size > 500 * 1024 * 1024:
            raise serializers.ValidationError(
                "파일 크기는 500MB 이하여야 합니다."
            )
        
        return value


class AnalysisRecordListSerializer(serializers.ModelSerializer):
    """분석 기록 목록 Serializer (간단한 정보만)"""
    
    analysis_type_display = serializers.CharField(
        source='get_analysis_type_display',
        read_only=True
    )
    analysis_result_display = serializers.CharField(
        source='get_analysis_result_display',
        read_only=True
    )
    is_deepfake = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalysisRecord
        fields = [
            'record_id',
            'analysis_type',
            'analysis_type_display',
            'file_name',
            'analysis_result',
            'analysis_result_display',
            'is_deepfake',
            'confidence_score',
            'image_url',
            'created_at'
        ]
        read_only_fields = fields
    
    def get_is_deepfake(self, obj):
        """analysis_result를 기반으로 is_deepfake 계산"""
        return obj.analysis_result in ['suspicious', 'deepfake']
    
    def get_image_url(self, obj):
        """분석한 이미지의 URL 반환 (매번 새로운 Presigned URL 생성)"""
        if not obj.original_path:
            return None
        
        from media_files.models import MediaFile
        from media_files.storage import S3Storage
        
        try:
            # MediaFile에서 정보 찾기
            media_file = MediaFile.objects.get(
                related_model='AnalysisRecord',
                related_record_id=obj.record_id,
                is_deleted=False
            )
            
            # S3인 경우 매번 새로운 Presigned URL 생성
            if media_file.storage_type == 's3' and media_file.s3_key:
                s3_storage = S3Storage()
                return s3_storage.get_presigned_url(media_file.s3_key)
            
            # 로컬 파일인 경우
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{media_file.file_path}')
            
        except MediaFile.DoesNotExist:
            # MediaFile이 없으면 original_path로 로컬 URL 생성
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{obj.original_path}')
        
        return None
    
class AnalysisStatisticsSerializer(serializers.Serializer):
    """분석 통계 Serializer"""
    
    total_analyses = serializers.IntegerField()
    safe_count = serializers.IntegerField()
    suspicious_count = serializers.IntegerField()
    deepfake_count = serializers.IntegerField()
    recent_analyses = AnalysisRecordListSerializer(many=True)