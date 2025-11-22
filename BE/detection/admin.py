from django.contrib import admin
from .models import AnalysisRecord


@admin.register(AnalysisRecord)
class AnalysisRecordAdmin(admin.ModelAdmin):
    """분석 기록 관리자"""
    
    list_display = [
        'record_id',
        'user',
        'analysis_type',
        'file_name',
        'analysis_result',
        'confidence_score',
        'created_at'
    ]
    list_filter = ['analysis_type', 'analysis_result', 'created_at']
    search_fields = ['user__email', 'file_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': (
                'record_id',
                'user',
                'analysis_type',
                'file_name',
                'file_size',
                'file_format'
            )
        }),
        ('파일 경로', {
            'fields': (
                'original_path',
                'processed_path',
                'heatmap_path'
            )
        }),
        ('분석 결과', {
            'fields': (
                'analysis_result',
                'confidence_score',
                'detection_details',
                'processing_time',
                'ai_model_version'
            )
        }),
        ('타임스탬프', {
            'fields': (
                'created_at',
                'updated_at'
            )
        }),
    )