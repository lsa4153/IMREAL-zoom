import requests
import time
from django.conf import settings
from media_files.models import SystemLog


class AIModelService:
    """AI 모델 서비스 (FastAPI 연동)"""
    
    def __init__(self):
        self.fastapi_url = settings.FASTAPI_URL
        self.timeout = settings.AI_REQUEST_TIMEOUT
    
    def analyze_image(self, s3_url):
        """
        이미지 딥페이크 분석 (다중 사람 감지)
        
        Args:
            s3_url: S3에 업로드된 이미지 URL
        
        Returns:
            dict: {
                'success': bool,
                'face_count': int,
                'face_quality_scores': [
                    {
                        'face_id': int,
                        'rate': float (0-1),
                        'is_deepfake': bool,
                        'ResultUrl': str
                    }
                ],
                'processing_time': int (ms)
            }
        """
        
        start_time = time.time()
        
        # 🔧 AI 서버 연결 확인
        if not self.check_health():
            print("⚠️ AI 서버 없음 - Mock 데이터 반환")
            return self._get_mock_image_response(start_time)
        
        # 실제 AI 서버 호출 (새로운 명세)
        try:
            payload = {
                "request_version": "Multi Person Deepfake detection",
                "InputUrl": s3_url
            }
            
            response = requests.post(
                f"{self.fastapi_url}/detect_deepfake",
                json=payload,  # ← JSON으로 전송!
                timeout=self.timeout
            )
            
            response.raise_for_status()
            result = response.json()
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'face_count': result.get('face_count', 0),
                'face_quality_scores': result.get('face_quality_scores', []),
                'processing_time': processing_time
            }
        
        except requests.exceptions.RequestException as e:
            SystemLog.objects.create(
                log_level='error',
                log_category='detection',
                message=f'AI 모델 분석 실패: {str(e)}',
                error_code='AI_API_ERROR'
            )
            
            return {
                'success': False,
                'error': 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.',
                'processing_time': int((time.time() - start_time) * 1000)
            }
    
    def analyze_video(self, s3_url):
        """
        영상 딥페이크 분석 (다중 사람 감지)
        
        Args:
            s3_url: S3에 업로드된 영상 URL
        
        Returns:
            dict: 이미지 분석과 동일한 구조
        """
        
        start_time = time.time()
        
        if not self.check_health():
            print("⚠️ AI 서버 없음 - Mock 데이터 반환")
            return self._get_mock_video_response(start_time)
        
        try:
            payload = {
                "request_version": "Multi Person Deepfake detection",
                "InputUrl": s3_url
            }
            
            response = requests.post(
                f"{self.fastapi_url}/detect_deepfake",
                json=payload,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            result = response.json()
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return {
                'success': True,
                'face_count': result.get('face_count', 0),
                'face_quality_scores': result.get('face_quality_scores', []),
                'processing_time': processing_time
            }
        
        except requests.exceptions.RequestException as e:
            SystemLog.objects.create(
                log_level='error',
                log_category='detection',
                message=f'영상 AI 분석 실패: {str(e)}',
                error_code='AI_API_ERROR'
            )
            
            return {
                'success': False,
                'error': 'AI 분석 중 오류가 발생했습니다. 다시 시도해주세요.',
                'processing_time': int((time.time() - start_time) * 1000)
            }

    def _get_mock_image_response(self, start_time):
        """
        🔧 Mock 이미지 분석 응답 (AI 서버 없을 때)
        """
        import random
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # 랜덤으로 1-3명의 얼굴 생성
        face_count = random.randint(1, 3)
        face_quality_scores = []
        
        for i in range(face_count):
            is_deepfake = random.choice([True, False, False])  # 33% 확률
            rate = random.uniform(0.75, 0.99)
            
            face_quality_scores.append({
                'face_id': i + 1,
                'rate': round(rate, 2),
                'is_deepfake': is_deepfake,
                'ResultUrl': None  # Mock이므로 null
            })
        
        return {
            'success': True,
            'face_count': face_count,
            'face_quality_scores': face_quality_scores,
            'processing_time': processing_time
        }
    
    def _get_mock_video_response(self, start_time):
        """
        🔧 Mock 영상 분석 응답 (이미지와 동일한 구조)
        """
        return self._get_mock_image_response(start_time)
    
    def check_health(self):
        """FastAPI 서버 상태 확인"""
        try:
            response = requests.get(
                f"{self.fastapi_url}/health",
                timeout=2  # 빠른 타임아웃
            )
            return response.status_code == 200
        except:
            return False