import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveZoomSession, addMockAIResults } from '../utils/storage'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)
  const [capturedImages, setCapturedImages] = useState([])
  const [showCapturedImages, setShowCapturedImages] = useState(false)
  
  // ✅ 세션 정보를 ref로 관리 (비동기 문제 해결)
  const sessionDataRef = useRef({
    sessionId: null,
    startTime: null,
    sessionName: null
  })
  
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const intervalRef = useRef(null)
  const capturedImagesRef = useRef([])
  const lastNotificationRef = useRef(null) // ✅ 추가: 마지막 알림 추적

  // ✅ 추가: 알림 권한 요청 및 정리
  useEffect(() => {
    // 페이지 로드 시 알림 권한 요청
    requestNotificationPermission()
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // ✅ 알림 닫기
      if (lastNotificationRef.current) {
        lastNotificationRef.current.close()
      }
      // URL 메모리 정리
      capturedImagesRef.current.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url)
        }
      })
    }
  }, [])

  // ✅ 추가: 알림 권한 요청 함수
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('⚠️ 이 브라우저는 알림을 지원하지 않습니다')
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        console.log('✅ 알림 권한이 허용되었습니다')
        // 테스트 알림
        new Notification('알림 설정 완료', {
          body: '딥페이크 감지 시 실시간으로 알림을 받을 수 있습니다',
          icon: '/logo.png'
        })
      } else {
        console.warn('⚠️ 알림 권한이 거부되었습니다')
      }
    }
  }

  // ✅ 수정: 이전 알림 닫고 새 알림 표시
  const showDeepfakeAlert = (imageData, analysisResult) => {
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ 알림 권한이 없습니다')
      return
    }

    // ✅ 이전 알림이 있으면 먼저 닫기
    if (lastNotificationRef.current) {
      lastNotificationRef.current.close()
      console.log('🔕 이전 알림 닫기')
    }

    // 새 브라우저 알림 표시
    const notification = new Notification('🚨 딥페이크 감지!', {
      body: `신뢰도: ${analysisResult.confidence}%\n즉시 확인이 필요합니다.`,
      icon: '/warning-icon.png',
      badge: '/badge-icon.png',
      tag: `deepfake-${Date.now()}`, // 고유한 tag
      requireInteraction: true, // 사용자가 직접 닫을 때까지 유지
      silent: false,
      timestamp: Date.now()
    })

    // 알림 클릭 시 웹사이트로 포커스
    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // ✅ 현재 알림 저장
    lastNotificationRef.current = notification

    console.log('🚨 새로운 딥페이크 알림 표시:', analysisResult)
  }

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
      setCapturedImages([])
      capturedImagesRef.current = []

      // ✅ 세션 정보 초기화 (ref에 직접 저장)
      const newSession = {
        sessionId: Date.now(),
        startTime: new Date().toISOString(),
        sessionName: `${new Date().toLocaleString('ko-KR')} 면접`
      }
      sessionDataRef.current = newSession
      console.log('📹 세션 시작:', newSession)

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

  // ✅ 수정: 실시간 분석 추가
  const captureScreen = async () => {
    if (!videoRef.current || !streamRef.current) return

    try {
      // 캔버스 생성
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)

      // ✅ Base64로 변환 (LocalStorage 저장 가능)
      const base64Image = canvas.toDataURL('image/jpeg', 0.9)
      
      const timestamp = new Date().toISOString()
      const imageData = {
        id: Date.now() + Math.random(), // ✅ 고유 ID 보장
        url: base64Image, // ✅ Base64 이미지
        timestamp: timestamp,
        width: canvas.width,
        height: canvas.height
      }

      setCapturedImages(prev => [...prev, imageData])
      capturedImagesRef.current.push(imageData)
      
      console.log('화면 캡처 완료:', timestamp)
      console.log('📊 현재 캡처 개수:', capturedImagesRef.current.length)

      // ✅ 추가: 실시간 AI 분석 (Mock)
      await analyzeImageRealtime(imageData)

      // TODO: 실제 백엔드 연동
      // await sendToBackend(base64Image, timestamp)

    } catch (error) {
      console.error('화면 캡처 실패:', error)
    }
  }

  // ✅ 추가: 실시간 AI 분석 함수
  const analyzeImageRealtime = async (imageData) => {
    try {
      // ✅ Mock AI 분석 (90% 확률로 딥페이크)
      const isDeepfake = Math.random() > 0.1
      const confidence = isDeepfake 
        ? parseFloat((Math.random() * 20 + 75).toFixed(1)) // 75-95%
        : parseFloat((Math.random() * 30 + 10).toFixed(1)) // 10-40%

      const analysisResult = {
        isDeepfake: isDeepfake,
        confidence: confidence,
        timestamp: imageData.timestamp
      }

      console.log('🔍 실시간 분석 결과:', analysisResult)

      // ✅ 딥페이크 감지 시 즉시 알림
      if (isDeepfake) {
        showDeepfakeAlert(imageData, analysisResult)
      }

      return analysisResult

      // TODO: 실제 백엔드 연동 시
      /*
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData.url,
          sessionId: sessionDataRef.current.sessionId 
        })
      })
      const result = await response.json()
      
      if (result.isDeepfake) {
        showDeepfakeAlert(imageData, result)
      }
      
      return result
      */

    } catch (error) {
      console.error('❌ AI 분석 실패:', error)
      return null
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

    // ✅ 알림 정리
    if (lastNotificationRef.current) {
      lastNotificationRef.current.close()
      lastNotificationRef.current = null
    }

    setIsRecording(false)
    
    const finalCount = capturedImagesRef.current.length
    console.log('녹화 종료!', `총 ${finalCount}개의 이미지 캡처됨`)

    // 세션 저장
    if (finalCount > 0) {
      saveSession()
    } else {
      console.warn('⚠️ 캡처된 이미지가 없어서 저장하지 않습니다.')
    }
  }

  // ✅ 세션 저장 함수 (ref에서 직접 가져오기)
  const saveSession = () => {
    const analyzedCaptures = addMockAIResults(capturedImagesRef.current)
    
    // 딥페이크 개수 계산
    const deepfakeCount = analyzedCaptures.filter(c => c.isDeepfake).length
    
    // ✅ ref에서 세션 정보 가져오기
    const completeSession = {
      ...sessionDataRef.current, // ✅ ref 사용
      endTime: new Date().toISOString(),
      captures: analyzedCaptures,
      totalCaptures: analyzedCaptures.length,
      deepfakeCount: deepfakeCount,
      status: 'completed'
    }
    
    console.log('💾 저장할 세션 데이터:', completeSession)
    
    // LocalStorage에 저장
    const success = saveZoomSession(completeSession)
    
    if (success) {
      console.log('✅ 세션 저장 완료:', completeSession)
      
      // 딥페이크 감지 알림
      if (deepfakeCount > 0) {
        alert(`🚨 딥페이크 ${deepfakeCount}건이 감지되었습니다!\n탐지 기록에서 확인하세요.`)
      } else {
        alert('✅ 모든 참가자가 안전합니다.')
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
    // Blob URL 메모리 해제
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
            {/* ✅ state 사용 (리렌더링 됨) */}
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