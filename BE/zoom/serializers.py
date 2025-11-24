from rest_framework import serializers
from .models import ZoomSession, ZoomCapture
from detection.serializers import AnalysisRecordSerializer


class ZoomSessionSerializer(serializers.ModelSerializer):
    """Zoom 세션 Serializer"""
    
    session_status_display = serializers.CharField(
        source='get_session_status_display',
        read_only=True
    )
    duration = serializers.SerializerMethodField()
    detection_rate = serializers.SerializerMethodField()
    deepfake_count = serializers.IntegerField(
        source='suspicious_detections',  # 기존 필드 재사용
        read_only=True
    )
    
    class Meta:
        model = ZoomSession
        fields = [
            'session_id',
            'user',
            'session_name',
            'start_time',
            'end_time',
            'duration',
            'total_captures',
            'suspicious_detections',
            'deepfake_count',  # ✅ 추가
            'detection_rate',
            'session_status',
            'session_status_display',
        ]
        read_only_fields = [
            'session_id',
            'user',
            'end_time',
            'total_captures',
            'suspicious_detections',
            'session_status',
        ]
    
    def get_duration(self, obj):
        """세션 지속 시간 (초)"""
        return obj.duration
    
    def get_detection_rate(self, obj):
        """의심 탐지율 (%)"""
        if obj.total_captures == 0:
            return 0.0
        return round((obj.suspicious_detections / obj.total_captures) * 100, 2)


# ✅ 새로운 Serializer 추가
class ZoomCaptureDetailSerializer(serializers.ModelSerializer):
    """Zoom 캡처 상세 Serializer (프론트 요구사항)"""
    
    image_url = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='capture_timestamp', read_only=True)
    is_deepfake = serializers.SerializerMethodField()
    confidence = serializers.SerializerMethodField()
    ai_result = serializers.SerializerMethodField()
    
    class Meta:
        model = ZoomCapture
        fields = [
            'capture_id',
            'session_id',
            'image_url',
            'timestamp',
            'is_deepfake',
            'confidence',
            'ai_result',
        ]
    
    def get_image_url(self, obj):
        """캡처 이미지 URL"""
        if not obj.record or not obj.record.original_path:
            return None
        
        from media_files.models import MediaFile
        from media_files.storage import S3Storage
        
        try:
            media_file = MediaFile.objects.get(
                related_model='AnalysisRecord',
                related_record_id=obj.record.record_id,
                is_deleted=False
            )
            
            if media_file.storage_type == 's3' and media_file.s3_key:
                s3_storage = S3Storage()
                return s3_storage.get_presigned_url(media_file.s3_key)
            
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(f'/media/{media_file.file_path}')
        except MediaFile.DoesNotExist:
            pass
        
        return None
    
    def get_is_deepfake(self, obj):
        """딥페이크 여부"""
        return obj.record.analysis_result in ['suspicious', 'deepfake']
    
    def get_confidence(self, obj):
        """신뢰도 점수"""
        return float(obj.record.confidence_score)
    
    def get_ai_result(self, obj):
        """AI 분석 결과"""
        if not obj.record.detection_details:
            return None
        
        return {
            'face_count': len(obj.record.detection_details),
            'face_quality_scores': obj.record.detection_details
        }


class ZoomCaptureSerializer(serializers.ModelSerializer):
    """Zoom 캡처 Serializer"""

    record = AnalysisRecordSerializer(read_only=True)
    
    # ✅ 이미 record에서 가져오므로 source 제거
    analysis_result = serializers.CharField(read_only=True)
    confidence_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = ZoomCapture
        fields = [
            'capture_id',
            'session',
            'record',
            'participant_count',
            'capture_timestamp',
            'alert_triggered',
            'analysis_result',
            'confidence_score',
        ]
        read_only_fields = fields


class ZoomSessionStartSerializer(serializers.Serializer):
    """Zoom 세션 시작 Serializer"""
    
    session_name = serializers.CharField(
        max_length=255,
        help_text="세션명 (예: 2025-01-11 면접)"
    )


class ZoomCaptureRequestSerializer(serializers.Serializer):
    """Zoom 캡처 분석 요청 Serializer"""
    
    screenshot = serializers.ImageField(help_text="캡처한 스크린샷")
    participant_count = serializers.IntegerField(
        min_value=1,
        help_text="참가자 수"
    )