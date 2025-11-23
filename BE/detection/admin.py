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
    readonly_fields = ['record_id', 'created_at', 'updated_at']
    ordering = ['-created_at']