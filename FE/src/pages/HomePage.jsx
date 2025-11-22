import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HomePage.css'

function HomePage() {
  const navigate = useNavigate()
  const [isRecording, setIsRecording] = useState(false)

  const handleStartRecording = () => {
    setIsRecording(true)
    console.log('녹화 시작!')
    // TODO: 녹화 시작 로직 (5초마다 화면 캡처)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    console.log('녹화 종료!')
    // TODO: 녹화 종료 로직
  }

  const handleViewHistory = () => {
    navigate('/history')
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
            <span>녹화 중...</span>
          </div>
        )}
      </main>
    </div>
  )
}

export default HomePage