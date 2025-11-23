import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getToken } from '../utils/auth'  // ✅ getToken만 import
import './DetectionHistoryPage.css'

const API_BASE_URL = 'http://localhost:8000/api'  // ✅ 추가

function DetectionHistoryPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadSessions()
  }, [])

  // ✅ 직접 fetch 사용하도록 수정
  const loadSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = getToken()
      
      console.log('📡 세션 목록 요청 중...')
      
      const response = await fetch(`${API_BASE_URL}/zoom/sessions/`, {
        headers: {
          'Authorization': `Token ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`세션 목록을 불러올 수 없습니다 (${response.status})`)
      }

      const data = await response.json()
      console.log('✅ 세션 목록 로드 완료:', data)
      
      // ✅ 백엔드 응답 형식에 따라 처리
      const sessionList = Array.isArray(data) ? data : (data.results || data.sessions || [])
      
      setSessions(sessionList)
      
      const statistics = calculateStatistics(sessionList)
      setStats(statistics)
      
    } catch (err) {
      console.error('❌ 세션 목록 로드 실패:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateStatistics = (sessionList) => {
    const totalSessions = sessionList.length
    const deepfakeSessions = sessionList.filter(s => s.suspicious_detections > 0).length
    const totalCaptures = sessionList.reduce((sum, s) => sum + (s.total_captures || 0), 0)
    const totalDeepfakes = sessionList.reduce((sum, s) => sum + (s.suspicious_detections || 0), 0)
    
    return {
      totalSessions,
      deepfakeSessions,
      safeSessions: totalSessions - deepfakeSessions,
      totalCaptures,
      totalDeepfakes,
      detectionRate: totalCaptures > 0 
        ? ((totalDeepfakes / totalCaptures) * 100).toFixed(1)
        : 0
    }
  }

  const handleGoBack = () => {
    navigate('/')  // ✅ '/home'이 아니라 '/'로 수정
  }

  const handleSessionClick = (sessionId) => {
    navigate(`/history/${sessionId}`)
  }

  const filteredSessions = filter === 'deepfake' 
    ? sessions.filter(s => s.suspicious_detections > 0)
    : sessions

  const formatDuration = (startTime, endTime) => {
    if (!endTime || !startTime) return '-'
    
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-'
      
      const diffMs = end - start
      const diffMins = Math.floor(diffMs / 60000)
      const diffSecs = Math.floor((diffMs % 60000) / 1000)
      return `${diffMins}분 ${diffSecs}초`
    } catch {
      return '-'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '알 수 없음'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '알 수 없음'
      
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    } catch {
      return '알 수 없음'
    }
  }

  if (loading) {
    return (
      <div className="history-container">
        <header className="history-header">
          <button className="back-button" onClick={handleGoBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1>딥페이크 탐지 기록</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="history-content">
          <div className="loading">로딩 중...</div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="history-container">
        <header className="history-header">
          <button className="back-button" onClick={handleGoBack}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h1>딥페이크 탐지 기록</h1>
          <div style={{ width: '40px' }}></div>
        </header>
        <main className="history-content">
          <div className="error">
            <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
            <p>{error}</p>
            <button className="primary-button" onClick={loadSessions} style={{ marginTop: '20px' }}>
              다시 시도
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="history-container">
      <header className="history-header">
        <button className="back-button" onClick={handleGoBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1>딥페이크 탐지 기록</h1>
        <div style={{ width: '40px' }}></div>
      </header>

      <main className="history-content">
        {stats && (
          <div className="stats-card">
            <h2>전체 통계</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{stats.totalSessions}</div>
                <div className="stat-label">총 세션</div>
              </div>
              <div className="stat-item danger">
                <div className="stat-value">{stats.deepfakeSessions}</div>
                <div className="stat-label">딥페이크 세션</div>
              </div>
              <div className="stat-item success">
                <div className="stat-value">{stats.safeSessions}</div>
                <div className="stat-label">안전 세션</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.totalCaptures}</div>
                <div className="stat-label">총 분석 이미지</div>
              </div>
            </div>
          </div>
        )}

        <div className="filter-buttons">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            전체 ({sessions.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'deepfake' ? 'active' : ''}`}
            onClick={() => setFilter('deepfake')}
          >
            딥페이크만 ({sessions.filter(s => s.suspicious_detections > 0).length})
          </button>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="30" stroke="#ddd" strokeWidth="3"/>
                <path d="M40 25v20M40 55v5" stroke="#ddd" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <h2>
              {filter === 'deepfake' 
                ? '딥페이크가 감지된 세션이 없습니다' 
                : '아직 탐지 기록이 없습니다'}
            </h2>
            <p>
              {filter === 'deepfake'
                ? '모든 세션이 안전합니다!'
                : '녹화를 시작하면 딥페이크 탐지 기록이 여기에 표시됩니다.'}
            </p>
          </div>
        ) : (
          <div className="sessions-list">
            {filteredSessions.map((session) => (
              <div 
                key={session.session_id} 
                className={`session-card ${session.suspicious_detections > 0 ? 'danger' : 'safe'}`}
                onClick={() => handleSessionClick(session.session_id)}
              >
                <div className="session-badge">
                  {session.suspicious_detections > 0 ? (
                    <>
                      <span className="badge-icon">🚨</span>
                      <span>딥페이크 감지</span>
                    </>
                  ) : (
                    <>
                      <span className="badge-icon">✅</span>
                      <span>안전</span>
                    </>
                  )}
                </div>

                <div className="session-info">
                  <h3 className="session-name">{session.session_name}</h3>
                  <p className="session-time">
                    {formatDate(session.start_time)}
                  </p>
                  <p className="session-duration">
                    소요시간: {formatDuration(session.start_time, session.end_time)}
                  </p>
                </div>

                <div className="session-stats">
                  <div className="stat-row">
                    <span className="stat-label">총 분석</span>
                    <span className="stat-value">{session.total_captures}장</span>
                  </div>
                  {session.suspicious_detections > 0 && (
                    <div className="stat-row danger">
                      <span className="stat-label">딥페이크</span>
                      <span className="stat-value">{session.suspicious_detections}장</span>
                    </div>
                  )}
                </div>

                <div className="session-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default DetectionHistoryPage