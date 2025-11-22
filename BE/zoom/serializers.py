from rest_framework import serializers
from .models import ZoomSession, ZoomCapture


class ZoomSessionSerializer(serializers.ModelSerializer):
    """Zoom 세션 Serializer"""
    
    session_status_display = serializers.CharField(
        source='get_session_status_display',
        read_only=True
    )
    duration = serializers.SerializerMethodField()
    detection_rate = serializers.SerializerMethodField()
    
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


class ZoomCaptureSerializer(serializers.ModelSerializer):
    """Zoom 캡처 Serializer"""
    
    analysis_result = serializers.CharField(
        source='record.analysis_result',
        read_only=True
    )
    confidence_score = serializers.DecimalField(
        source='record.confidence_score',
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