# detection/urls.py
from django.urls import path
from .views import (
    ImageAnalysisView,
    VideoAnalysisView,
    AnalysisRecordListView,
    AnalysisRecordDetailView,
    AnalysisStatisticsView,
    AIHealthCheckView
)

app_name = 'detection'

urlpatterns = [
    # 분석
    path('image/', ImageAnalysisView.as_view(), name='image_analysis'),
    path('video/', VideoAnalysisView.as_view(), name='video_analysis'),
    
    # 기록
    path('records/', AnalysisRecordListView.as_view(), name='record_list'),
    path('records/<int:pk>/', AnalysisRecordDetailView.as_view(), name='record_detail'),
    
    # 통계
    path('statistics/', AnalysisStatisticsView.as_view(), name='statistics'),
    
    # 상태 확인
    path('health/', AIHealthCheckView.as_view(), name='health'),
]