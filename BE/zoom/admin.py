from django.contrib import admin
from .models import ZoomSession, ZoomCapture


@admin.register(ZoomSession)
class ZoomSessionAdmin(admin.ModelAdmin):
    """Zoom 세션 관리자"""
    
    list_display = [
        'session_id',
        'user',
        'session_name',
        'session_status',
        'total_captures',
        'suspicious_detections',
        'detection_rate_display',
        'start_time'
    ]
    list_filter = ['session_status', 'start_time']
    search_fields = ['session_name', 'user__email']
    readonly_fields = ['session_id', 'start_time', 'end_time']
    ordering = ['-start_time']
    
    def detection_rate_display(self, obj):
        """의심 탐지율"""
        if obj.total_captures == 0:
            return "0%"
        rate = (obj.suspicious_detections / obj.total_captures) * 100
        return f"{rate:.1f}%"
    
    detection_rate_display.short_description = '탐지율'


@admin.register(ZoomCapture)
class ZoomCaptureAdmin(admin.ModelAdmin):
    """Zoom 캡처 관리자"""
    
    list_display = [
        'capture_id',
        'session',
        'participant_count',
        'alert_triggered',
        'capture_timestamp'
    ]
    list_filter = ['alert_triggered', 'capture_timestamp']
    search_fields = ['session__session_name']
    readonly_fields = ['capture_id', 'capture_timestamp']
    ordering = ['-capture_timestamp']