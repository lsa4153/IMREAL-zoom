from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    """사용자 매니저"""
    
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('이메일은 필수입니다')
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """사용자 모델"""
    
    user_id = models.BigAutoField(primary_key=True)
    email = models.EmailField(unique=True, max_length=255, verbose_name='이메일')
    password_hash = models.CharField(max_length=255, verbose_name='비밀번호 해시')
    nickname = models.CharField(max_length=100, verbose_name='닉네임')
    profile_image = models.CharField(
        max_length=500, 
        null=True, 
        blank=True,
        verbose_name='프로필 이미지 경로'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    last_login = models.DateTimeField(null=True, blank=True, verbose_name='마지막 로그인')
    is_active = models.BooleanField(default=True, verbose_name='활성 상태')
    
    # Django admin을 위한 필드
    is_staff = models.BooleanField(default=False, verbose_name='관리자 여부')
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nickname']
    
    class Meta:
        db_table = 'users'
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
    
    def __str__(self):
        return f"{self.email} ({self.nickname})"
    
    def save(self, *args, **kwargs):
        # password를 password_hash 필드에 저장
        if self.password and not self.password_hash:
            self.password_hash = self.password
        super().save(*args, **kwargs)


class UserPermission(models.Model):
    """사용자 권한 설정"""
    
    permission_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='permissions',
        verbose_name='사용자'
    )
    gallery_access = models.BooleanField(default=False, verbose_name='갤러리 접근')
    camera_access = models.BooleanField(default=False, verbose_name='카메라 접근')
    notification_access = models.BooleanField(default=False, verbose_name='알림 접근')
    network_access = models.BooleanField(default=True, verbose_name='네트워크 접근')
    overlay_access = models.BooleanField(default=False, verbose_name='오버레이 접근')
    screen_capture_access = models.BooleanField(default=False, verbose_name='화면 캡처 접근')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    
    class Meta:
        db_table = 'user_permissions'
        verbose_name = '사용자 권한'
        verbose_name_plural = '사용자 권한 목록'
    
    def __str__(self):
        return f"{self.user.email}의 권한"


class AppSetting(models.Model):
    """앱 설정"""
    
    QUALITY_CHOICES = [
        ('low', '낮음'),
        ('medium', '보통'),
        ('high', '높음'),
    ]
    
    setting_id = models.BigAutoField(primary_key=True)
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='app_settings',
        verbose_name='사용자'
    )
    notification_enabled = models.BooleanField(default=True, verbose_name='알림 활성화')
    vibration_enabled = models.BooleanField(default=True, verbose_name='진동 활성화')
    auto_delete_records_days = models.IntegerField(
        default=30, 
        verbose_name='자동 삭제 기간(일)'
    )
    analysis_quality = models.CharField(
        max_length=20, 
        choices=QUALITY_CHOICES, 
        default='medium',
        verbose_name='분석 품질'
    )
    zoom_capture_interval = models.IntegerField(
        default=3, 
        verbose_name='Zoom 캡처 간격(초)'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='생성일시')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='수정일시')
    
    class Meta:
        db_table = 'app_settings'
        verbose_name = '앱 설정'
        verbose_name_plural = '앱 설정 목록'
    
    def __str__(self):
        return f"{self.user.email}의 설정"