from django.db import models
from django.conf import settings

class MediaFile(models.Model):
    """미디어 파일 관리"""
    
    FILE_TYPE_CHOICES = [
        ('image', '이미지'),
        ('video', '영상'),
        ('screenshot', '스크린샷'),
        ('document', '문서'),
    ]
    
    STORAGE_TYPE_CHOICES = [
        ('local', '로컬'),
        ('s3', 'S3'),
    ]
    
    PURPOSE_CHOICES = [
        ('detection', '딥페이크 분석'),
        ('protection', '콘텐츠 보호'),
        ('zoom', 'Zoom 감시'),
        # ('report', '신고 증거'),
    ]
    
    file_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='media_files',
        verbose_name='사용자'
    )
    
    # 파일 정보
    original_name = models.CharField(max_length=255, verbose_name='원본 파일명')
    file_name = models.CharField(max_length=255, verbose_name='저장된 파일명')
    file_size = models.BigIntegerField(verbose_name='파일 크기(bytes)')
    file_type = models.CharField(
        max_length=20,
        choices=FILE_TYPE_CHOICES,
        verbose_name='파일 유형'
    )
    file_format = models.CharField(max_length=10, verbose_name='파일 확장자')
    mime_type = models.CharField(max_length=100, verbose_name='MIME 타입')
    
    # 저장 위치
    storage_type = models.CharField(
        max_length=10,
        choices=STORAGE_TYPE_CHOICES,
        default='local',
        verbose_name='저장 위치'
    )
    file_path = models.TextField(verbose_name='파일 경로')
    s3_key = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        verbose_name='S3 키'
    )
    s3_bucket = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        verbose_name='S3 버킷'
    )
    
    # 사용 목적
    purpose = models.CharField(
        max_length=20,
        choices=PURPOSE_CHOICES,
        verbose_name='사용 목적'
    )
    is_temporary = models.BooleanField(
        default=False,
        verbose_name='임시 파일 여부'
    )
    is_deleted = models.BooleanField(
        default=False,
        verbose_name='삭제 여부'
    )
    
    # 연결된 레코드
    related_model = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name='연결된 모델'
    )
    related_record_id = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name='연결된 레코드 ID'
    )
    
    # 메타데이터
    metadata = models.JSONField(
        null=True,
        blank=True,
        verbose_name='추가 메타데이터'
    )
    
    # 타임스탬프
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='삭제일시'
    )
    
    class Meta:
        db_table = 'media_files'
        verbose_name = '미디어 파일'
        verbose_name_plural = '미디어 파일 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['purpose']),
            models.Index(fields=['is_temporary']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return f"{self.original_name} ({self.get_purpose_display()})"

class SystemLog(models.Model):
    """시스템 로그"""
    
    LOG_LEVEL_CHOICES = [
        ('debug', 'DEBUG'),
        ('info', 'INFO'),
        ('warning', 'WARNING'),
        ('error', 'ERROR'),
        ('critical', 'CRITICAL'),
    ]
    
    LOG_CATEGORY_CHOICES = [
        ('auth', '인증'),
        ('api', 'API'),
        ('detection', '탐지'),
        ('protection', '보호'),
        ('report', '신고'),
        ('system', '시스템'),
        ('database', '데이터베이스'),
    ]
    
    log_id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='system_logs',
        verbose_name='사용자'
    )
    log_level = models.CharField(
        max_length=20,
        choices=LOG_LEVEL_CHOICES,
        verbose_name='로그 레벨'
    )
    log_category = models.CharField(
        max_length=50,
        choices=LOG_CATEGORY_CHOICES,
        verbose_name='로그 카테고리'
    )
    message = models.TextField(verbose_name='메시지')
    error_code = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        verbose_name='오류 코드'
    )
    request_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name='요청 데이터'
    )
    response_data = models.JSONField(
        null=True,
        blank=True,
        verbose_name='응답 데이터'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    
    class Meta:
        db_table = 'system_logs'
        verbose_name = '시스템 로그'
        verbose_name_plural = '시스템 로그 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['log_level']),
            models.Index(fields=['log_category']),
            models.Index(fields=['user', '-created_at']),
        ]
    
    def __str__(self):
        return f"[{self.log_level.upper()}] {self.message[:50]}"