import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { startZoomSession, sendCapture, endZoomSession } from '../utils/api'
import { getToken, logout } from '../utils/auth'  
import './HomePage.css'

// ✅ 백엔드 API URL
const API_BASE_URL = 'http://localhost:8000/api'

function HomePage() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImages, setCapturedImages] = useState([])
  const [showCapturedImages, setShowCapturedImages] = useState(false)
  
  const sessionIdRef = useRef(null)  // ✅ 백엔드 세션 ID 저장
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const intervalRef = useRef(null)
  const capturedImagesRef = useRef([])

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      capturedImagesRef.current.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
      })
    }
  }, [])
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('⚠️ 이 브라우저는 알림을 지원하지 않습니다')
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('✅ 알림 권한이 허용되었습니다')
        new Notification('알림 설정 완료', {
          body: '딥페이크 감지 시 실시간으로 알림을 받을 수 있습니다',
        })
      }
    }
  }

  const handleLogout = async () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      try {
        await logout()
        navigate('/login', { replace: true })
      } catch (error) {
        console.error('❌ 로그아웃 실패:', error)
        alert('로그아웃 중 오류가 발생했습니다.')
      }
    }
  }


  const handleStartRecording = async () => {
    try {
      // ✅ 1단계: 백엔드에 세션 시작 요청
      const sessionName = `${new Date().toLocaleString('ko-KR')} 면접`
      const token = getToken()
      
      const sessionResponse = await fetch(`${API_BASE_URL}/zoom/sessions/start/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({ session_name: sessionName })
      })

      if (!sessionResponse.ok) {
        throw new Error('세션 시작 실패')
      }

      const sessionData = await sessionResponse.json()
      sessionIdRef.current = sessionData.session_id  // ✅ 세션 ID 저장
      console.log('✅ 백엔드 세션 시작:', sessionData)

      // ✅ 2단계: 화면 캡처 시작
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })

      streamRef.current = stream
      
      if (!videoRef.current) {
        videoRef.current = document.createElement('video')
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      setIsRecording(true)
      setCapturedImages([])
      capturedImagesRef.current = []

      // ✅ 5초마다 캡처
      intervalRef.current = setInterval(() => {
        captureScreen()
      }, 5000)

      // 첫 번째 캡처 즉시 실행
      setTimeout(() => captureScreen(), 500)

      console.log('🎬 녹화 시작!')
      
      stream.getVideoTracks()[0].onended = () => {
        handleStopRecording()
      }

    } catch (error) {
      console.error('❌ 녹화 시작 실패:', error)
      alert('녹화를 시작할 수 없습니다: ' + error.message)
    }
  }

  // ✅ 캡처 함수 (원래 코드 유지)
  const captureScreen = async () => {
    if (!videoRef.current || !streamRef.current) {
      console.warn('⚠️ 비디오 또는 스트림이 없습니다')
      return
    }

    try {
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      // Base64로 변환
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)
      
      const timestamp = new Date().toISOString()
      const imageData = {
        id: Date.now() + Math.random(),
        url: base64Image,
        timestamp: timestamp,
        width: canvas.width,
        height: canvas.height
      }

      setCapturedImages(prev => [...prev, imageData])
      capturedImagesRef.current.push(imageData)
      
      console.log('📸 화면 캡처 완료:', timestamp)
      console.log('📊 현재 캡처 개수:', capturedImagesRef.current.length)

      // ✅ 백엔드로 전송
      await sendToBackend(base64Image)

    } catch (error) {
      console.error('❌ 화면 캡처 실패:', error)
    }
  }

  // ✅ 백엔드로 캡처 전송
  const sendToBackend = async (base64Image) => {
    try {
      const token = getToken()
      
      // Base64를 Blob으로 변환
      const blob = await (await fetch(base64Image)).blob()
      
      // FormData 생성
      const formData = new FormData()
      formData.append('screenshot', blob, `capture_${Date.now()}.jpg`)
      formData.append('participant_count', 1)  // 참가자 수 (필요시 수정)

      const response = await fetch(
        `${API_BASE_URL}/zoom/sessions/${sessionIdRef.current}/capture/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`
          },
          body: formData
        }
      )

      if (!response.ok) {
        throw new Error('백엔드 전송 실패')
      }

      const result = await response.json()
      console.log('✅ 백엔드 전송 성공:', result)

      // ✅ 딥페이크 감지 시 알림
      if (result.is_deepfake) {
        alert(`🚨 딥페이크 감지!\n신뢰도: ${result.confidence}%`)
      }

    } catch (error) {
      console.error('❌ 백엔드 전송 실패:', error)
    }
  }

  const handleStopRecording = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      videoRef.current = null
    }

    setIsRecording(false)
    
    const finalCount = capturedImagesRef.current.length
    console.log('⏹️ 녹화 종료!', `총 ${finalCount}개 캡처`)

    // ✅ 백엔드에 세션 종료 요청
    if (sessionIdRef.current) {
      try {
        const token = getToken()
        const response = await fetch(
          `${API_BASE_URL}/zoom/sessions/${sessionIdRef.current}/end/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Token ${token}`
            }
          }
        )

        if (response.ok) {
          const result = await response.json()
          console.log('✅ 세션 종료:', result)
          
          if (result.deepfake_count > 0) {
            alert(`🚨 딥페이크 ${result.deepfake_count}건 감지!\n탐지 기록에서 확인하세요.`)
          } else {
            alert('✅ 모든 참가자가 안전합니다.')
          }
        }
      } catch (error) {
        console.error('❌ 세션 종료 요청 실패:', error)
      }
    }
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
    capturedImages.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url)
      }
    })
    setCapturedImages([])
    capturedImagesRef.current = []
  }

  return (
    <div className="home-container">
      <button className="logout-button" onClick={handleLogout}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>로그아웃</span>
      </button>
      <main className="main-content">
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

        <h1 className="main-title">
          Zoom <span className="highlight">Deepfake 탐지</span>
        </h1>

        <p className="description">
          실시간 화상 면접 중 딥페이크를 자동으로 감지하고,<br />
          안전한 채용 환경을 만들어드립니다.
        </p>

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

        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span>녹화 중... ({capturedImages.length}개 캡처됨)</span>
          </div>
        )}

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