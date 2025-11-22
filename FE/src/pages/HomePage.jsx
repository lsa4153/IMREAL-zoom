import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImages, setCapturedImages] = useState([])
  const [showCapturedImages, setShowCapturedImages] = useState(false)
  
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const intervalRef = useRef(null)

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const handleStartRecording = async () => {
    try {
      // 화면 캡처 스트림 요청
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      streamRef.current = stream
      
      // 비디오 엘리먼트에 스트림 연결 (숨겨진 상태)
      if (!videoRef.current) {
        videoRef.current = document.createElement('video')
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setIsRecording(true)
      setCapturedImages([]) // 이전 캡처 이미지 초기화

      // 5초마다 캡처
      intervalRef.current = setInterval(() => {
        captureScreen()
      }, 5000)

      // 첫 번째 캡처 즉시 실행
      setTimeout(() => captureScreen(), 500)

      console.log('녹화 시작!')
      
      // 사용자가 화면 공유를 중단하면 자동으로 녹화 종료
      stream.getVideoTracks()[0].onended = () => {
        handleStopRecording()
      }

    } catch (error) {
      console.error('화면 캡처 시작 실패:', error)
      alert('화면 캡처를 시작할 수 없습니다. 권한을 확인해주세요.')
    }
  }

  const captureScreen = () => {
    if (!videoRef.current || !streamRef.current) return

    try {
      // 캔버스 생성
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      // 이미지를 Blob으로 변환
      canvas.toBlob((blob) => {
        const timestamp = new Date().toISOString()
        const imageData = {
          id: Date.now(),
          blob: blob,
          url: URL.createObjectURL(blob),
          timestamp: timestamp,
          width: canvas.width,
          height: canvas.height
        }

        setCapturedImages(prev => [...prev, imageData])
        console.log('화면 캡처 완료:', timestamp)

        // TODO: 여기서 백엔드로 이미지 전송
        // sendToBackend(blob, timestamp)
      }, 'image/jpeg', 0.9)

    } catch (error) {
      console.error('화면 캡처 실패:', error)
    }
  }

  const handleStopRecording = () => {
    // 인터벌 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    // 비디오 엘리먼트 정리
    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }

    setIsRecording(false)
    console.log('녹화 종료!', `총 ${capturedImages.length}개의 이미지 캡처됨`)
  }

  const handleViewHistory = () => {
    navigate('/history')
  }

  const toggleCapturedImages = () => {
    setShowCapturedImages(!showCapturedImages)
  }

  const downloadImage = (imageData) => {
    const link = document.createElement('a')
    link.href = imageData.url
    link.download = `capture_${imageData.timestamp}.jpg`
    link.click()
  }

  const clearCapturedImages = () => {
    // URL 메모리 해제
    capturedImages.forEach(img => URL.revokeObjectURL(img.url))
    setCapturedImages([])
  }

  return (
    <div className="home-container">
      {/* 메인 컨텐츠 */}
      <main className="main-content">
        {/* 일러스트레이션 */}
        <div className="illustration">
          <div className="laptop-illustration">
            <div className="screen">
              <div className="participant participant-1"></div>
              <div className="participant participant-2"></div>
              <div className="participant participant-3"></div>
              <div className="participant participant-4"></div>
            </div>
          </div>
          <div className="check-icon check-1">✓</div>
          <div className="check-icon check-2">✓</div>
          <div className="check-icon check-3">✓</div>
          <div className="check-icon check-4">✓</div>
        </div>

        {/* 타이틀 */}
        <h1 className="main-title">
          Zoom <span className="highlight">Deepfake 탐지</span>
        </h1>

        {/* 설명 */}
        <p className="description">
          실시간 화상 면접 중 딥페이크를 자동으로 감지하고,<br />
          안전한 채용 환경을 만들어드립니다.
        </p>

        {/* 버튼 그룹 */}
        <div className="button-group">
          {!isRecording ? (
            <>
              <button className="primary-button" onClick={handleStartRecording}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="4" fill="white"/>
                  <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2"/>
                </svg>
                <span>녹화 시작</span>
              </button>
              <button className="secondary-button" onClick={handleViewHistory}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 9h18" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="7" cy="13" r="1" fill="currentColor"/>
                  <circle cx="12" cy="13" r="1" fill="currentColor"/>
                  <circle cx="17" cy="13" r="1" fill="currentColor"/>
                </svg>
                <span>탐지 기록</span>
              </button>
            </>
          ) : (
            <button className="stop-button" onClick={handleStopRecording}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="7" y="7" width="10" height="10" fill="white"/>
              </svg>
              <span>녹화 종료</span>
            </button>
          )}
        </div>

        {/* 녹화 중 표시 */}
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span>녹화 중... ({capturedImages.length}개 캡처됨)</span>
          </div>
        )}

        {/* 캡처된 이미지 확인 버튼 */}
        {capturedImages.length > 0 && (
          <div className="captured-images-controls">
            <button className="view-captures-button" onClick={toggleCapturedImages}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>캡처 이미지 확인 ({capturedImages.length}개)</span>
            </button>
            <button className="clear-captures-button" onClick={clearCapturedImages}>
              <span>이미지 전체 삭제</span>
            </button>
          </div>
        )}

        {/* 캡처된 이미지 미리보기 모달 */}
        {showCapturedImages && capturedImages.length > 0 && (
          <div className="modal-overlay" onClick={toggleCapturedImages}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>캡처된 이미지 ({capturedImages.length}개)</h2>
                <button className="modal-close" onClick={toggleCapturedImages}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <div className="images-grid">
                  {capturedImages.map((imageData) => (
                    <div key={imageData.id} className="image-card">
                      <img src={imageData.url} alt={`캡처 ${imageData.timestamp}`} />
                      <div className="image-info">
                        <p className="image-timestamp">
                          {new Date(imageData.timestamp).toLocaleString('ko-KR')}
                        </p>
                        <p className="image-size">
                          {imageData.width} x {imageData.height}
                        </p>
                        <button 
                          className="download-button" 
                          onClick={() => downloadImage(imageData)}
                        >
                          다운로드
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default HomePage