from django.db import models
from django.conf import settings


class ZoomSession(models.Model):
    """Zoom 세션"""
    
    STATUS_CHOICES = [
        ('active', '진행 중'),
        ('completed', '완료'),
        ('stopped', '중단'),
    ]
    
    session_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='zoom_sessions',
        verbose_name='사용자'
    )
    session_name = models.CharField(max_length=255, verbose_name='세션명')
    start_time = models.DateTimeField(verbose_name='시작 시간')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='종료 시간')
    total_captures = models.IntegerField(default=0, verbose_name='총 캡처 수')
    suspicious_detections = models.IntegerField(default=0, verbose_name='의심 감지 수')
    session_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name='세션 상태'
    )
    
    class Meta:
        db_table = 'zoom_sessions'
        verbose_name = 'Zoom 세션'
        verbose_name_plural = 'Zoom 세션 목록'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['user', '-start_time']),
            models.Index(fields=['session_status']),
        ]
    
    def __str__(self):
        return f"{self.session_name} ({self.get_session_status_display()})"
    
    @property
    def duration(self):
        """세션 지속 시간 계산"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return None


class ZoomCapture(models.Model):
    """Zoom 캡처"""
    
    capture_id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(
        ZoomSession,
        on_delete=models.CASCADE,
        related_name='captures',
        verbose_name='세션'
    )
    record = models.ForeignKey(
        'detection.AnalysisRecord',
        on_delete=models.CASCADE,
        related_name='zoom_captures',
        verbose_name='분석 기록'
    )
    participant_count = models.IntegerField(verbose_name='참가자 수')
    capture_timestamp = models.DateTimeField(auto_now_add=True, verbose_name='캡처 시간')
    alert_triggered = models.BooleanField(default=False, verbose_name='경고 발생 여부')
    
    class Meta:
        db_table = 'zoom_captures'
        verbose_name = 'Zoom 캡처'
        verbose_name_plural = 'Zoom 캡처 목록'
        ordering = ['-capture_timestamp']
        indexes = [
            models.Index(fields=['session', '-capture_timestamp']),
            models.Index(fields=['alert_triggered']),
        ]
    
    def __str__(self):
        return f"{self.session.session_name} - {self.capture_timestamp.strftime('%Y-%m-%d %H:%M:%S')}"