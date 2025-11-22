import os
from rest_framework import status, generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes 
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import TokenAuthentication
from django.conf import settings
from django.utils import timezone
from .models import User, UserPermission, AppSetting
from .serializers import (
    UserRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    UserProfileSerializer,
    UserPermissionSerializer,
    AppSettingSerializer
)
from media_files.services import FileService


class UserRegistrationView(APIView):
    """사용자 회원가입 API"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': '회원가입이 완료되었습니다.',
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLoginView(APIView):
    """사용자 로그인 API"""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            
            # 마지막 로그인 시간 업데이트
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])
            
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': '로그인 성공',
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserLogoutView(APIView):
    """사용자 로그아웃 API"""
    
    def post(self, request):
        try:
            # 토큰 삭제
            request.user.auth_token.delete()
            return Response({
                'message': '로그아웃 되었습니다.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': '로그아웃 처리 중 오류가 발생했습니다.'
            }, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """사용자 프로필 조회/수정 API"""
    
    serializer_class = UserProfileSerializer
    
    def get_object(self):
        return self.request.user


class UserPermissionView(generics.RetrieveUpdateAPIView):
    """사용자 권한 설정 조회/수정 API"""
    
    serializer_class = UserPermissionSerializer
    
    def get_object(self):
        permission, created = UserPermission.objects.get_or_create(
            user=self.request.user
        )
        return permission


class AppSettingView(generics.RetrieveUpdateAPIView):
    """앱 설정 조회/수정 API"""
    
    serializer_class = AppSettingSerializer
    
    def get_object(self):
        setting, created = AppSetting.objects.get_or_create(
            user=self.request.user
        )
        return setting


class UserDeleteView(APIView):
    """회원 탈퇴 API"""
    
    def delete(self, request):
        user = request.user
        
        # 사용자 비활성화 (실제 삭제 대신)
        user.is_active = False
        user.save()
        
        # 토큰 삭제
        try:
            user.auth_token.delete()
        except:
            pass
        
        return Response({
            'message': '회원 탈퇴가 완료되었습니다.'
        }, status=status.HTTP_200_OK)
    
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def upload_profile_image(request):
    """프로필 이미지 업로드"""
    
    user = request.user
    
    if 'image' not in request.FILES:
        return Response(
            {'error': '이미지 파일이 필요합니다'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    image_file = request.FILES['image']
    
    # 파일 크기 검증 (최대 10MB)
    max_size = 10 * 1024 * 1024
    if image_file.size > max_size:
        return Response(
            {'error': '파일 크기는 10MB 이하여야 합니다'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # 파일 형식 검증
    allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
    file_extension = image_file.name.split('.')[-1].lower()
    if file_extension not in allowed_extensions:
        return Response(
            {'error': f'허용된 이미지 형식: {", ".join(allowed_extensions)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # 기존 프로필 이미지 삭제
        if user.profile_image:
            old_image_path = os.path.join(settings.MEDIA_ROOT, user.profile_image)
            if os.path.exists(old_image_path):
                try:
                    os.remove(old_image_path)
                except Exception as e:
                    print(f"기존 이미지 삭제 실패: {e}")
        
        # FileService를 통해 새 이미지 저장
        file_service = FileService(user)
        
        media_file = file_service.upload_file(
            uploaded_file=image_file,
            file_type='image',
            purpose='profiles',
            is_temporary=False,
            use_s3=False
        )
        
        # User 테이블 업데이트
        user.profile_image = media_file.file_path
        user.save()
        
        # 이미지 URL 생성
        profile_image_url = f"{settings.MEDIA_URL}{media_file.file_path}"
        
        return Response({
            'profile_image': media_file.file_path,
            'profile_image_url': profile_image_url,
            'message': '프로필 이미지가 업데이트되었습니다'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'파일 업로드 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['DELETE'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def delete_profile_image(request):
    """프로필 이미지 삭제"""
    
    user = request.user
    
    if not user.profile_image:
        return Response(
            {'message': '삭제할 프로필 이미지가 없습니다'},
            status=status.HTTP_200_OK
        )
    
    try:
        # 물리적 파일 삭제
        image_path = os.path.join(settings.MEDIA_ROOT, user.profile_image)
        if os.path.exists(image_path):
            os.remove(image_path)
        
        # DB 업데이트
        user.profile_image = None
        user.save()
        
        return Response({
            'message': '프로필 이미지가 삭제되었습니다'
        }, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'이미지 삭제 중 오류가 발생했습니다: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def get_profile_image(request):
    """현재 사용자의 프로필 이미지 조회"""
    
    user = request.user
    
    if not user.profile_image:
        return Response({
            'profile_image': None,
            'profile_image_url': None
        }, status=status.HTTP_200_OK)
    
    profile_image_url = f"{settings.MEDIA_URL}{user.profile_image}"
    
    return Response({
        'profile_image': user.profile_image,
        'profile_image_url': profile_image_url
    }, status=status.HTTP_200_OK)