from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserPermission, AppSetting


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """사용자 관리자"""
    
    list_display = ['user_id', 'email', 'nickname', 'is_active', 'created_at', 'last_login']
    list_filter = ['is_active', 'is_staff', 'created_at']
    search_fields = ['email', 'nickname']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('개인정보', {'fields': ('nickname',)}),
        ('권한', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('중요 날짜', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    
    readonly_fields = ['created_at', 'updated_at', 'last_login']
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nickname', 'password1', 'password2'),
        }),
    )


@admin.register(UserPermission)
class UserPermissionAdmin(admin.ModelAdmin):
    """사용자 권한 관리자"""
    
    list_display = [
        'permission_id',
        'user',
        'gallery_access',
        'camera_access',
        'notification_access',
        'updated_at'
    ]
    list_filter = ['gallery_access', 'camera_access', 'notification_access']
    search_fields = ['user__email', 'user__nickname']
    readonly_fields = ['updated_at']


@admin.register(AppSetting)
class AppSettingAdmin(admin.ModelAdmin):
    """앱 설정 관리자"""
    
    list_display = [
        'setting_id',
        'user',
        'notification_enabled',
        'vibration_enabled',
        'analysis_quality',
        'zoom_capture_interval',
        'updated_at'
    ]
    list_filter = ['notification_enabled', 'vibration_enabled', 'analysis_quality']
    search_fields = ['user__email', 'user__nickname']
    readonly_fields = ['created_at', 'updated_at']