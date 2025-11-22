from django.urls import path
from .views import (
    ZoomSessionStartView,
    ZoomCaptureView,
    ZoomSessionEndView,
    ZoomSessionListView,
    ZoomSessionReportView,
    ZoomCaptureDetailView,
)

app_name = 'zoom'

urlpatterns = [
    # 세션 관리
    path('sessions/start/', ZoomSessionStartView.as_view(), name='session_start'),
    path('sessions/<int:session_id>/end/', ZoomSessionEndView.as_view(), name='session_end'),
    path('sessions/', ZoomSessionListView.as_view(), name='session_list'),
    
    # 캡처 분석
    path('sessions/<int:session_id>/capture/', ZoomCaptureView.as_view(), name='capture'),
    path('captures/<int:pk>/', ZoomCaptureDetailView.as_view(), name='capture_detail'),
    
    # 보고서
    path('sessions/<int:session_id>/report/', ZoomSessionReportView.as_view(), name='report'),
]