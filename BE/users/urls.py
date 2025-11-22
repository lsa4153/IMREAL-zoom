from django.urls import path
from .views import (
    UserRegistrationView,
    UserLoginView,
    UserLogoutView,
    UserProfileView,
    UserPermissionView,
    AppSettingView,
    UserDeleteView,
    # 프로필 이미지 함수들 추가
    upload_profile_image,
    delete_profile_image,
    get_profile_image,
)

app_name = 'users'

urlpatterns = [
    # 인증
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
    
    # 프로필
    path('profile/', UserProfileView.as_view(), name='profile'),
    
    # 설정
    path('permissions/', UserPermissionView.as_view(), name='permissions'),
    path('settings/', AppSettingView.as_view(), name='settings'),
    
    # 회원 탈퇴
    path('delete/', UserDeleteView.as_view(), name='delete'),

    # 프로필 이미지 관련 URL
    path('profile/image/', upload_profile_image, name='upload_profile_image'),
    path('profile/image/delete/', delete_profile_image, name='delete_profile_image'), 
    path('profile/image/get/', get_profile_image, name='get_profile_image'), 
]