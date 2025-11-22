"""
URL Configuration for deepfake backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    
    # API 인증
    path('api/auth/token/', obtain_auth_token, name='api_token_auth'),
    
    # 앱별 URL
    path('api/users/', include('users.urls')),
    path('api/detection/', include('detection.urls')),
    path('api/zoom/', include('zoom.urls')),
    path('api/protection/', include('protection.urls')),
    # path('api/reports/', include('reports.urls')),
    path('api/files/', include('media_files.urls')),
]

# 개발 환경에서 미디어 파일 서빙
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Admin 사이트 커스터마이징
admin.site.site_header = "딥페이크 감지 시스템 관리"
admin.site.site_title = "딥페이크 관리자"
admin.site.index_title = "시스템 관리"