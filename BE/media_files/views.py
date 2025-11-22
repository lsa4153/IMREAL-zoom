from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import MediaFile
from .storage import S3Storage


class MediaFileDownloadView(APIView):
    """미디어 파일 다운로드 URL 생성 API"""
    
    def get(self, request, file_id):
        try:
            media_file = MediaFile.objects.get(
                file_id=file_id,
                user=request.user,
                is_deleted=False
            )
        except MediaFile.DoesNotExist:
            return Response(
                {'error': '파일을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # S3 파일인 경우 Presigned URL 생성
        if media_file.storage_type == 's3':
            s3_storage = S3Storage()
            download_url = s3_storage.get_presigned_url(media_file.s3_key)
            
            if not download_url:
                return Response(
                    {'error': '다운로드 URL 생성에 실패했습니다.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # 로컬 파일인 경우
            download_url = f"/media/{media_file.file_path}"
        
        return Response({
            'file_id': media_file.file_id,
            'file_name': media_file.original_name,
            'download_url': download_url,
            'expires_in': 3600  # 1시간
        })