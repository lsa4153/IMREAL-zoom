import boto3
from botocore.exceptions import ClientError
from django.conf import settings
import logging
import tempfile

logger = logging.getLogger(__name__)


class S3Storage:
    """AWS S3 스토리지 관리"""
    
    def __init__(self):
        """S3 클라이언트 초기화"""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    def upload(self, file_obj, s3_key, content_type=None):
        """
        S3에 파일 업로드
        
        Args:
            file_obj: 파일 객체 (Django UploadedFile 또는 파일 경로)
            s3_key: S3에 저장될 키 (경로)
            content_type: MIME 타입 (선택)
        
        Returns:
            bool: 업로드 성공 여부
        """
        try:
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            # 파일 객체인 경우
            if hasattr(file_obj, 'read'):
                self.s3_client.upload_fileobj(
                    file_obj,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs=extra_args
                )
            # 파일 경로인 경우
            else:
                self.s3_client.upload_file(
                    file_obj,
                    self.bucket_name,
                    s3_key,
                    ExtraArgs=extra_args
                )
            
            logger.info(f"S3 업로드 성공: {s3_key}")
            return True
        
        except ClientError as e:
            logger.error(f"S3 업로드 실패: {str(e)}")
            return False
    
    def delete(self, s3_key):
        """
        S3에서 파일 삭제
        
        Args:
            s3_key: 삭제할 S3 키
        
        Returns:
            bool: 삭제 성공 여부
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            logger.info(f"S3 삭제 성공: {s3_key}")
            return True
        
        except ClientError as e:
            logger.error(f"S3 삭제 실패: {str(e)}")
            return False
    
    def get_presigned_url(self, s3_key, expiration=None):
        """
        파일 다운로드용 서명된 URL 생성
        
        Args:
            s3_key: S3 키
            expiration: URL 만료 시간 (초), 기본값은 settings에서 가져옴
        
        Returns:
            str: 서명된 URL
        """
        if expiration is None:
            expiration = settings.AWS_PRESIGNED_URL_EXPIRATION
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            return url
        
        except ClientError as e:
            logger.error(f"Presigned URL 생성 실패: {str(e)}")
            return None
    
    def file_exists(self, s3_key):
        """
        S3에 파일이 존재하는지 확인
        
        Args:
            s3_key: 확인할 S3 키
        
        Returns:
            bool: 존재 여부
        """
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return True
        except ClientError:
            return False
    
    def get_file_size(self, s3_key):
        """
        S3 파일 크기 조회
        
        Args:
            s3_key: S3 키
        
        Returns:
            int: 파일 크기 (bytes), 실패 시 None
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['ContentLength']
        except ClientError as e:
            logger.error(f"파일 크기 조회 실패: {str(e)}")
            return None
        
    def download_to_temp(self, s3_key):
        """
        S3 파일을 임시 파일로 다운로드
        
        Args:
            s3_key: S3 키
        
        Returns:
            str: 임시 파일 경로
        """
        try:
            # 임시 파일 생성
            ext = s3_key.split('.')[-1]
            temp_file = tempfile.NamedTemporaryFile(
                delete=False,
                suffix=f'.{ext}'
            )
            
            # S3에서 다운로드
            self.s3_client.download_fileobj(
                self.bucket_name,
                s3_key,
                temp_file
            )
            
            temp_file.close()
            logger.info(f"S3 임시 다운로드 성공: {s3_key}")
            return temp_file.name
        
        except ClientError as e:
            logger.error(f"S3 다운로드 실패: {str(e)}")
            return None