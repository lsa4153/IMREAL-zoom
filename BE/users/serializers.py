from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserPermission, AppSetting


class UserRegistrationSerializer(serializers.ModelSerializer):
    """사용자 회원가입 Serializer"""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['email', 'nickname', 'password', 'password_confirm']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            nickname=validated_data['nickname']
        )
        
        # 기본 권한 및 설정 생성
        UserPermission.objects.create(user=user)
        AppSetting.objects.create(user=user)
        
        return user


class UserLoginSerializer(serializers.Serializer):
    """사용자 로그인 Serializer"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError("이메일 또는 비밀번호가 올바르지 않습니다.")
            if not user.is_active:
                raise serializers.ValidationError("비활성화된 계정입니다.")
            data['user'] = user
        else:
            raise serializers.ValidationError("이메일과 비밀번호를 입력해주세요.")
        
        return data


class UserSerializer(serializers.ModelSerializer):
    """사용자 정보 Serializer"""
    
    class Meta:
        model = User
        fields = ['user_id', 'email', 'nickname', 'created_at', 'last_login', 'is_active']
        read_only_fields = ['user_id', 'email', 'created_at', 'last_login']


class UserPermissionSerializer(serializers.ModelSerializer):
    """사용자 권한 Serializer"""
    
    class Meta:
        model = UserPermission
        fields = [
            'permission_id',
            'gallery_access',
            'camera_access',
            'notification_access',
            'network_access',
            'overlay_access',
            'screen_capture_access',
            'updated_at'
        ]
        read_only_fields = ['permission_id', 'updated_at']


class AppSettingSerializer(serializers.ModelSerializer):
    """앱 설정 Serializer"""
    
    class Meta:
        model = AppSetting
        fields = [
            'setting_id',
            'notification_enabled',
            'vibration_enabled',
            'auto_delete_records_days',
            'analysis_quality',
            'zoom_capture_interval',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['setting_id', 'created_at', 'updated_at']


class UserProfileSerializer(serializers.ModelSerializer):
    """사용자 프로필 (권한 + 설정 포함) Serializer"""
    
    permissions = UserPermissionSerializer(read_only=True)
    app_settings = AppSettingSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'user_id',
            'email',
            'nickname',
            'created_at',
            'last_login',
            'is_active',
            'permissions',
            'app_settings'
        ]
        read_only_fields = ['user_id', 'email', 'created_at', 'last_login']