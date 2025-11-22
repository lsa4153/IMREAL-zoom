from django.db import models
from django.conf import settings


class AnalysisRecord(models.Model):
    """분석 기록"""
    
    ANALYSIS_TYPE_CHOICES = [
        ('image', '이미지'),
        ('video', '영상'),
        ('screenshot', '스크린샷'),
        ('zoom', 'Zoom 캡처'),
    ]
    
    RESULT_CHOICES = [
        ('safe', '안전'),
        ('suspicious', '의심'),
        ('deepfake', '딥페이크'),
    ]
    
    record_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='analysis_records',
        verbose_name='사용자'
    )
    analysis_type = models.CharField(
        max_length=20,
        choices=ANALYSIS_TYPE_CHOICES,
        verbose_name='분석 유형'
    )
    file_name = models.CharField(max_length=255, verbose_name='파일명')
    file_size = models.BigIntegerField(verbose_name='파일 크기(bytes)')
    file_format = models.CharField(max_length=50, verbose_name='파일 형식')
    original_path = models.TextField(verbose_name='원본 경로')
    processed_path = models.TextField(null=True, blank=True, verbose_name='처리된 경로')
    
    # ✅ 히트맵 이미지 경로 추가
    heatmap_path = models.TextField(
        null=True, 
        blank=True, 
        verbose_name='히트맵 이미지 경로'
    )
    
    analysis_result = models.CharField(
        max_length=20,
        choices=RESULT_CHOICES,
        verbose_name='분석 결과'
    )
    confidence_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        verbose_name='신뢰도 점수 (%)'
    )
    
    # ✅ 다중 사람 분석 결과 (영상/다중 인물용)
    detection_details = models.JSONField(
        null=True,
        blank=True,
        verbose_name='상세 탐지 결과',
        help_text='[{"person_id": 1, "is_deepfake": true, "confidence": 95.5, "detection_image_url": "https://..."}]'
    )
    
    processing_time = models.IntegerField(verbose_name='처리 시간(ms)')
    ai_model_version = models.CharField(max_length=50, verbose_name='AI 모델 버전')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    
    class Meta:
        db_table = 'analysis_records'
        verbose_name = '분석 기록'
        verbose_name_plural = '분석 기록 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['analysis_result']),
        ]
    
    def __str__(self):
        return f"{self.file_name} - {self.get_analysis_result_display()}"