import os
import uuid
import mimetypes
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.utils import timezone
from .models import MediaFile, SystemLog
from .storage import S3Storage



class FileService:
    """파일 업로드 및 관리 서비스"""
    
    # 파일 유효성 검사 설정
    ALLOWED_EXTENSIONS = {
        'image': settings.IMAGE_ALLOWED_EXTENSIONS,
        'video': settings.VIDEO_ALLOWED_EXTENSIONS,
        'screenshot': settings.IMAGE_ALLOWED_EXTENSIONS,
        'document': ['pdf', 'doc', 'docx', 'txt'],
    }
    
    MAX_FILE_SIZES = {
        'image': settings.IMAGE_MAX_SIZE,
        'video': settings.VIDEO_MAX_SIZE,
        'screenshot': settings.IMAGE_MAX_SIZE,
        'document': 10 * 1024 * 1024,  # 10MB
    }
    
    def __init__(self, user):
        self.user = user
    
    def upload_file(
        self,
        uploaded_file: UploadedFile,
        file_type: str,
        purpose: str,
        is_temporary: bool = False,
        metadata: dict = None,
        use_s3: bool = False
    ) -> MediaFile:
        """
        파일 업로드 및 DB 저장
        
        Args:
            uploaded_file: 업로드된 파일 객체
            file_type: 파일 유형 (image, video, screenshot, document)
            purpose: 사용 목적 (detection, protection, zoom, report)
            is_temporary: 임시 파일 여부
            metadata: 추가 메타데이터
            use_s3: S3 사용 여부
        
        Returns:
            MediaFile: 저장된 미디어 파일 객체
        """
        
        # 1. 파일 검증
        self._validate_file(uploaded_file, file_type)
        
        # 2. 파일명 생성
        extension = self._get_file_extension(uploaded_file.name)
        unique_filename = self._generate_unique_filename(extension)
        
        # 3. 파일 저장
        if use_s3:
            file_path, s3_key = self._save_to_s3(
                uploaded_file,
                unique_filename,
                purpose
            )
            storage_type = 's3'
            s3_bucket = settings.AWS_STORAGE_BUCKET_NAME
        else:
            file_path = self._save_to_local(
                uploaded_file,
                unique_filename,
                purpose
            )
            s3_key = None
            s3_bucket = None
            storage_type = 'local'
        
        # 4. MIME 타입 결정
        mime_type, _ = mimetypes.guess_type(uploaded_file.name)
        if not mime_type:
            mime_type = uploaded_file.content_type or 'application/octet-stream'
        
        # 5. DB 저장
        media_file = MediaFile.objects.create(
            user=self.user,
            original_name=uploaded_file.name,
            file_name=unique_filename,
            file_size=uploaded_file.size,
            file_type=file_type,
            file_format=extension,
            mime_type=mime_type,
            storage_type=storage_type,
            file_path=file_path,
            s3_key=s3_key,
            s3_bucket=s3_bucket,
            purpose=purpose,
            is_temporary=is_temporary,
            metadata=metadata or {}
        )
        
        # 6. 로그 기록
        SystemLog.objects.create(
            user=self.user,
            log_level='info',
            log_category='system',
            message=f'파일 업로드 성공: {uploaded_file.name}',
            request_data={
                'file_type': file_type,
                'purpose': purpose,
                'file_size': uploaded_file.size
            }
        )
        
        return media_file
    
    def _validate_file(self, uploaded_file: UploadedFile, file_type: str):
        """파일 유효성 검사"""
        
        # 파일 타입 확인
        if file_type not in self.ALLOWED_EXTENSIONS:
            raise ValueError(f"지원하지 않는 파일 유형입니다: {file_type}")
        
        # 확장자 확인
        extension = self._get_file_extension(uploaded_file.name)
        if extension not in self.ALLOWED_EXTENSIONS[file_type]:
            raise ValueError(
                f"{file_type} 타입은 {', '.join(self.ALLOWED_EXTENSIONS[file_type])} "
                f"확장자만 허용됩니다."
            )
        
        # 파일 크기 확인
        if uploaded_file.size > self.MAX_FILE_SIZES[file_type]:
            max_size_mb = self.MAX_FILE_SIZES[file_type] / (1024 * 1024)
            raise ValueError(
                f"파일 크기는 {max_size_mb}MB 이하여야 합니다."
            )
    
    def _get_file_extension(self, filename: str) -> str:
        """파일 확장자 추출"""
        return filename.split('.')[-1].lower()
    
    def _generate_unique_filename(self, extension: str) -> str:
        """고유한 파일명 생성"""
        unique_id = uuid.uuid4().hex
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
        return f"{timestamp}_{unique_id}.{extension}"
    
    def _save_to_local(
        self,
        uploaded_file: UploadedFile,
        filename: str,
        purpose: str
    ) -> str:
        """로컬 파일 시스템에 저장"""
        
        # 디렉토리 경로 생성
        purpose_dir = os.path.join(
            settings.MEDIA_ROOT,
            purpose,
            f"user_{self.user.user_id}"
        )
        os.makedirs(purpose_dir, exist_ok=True)
        
        # 파일 저장
        file_full_path = os.path.join(purpose_dir, filename)
        with open(file_full_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)
        
        # 상대 경로 반환
        relative_path = os.path.join(
            purpose,
            f"user_{self.user.user_id}",
            filename
        )
        return relative_path
    
    def _save_to_s3(
        self,
        uploaded_file: UploadedFile,
        filename: str,
        purpose: str
    ) -> tuple:
        """S3에 파일 저장"""
        
        # S3 키 생성
        s3_key = f"{purpose}/user_{self.user.user_id}/{filename}"
        
        # S3 업로드 로직 (boto3 필요)
        # TODO: S3Storage 클래스 구현 후 연동
        
        return s3_key, s3_key
    
    def get_file(self, file_id: int) -> MediaFile:
        """파일 조회"""
        try:
            return MediaFile.objects.get(
                file_id=file_id,
                user=self.user,
                is_deleted=False
            )
        except MediaFile.DoesNotExist:
            raise ValueError("파일을 찾을 수 없습니다.")
    
    def delete_file(self, file_id: int, hard_delete: bool = False):
        """
        파일 삭제
        
        Args:
            file_id: 파일 ID
            hard_delete: True면 물리적 삭제, False면 논리적 삭제
        """
        
        media_file = self.get_file(file_id)
        
        if hard_delete:
            # 물리적 파일 삭제
            if media_file.storage_type == 'local':
                file_full_path = os.path.join(
                    settings.MEDIA_ROOT,
                    media_file.file_path
                )
                if os.path.exists(file_full_path):
                    os.remove(file_full_path)
            elif media_file.storage_type == 's3':
                # TODO: S3 파일 삭제
                pass
            
            # DB에서 삭제
            media_file.delete()
        else:
            # 논리적 삭제
            media_file.is_deleted = True
            media_file.deleted_at = timezone.now()
            media_file.save()
        
        # 로그 기록
        SystemLog.objects.create(
            user=self.user,
            log_level='info',
            log_category='system',
            message=f'파일 삭제: {media_file.original_name}',
            request_data={
                'file_id': file_id,
                'hard_delete': hard_delete
            }
        )

    def _save_to_s3(
        self,
        uploaded_file: UploadedFile,
        filename: str,
        purpose: str
    ) -> tuple:
        """S3에 파일 저장"""
        
        # S3 키 생성
        s3_key = f"{purpose}/user_{self.user.user_id}/{filename}"
        
        # S3 업로드
        s3_storage = S3Storage()
        
        # 파일 포인터를 처음으로 이동
        uploaded_file.seek(0)
        
        success = s3_storage.upload(
            file_obj=uploaded_file,
            s3_key=s3_key,
            content_type=uploaded_file.content_type
        )
        
        if not success:
            raise ValueError("S3 업로드에 실패했습니다.")
        
        # 파일 경로 (S3 URL)
        file_path = f"https://{settings.AWS_S3_CUSTOM_DOMAIN}/{s3_key}"
        
        return file_path, s3_key
    
    def delete_file(self, file_id: int, hard_delete: bool = False):
        """
        파일 삭제
        
        Args:
            file_id: 파일 ID
            hard_delete: True면 물리적 삭제, False면 논리적 삭제
        """
        
        media_file = self.get_file(file_id)
        
        if hard_delete:
            # 물리적 파일 삭제
            if media_file.storage_type == 'local':
                file_full_path = os.path.join(
                    settings.MEDIA_ROOT,
                    media_file.file_path
                )
                if os.path.exists(file_full_path):
                    os.remove(file_full_path)
            
            elif media_file.storage_type == 's3':
                # ✅ S3 파일 삭제
                s3_storage = S3Storage()
                s3_storage.delete(media_file.s3_key)
            
            # DB에서 삭제
            media_file.delete()
        else:
            # 논리적 삭제
            media_file.is_deleted = True
            media_file.deleted_at = timezone.now()
            media_file.save()
        
        # 로그 기록
        SystemLog.objects.create(
            user=self.user,
            log_level='info',
            log_category='system',
            message=f'파일 삭제: {media_file.original_name}',
            request_data={
                'file_id': file_id,
                'hard_delete': hard_delete
            }
        )
    
    @staticmethod
    def cleanup_temporary_files(older_than_hours: int = 24):
        """
        임시 파일 정리 (Celery 태스크에서 호출)
        
        Args:
            older_than_hours: 이 시간보다 오래된 임시 파일 삭제
        """
        
        from datetime import timedelta
        
        threshold_time = timezone.now() - timedelta(hours=older_than_hours)
        
        # 오래된 임시 파일 조회
        old_temp_files = MediaFile.objects.filter(
            is_temporary=True,
            is_deleted=False,
            created_at__lt=threshold_time
        )
        
        deleted_count = 0
        for media_file in old_temp_files:
            try:
                # 물리적 파일 삭제
                if media_file.storage_type == 'local':
                    file_full_path = os.path.join(
                        settings.MEDIA_ROOT,
                        media_file.file_path
                    )
                    if os.path.exists(file_full_path):
                        os.remove(file_full_path)
                
                # DB에서 삭제
                media_file.delete()
                deleted_count += 1
            except Exception as e:
                SystemLog.objects.create(
                    log_level='error',
                    log_category='system',
                    message=f'임시 파일 삭제 실패: {media_file.original_name}',
                    error_code='FILE_CLEANUP_ERROR',
                    request_data={'file_id': media_file.file_id, 'error': str(e)}
                )
        
        # 로그 기록
        SystemLog.objects.create(
            log_level='info',
            log_category='system',
            message=f'임시 파일 정리 완료: {deleted_count}개 삭제'
        )
        
        return deleted_count