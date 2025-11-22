import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllSessions, getStatistics, deleteSession } from '../utils/storage'
import './DetectionHistoryPage.css'

function DetectionHistoryPage() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [stats, setStats] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' or 'deepfake'

  useEffect(() => {
    loadSessions()
  }, [])

  // ✅ 수정: 유효한 세션만 필터링해서 로드
  const loadSessions = () => {
    const allSessions = getAllSessions()
    
    // ✅ 유효성 검증 필터링
    const validSessions = allSessions.filter(session => {
      const isValid = 
        session.sessionId &&              // sessionId 존재
        session.startTime &&               // startTime 존재
        session.sessionName &&             // sessionName 존재
        session.startTime !== 'null' &&    // 문자열 'null' 아님
        session.sessionId !== 0 &&         // 0 아님
        !isInvalidDate(session.startTime)  // 유효한 날짜
      
      if (!isValid) {
        console.warn('⚠️ 잘못된 세션 발견 (자동 제외):', session)
      }
      
      return isValid
    })
    
    console.log(`✅ 총 ${allSessions.length}개 중 ${validSessions.length}개의 유효한 세션 로드`)
    setSessions(validSessions)
    
    // 통계는 유효한 세션 기준으로 재계산
    const statistics = calculateStatistics(validSessions)
    setStats(statistics)
  }

  // ✅ 추가: 잘못된 날짜 체크 (1970년 등)
  const isInvalidDate = (dateString) => {
    try {
      const date = new Date(dateString)
      // 1970년이면 잘못된 데이터
      return date.getFullYear() === 1970 || isNaN(date.getTime())
    } catch {
      return true
    }
  }

  // ✅ 추가: 유효한 세션으로 통계 재계산
  const calculateStatistics = (validSessions) => {
    const totalSessions = validSessions.length
    const deepfakeSessions = validSessions.filter(s => s.deepfakeCount > 0).length
    const totalCaptures = validSessions.reduce((sum, s) => sum + s.totalCaptures, 0)
    const totalDeepfakes = validSessions.reduce((sum, s) => sum + s.deepfakeCount, 0)
    
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
    navigate('/')
  }

  const handleSessionClick = (sessionId) => {
    navigate(`/history/${sessionId}`)
  }

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    
    if (window.confirm('이 세션을 삭제하시겠습니까?')) {
      const success = deleteSession(sessionId)
      if (success) {
        loadSessions() // 목록 새로고침
      }
    }
  }

  // 필터링된 세션
  const filteredSessions = filter === 'deepfake' 
    ? sessions.filter(s => s.deepfakeCount > 0)
    : sessions

  // ✅ 수정: 안전한 날짜 포맷팅
  const formatDuration = (startTime, endTime) => {
    if (!endTime || !startTime) return '-'
    
    try {
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      // 유효하지 않은 날짜 체크
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-'
      
      const diffMs = end - start
      const diffMins = Math.floor(diffMs / 60000)
      const diffSecs = Math.floor((diffMs % 60000) / 1000)
      return `${diffMins}분 ${diffSecs}초`
    } catch {
      return '-'
    }
  }

  // ✅ 추가: 안전한 날짜 표시
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'null') return '알 수 없음'
    
    try {
      const date = new Date(dateString)
      // 1970년이면 잘못된 데이터
      if (date.getFullYear() === 1970 || isNaN(date.getTime())) {
        return '알 수 없음'
      }
      
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
        {/* 통계 카드 */}
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

        {/* 필터 버튼 */}
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
            딥페이크만 ({sessions.filter(s => s.deepfakeCount > 0).length})
          </button>
        </div>

        {/* 세션 목록 */}
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
                key={session.sessionId} 
                className={`session-card ${session.deepfakeCount > 0 ? 'danger' : 'safe'}`}
                onClick={() => handleSessionClick(session.sessionId)}
              >
                {/* 상태 배지 */}
                <div className="session-badge">
                  {session.deepfakeCount > 0 ? (
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

                {/* 세션 정보 */}
                <div className="session-info">
                  <h3 className="session-name">{session.sessionName}</h3>
                  <p className="session-time">
                    {/* ✅ 수정: 안전한 날짜 표시 */}
                    {formatDate(session.startTime)}
                  </p>
                  <p className="session-duration">
                    소요시간: {formatDuration(session.startTime, session.endTime)}
                  </p>
                </div>

                {/* 통계 */}
                <div className="session-stats">
                  <div className="stat-row">
                    <span className="stat-label">총 분석</span>
                    <span className="stat-value">{session.totalCaptures}장</span>
                  </div>
                  {session.deepfakeCount > 0 && (
                    <div className="stat-row danger">
                      <span className="stat-label">딥페이크</span>
                      <span className="stat-value">{session.deepfakeCount}장</span>
                    </div>
                  )}
                </div>

                {/* 삭제 버튼 */}
                <button 
                  className="delete-button"
                  onClick={(e) => handleDeleteSession(session.sessionId, e)}
                  title="세션 삭제"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>

                {/* 화살표 */}
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