from django.contrib import admin
from .models import MediaFile, SystemLog


@admin.register(MediaFile)
class MediaFileAdmin(admin.ModelAdmin):
    """미디어 파일 관리자"""
    
    list_display = [
        'file_id',
        'user',
        'original_name',
        'file_type',
        'purpose',
        'file_size_display',
        'storage_type',
        'is_temporary',
        'is_deleted',
        'created_at'
    ]
    list_filter = [
        'file_type',
        'purpose',
        'storage_type',
        'is_temporary',
        'is_deleted',
        'created_at'
    ]
    search_fields = ['original_name', 'file_name', 'user__email']
    readonly_fields = ['file_id', 'created_at', 'updated_at', 'deleted_at']
    ordering = ['-created_at']
    
    def file_size_display(self, obj):
        """파일 크기를 MB 단위로 표시"""
        size_mb = obj.file_size / (1024 * 1024)
        return f"{size_mb:.2f} MB"
    
    file_size_display.short_description = '파일 크기'


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    """시스템 로그 관리자"""
    
    list_display = [
        'log_id',
        'user',
        'log_level',
        'log_category',
        'message_preview',
        'created_at'
    ]
    list_filter = ['log_level', 'log_category', 'created_at']
    search_fields = ['message', 'user__email']
    readonly_fields = ['log_id', 'created_at']
    ordering = ['-created_at']
    
    def message_preview(self, obj):
        """메시지 미리보기"""
        return obj.message[:50] + '...' if len(obj.message) > 50 else obj.message
    
    message_preview.short_description = '메시지'