// FE/src/pages/SessionDetailPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getZoomSessionDetail } from '../utils/api'
import './SessionDetailPage.css'

function SessionDetailPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  
  const [session, setSession] = useState(null)
  const [deepfakeCaptures, setDeepfakeCaptures] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSessionDetail()
  }, [sessionId])

  const loadSessionDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📡 세션 상세 정보 요청:', sessionId)
      const data = await getZoomSessionDetail(sessionId)
      
      console.log('✅ 세션 상세 정보 로드 완료:', data)
      
      setSession(data.session)
      
      // ✅ 딥페이크로 판정된 캡처만 필터링
      const deepfakes = data.captures.filter(capture => {
        const result = capture.record?.analysis_result
        return result === 'deepfake' || result === 'suspicious'
      })
      
      console.log('🚨 딥페이크 캡처:', deepfakes)
      setDeepfakeCaptures(deepfakes)
      
    } catch (err) {
      console.error('❌ 세션 상세 정보 로드 실패:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoBack = () => {
    navigate('/history')
  }

  const handleImageClick = (capture) => {
    setSelectedImage(capture)
  }

  const closeModal = () => {
    setSelectedImage(null)
  }

  const downloadImage = async (capture) => {
    try {
      // ✅ record에서 image_url 또는 original_path 가져오기
      const imageUrl = capture.record?.image_url || capture.record?.original_path
      
      if (!imageUrl) {
        console.error('❌ 이미지 URL 없음:', capture)
        alert('이미지를 찾을 수 없습니다.')
        return
      }
      
      console.log('📥 다운로드 시작:', imageUrl)
      
      try {
        // ✅ 방법 1: fetch로 시도 (CORS가 허용되면 이게 가장 좋음)
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.download = `deepfake_${capture.capture_id}_${new Date(capture.capture_timestamp).getTime()}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(url)
        console.log('✅ 다운로드 완료')
        
      } catch (fetchError) {
        console.warn('⚠️ fetch 실패, 직접 링크로 시도:', fetchError)
        
        // ✅ 방법 2: fetch 실패 시 직접 링크 (새 탭에서 열림)
        const link = document.createElement('a')
        link.href = imageUrl
        link.download = `deepfake_${capture.capture_id}_${new Date(capture.capture_timestamp).getTime()}.jpg`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        console.log('✅ 다운로드 링크 열림 (새 탭)')
      }
      
    } catch (err) {
      console.error('❌ 이미지 다운로드 실패:', err)
      alert('이미지 다운로드에 실패했습니다: ' + err.message)
    }
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

  if (error) {
    return (
      <div className="detail-container">
        <div className="error">
          <p>세션 정보를 불러오는 중 오류가 발생했습니다.</p>
          <p>{error}</p>
          <button className="primary-button" onClick={loadSessionDetail} style={{ marginTop: '20px' }}>
            다시 시도
          </button>
        </div>
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
          <h1>{session.session_name}</h1>
          <p className="header-subtitle">
            {new Date(session.start_time).toLocaleString('ko-KR')}
          </p>
        </div>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="detail-content">
        {/* 딥페이크 이미지 목록 */}
        <div className="images-section">
          <div className="section-header">
            <h2>🚨 딥페이크로 판정된 이미지</h2>
            <p className="section-subtitle">
              신뢰도가 높은 순서대로 표시됩니다
            </p>
          </div>

          {deepfakeCaptures.length === 0 ? (
            <div className="no-deepfakes">
              <div className="success-icon">✅</div>
              <h3>딥페이크가 감지되지 않았습니다</h3>
              <p>모든 참가자가 안전합니다!</p>
            </div>
          ) : (
            <div className="deepfake-grid">
              {deepfakeCaptures
                .sort((a, b) => {
                  const confA = parseFloat(a.record?.confidence_score || 0)
                  const confB = parseFloat(b.record?.confidence_score || 0)
                  return confB - confA
                })
                .map((capture, index) => (
                  <div 
                    key={capture.capture_id} 
                    className="deepfake-card"
                    onClick={() => handleImageClick(capture)}
                  >
                    {/* 순위 배지 */}
                    <div className="rank-badge">#{index + 1}</div>

                    {/* 이미지 */}
                    <div className="image-wrapper">
                      {(capture.record?.image_url || capture.record?.original_path) ? (
                        <img 
                          src={capture.record.image_url || capture.record.original_path} 
                          alt={`딥페이크 ${index + 1}`}
                          onError={(e) => {
                            console.error('❌ 이미지 로드 실패:', e.target.src)
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f3f4f6;color:#999">이미지 로드 실패</div>'
                          }}
                        />
                      ) : (
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '100%',
                          background: '#f3f4f6',
                          color: '#999'
                        }}>
                          이미지 없음
                        </div>
                      )}
                      <div className="image-overlay">
                        <span>클릭하여 확대</span>
                      </div>
                    </div>

                    {/* 정보 */}
                    <div className="deepfake-info">
                      <div className="confidence-bar">
                        <div className="confidence-label">
                          <span>신뢰도</span>
                          <span className="confidence-value">
                            {parseFloat(capture.record?.confidence_score || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-bar">
                          <div 
                            className="progress-fill"
                            style={{ 
                              width: `${capture.record?.confidence_score || 0}%`,
                              backgroundColor: (capture.record?.confidence_score || 0) >= 90 ? '#ef4444' : 
                                              (capture.record?.confidence_score || 0) >= 75 ? '#f59e0b' : '#10b981'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="image-meta">
                        <div className="meta-item">
                          <span className="meta-icon">🕒</span>
                          <span>{new Date(capture.capture_timestamp).toLocaleTimeString('ko-KR')}</span>
                        </div>
                        <div className="meta-item">
                          <span className="meta-icon">👤</span>
                          <span>{capture.participant_count}명 감지</span>
                        </div>
                      </div>

                      <button 
                        className="download-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          downloadImage(capture)
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
      {selectedImage && (selectedImage.record?.image_url || selectedImage.record?.original_path) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="modal-image-wrapper">
              <img 
                src={selectedImage.record.image_url || selectedImage.record.original_path} 
                alt="확대 이미지" 
              />
            </div>

            <div className="modal-info">
              <div className="modal-confidence">
                <span className="confidence-label">딥페이크 신뢰도</span>
                <span className="confidence-value">
                  {parseFloat(selectedImage.record?.confidence_score || 0).toFixed(1)}%
                </span>
              </div>
              <div className="modal-timestamp">
                {new Date(selectedImage.capture_timestamp).toLocaleString('ko-KR')}
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