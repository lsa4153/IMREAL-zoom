import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSessionById, getDeepfakeCaptures } from '../utils/storage'
import './SessionDetailPage.css'

function SessionDetailPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState(null)
  const [deepfakeImages, setDeepfakeImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSession()
  }, [sessionId])

  const loadSession = () => {
    const sessionData = getSessionById(Number(sessionId))
    
    if (!sessionData) {
      alert('세션을 찾을 수 없습니다.')
      navigate('/history')
      return
    }

    setSession(sessionData)
    
    // 🚨 딥페이크로 판정된 이미지만 필터링
    const deepfakes = getDeepfakeCaptures(Number(sessionId))
    setDeepfakeImages(deepfakes)
    
    setLoading(false)
  }

  const handleGoBack = () => {
    navigate('/history')
  }

  const handleImageClick = (image) => {
    setSelectedImage(image)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  const downloadImage = (image) => {
    const link = document.createElement('a')
    link.href = image.url
    link.download = `deepfake_${image.timestamp}.jpg`
    link.click()
  }

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return '-'
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end - start
    const diffMins = Math.floor(diffMs / 60000)
    const diffSecs = Math.floor((diffMs % 60000) / 1000)
    return `${diffMins}분 ${diffSecs}초`
  }

  if (loading) {
    return (
      <div className="detail-container">
        <div className="loading">로딩 중...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="detail-container">
        <div className="error">세션을 찾을 수 없습니다.</div>
      </div>
    )
  }

  return (
    <div className="detail-container">
      {/* 헤더 */}
      <header className="detail-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="header-content">
          <h1>{session.sessionName}</h1>
          <p className="header-subtitle">
            {new Date(session.startTime).toLocaleString('ko-KR')}
          </p>
        </div>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="detail-content">
        {/* 세션 요약 */}
        <div className="summary-card">
          <div className="summary-header">
            <div className="summary-badge danger">
              <span className="badge-icon">🚨</span>
              <span>딥페이크 {deepfakeImages.length}건 감지</span>
            </div>
          </div>

          <div className="summary-stats">
            <div className="summary-stat">
              <div className="stat-label">총 분석 이미지</div>
              <div className="stat-value">{session.totalCaptures}장</div>
            </div>
            <div className="summary-stat danger">
              <div className="stat-label">딥페이크 감지</div>
              <div className="stat-value">{session.deepfakeCount}장</div>
            </div>
            <div className="summary-stat">
              <div className="stat-label">소요 시간</div>
              <div className="stat-value">
                {formatDuration(session.startTime, session.endTime)}
              </div>
            </div>
            <div className="summary-stat">
              <div className="stat-label">탐지율</div>
              <div className="stat-value">
                {((session.deepfakeCount / session.totalCaptures) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* 딥페이크 이미지 목록 */}
        <div className="images-section">
          <div className="section-header">
            <h2>🚨 딥페이크로 판정된 이미지</h2>
            <p className="section-subtitle">
              신뢰도가 높은 순서대로 표시됩니다
            </p>
          </div>

          {deepfakeImages.length === 0 ? (
            <div className="no-deepfakes">
              <div className="success-icon">✅</div>
              <h3>딥페이크가 감지되지 않았습니다</h3>
              <p>모든 참가자가 안전합니다!</p>
            </div>
          ) : (
            <div className="deepfake-grid">
              {deepfakeImages
                .sort((a, b) => b.confidence - a.confidence) // 신뢰도 높은 순
                .map((image, index) => (
                  <div 
                    key={image.id} 
                    className="deepfake-card"
                    onClick={() => handleImageClick(image)}
                  >
                    {/* 순위 배지 */}
                    <div className="rank-badge">#{index + 1}</div>

                    {/* 이미지 */}
                    <div className="image-wrapper">
                      <img src={image.url} alt={`딥페이크 ${index + 1}`} />
                      <div className="image-overlay">
                        <span>클릭하여 확대</span>
                      </div>
                    </div>

                    {/* 정보 */}
                    <div className="deepfake-info">
                      <div className="confidence-bar">
                        <div className="confidence-label">
                          <span>신뢰도</span>
                          <span className="confidence-value">{image.confidence}%</span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${image.confidence}%`,
                              backgroundColor: image.confidence >= 90 ? '#ef4444' : 
                                              image.confidence >= 75 ? '#f59e0b' : '#10b981'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="image-meta">
                        <div className="meta-item">
                          <span className="meta-icon">🕒</span>
                          <span>{new Date(image.timestamp).toLocaleTimeString('ko-KR')}</span>
                        </div>
                        {image.aiResult && (
                          <div className="meta-item">
                            <span className="meta-icon">👤</span>
                            <span>{image.aiResult.face_count}명 감지</span>
                          </div>
                        )}
                      </div>

                      <button 
                        className="download-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadImage(image)
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>다운로드</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </main>

      {/* 이미지 확대 모달 */}
      {selectedImage && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="modal-image-wrapper">
              <img src={selectedImage.url} alt="확대 이미지" />
            </div>

            <div className="modal-info">
              <div className="modal-confidence">
                <span className="confidence-label">딥페이크 신뢰도</span>
                <span className="confidence-value">{selectedImage.confidence}%</span>
              </div>
              <div className="modal-timestamp">
                {new Date(selectedImage.timestamp).toLocaleString('ko-KR')}
              </div>
              <button 
                className="modal-download"
                onClick={() => downloadImage(selectedImage)}
              >
                이미지 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionDetailPage