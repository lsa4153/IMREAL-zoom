import React from 'react'
import { useNavigate } from 'react-router-dom'
import './DetectionHistoryPage.css'

function DetectionHistoryPage() {
  const navigate = useNavigate()

  const handleGoBack = () => {
    navigate('/')
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1>탐지 기록</h1>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="history-content">
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="30" stroke="#ddd" strokeWidth="3"/>
              <path d="M40 25v20M40 55v5" stroke="#ddd" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h2>아직 탐지 기록이 없습니다</h2>
          <p>녹화를 시작하면 딥페이크 탐지 기록이 여기에 표시됩니다.</p>
        </div>
      </main>
    </div>
  )
}

export default DetectionHistoryPage