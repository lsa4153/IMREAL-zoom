// utils/storage.js

/**
 * 새로운 Zoom 세션 저장
 */
export const saveZoomSession = (sessionData) => {
  try {
    const sessions = getAllSessions()
    
    // 세션 ID 기반으로 중복 체크
    const existingIndex = sessions.findIndex(s => s.sessionId === sessionData.sessionId)
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = sessionData
    } else {
      sessions.push(sessionData)
    }
    
    // 최신순 정렬
    sessions.sort((a, b) => {
      const timeA = new Date(a.startTime).getTime()
      const timeB = new Date(b.startTime).getTime()
      return timeB - timeA
    })
    
    localStorage.setItem('zoomSessions', JSON.stringify(sessions))
    console.log('✅ 세션 저장 완료:', sessionData.sessionName)
    return true
  } catch (error) {
    console.error('❌ 세션 저장 실패:', error)
    return false
  }
}

/**
 * 모든 세션 가져오기
 */
export const getAllSessions = () => {
  try {
    const data = localStorage.getItem('zoomSessions')
    return data ? JSON.parse(data) : []
  } catch (error) {
    console.error('❌ 세션 불러오기 실패:', error)
    return []
  }
}

/**
 * 특정 세션 가져오기
 */
export const getSessionById = (sessionId) => {
  const sessions = getAllSessions()
  return sessions.find(s => s.sessionId === Number(sessionId)) || null
}

/**
 * 딥페이크가 감지된 세션만 필터링
 */
export const getDeepfakeSessions = () => {
  const sessions = getAllSessions()
  return sessions.filter(s => s.deepfakeCount > 0)
}

/**
 * 특정 세션의 딥페이크 이미지만 가져오기
 */
export const getDeepfakeCaptures = (sessionId) => {
  const session = getSessionById(sessionId)
  if (!session || !session.captures) return []
  
  return session.captures.filter(capture => capture.isDeepfake === true)
}

/**
 * 세션 삭제
 */
export const deleteSession = (sessionId) => {
  try {
    const sessions = getAllSessions()
    const filtered = sessions.filter(s => s.sessionId !== Number(sessionId))
    localStorage.setItem('zoomSessions', JSON.stringify(filtered))
    console.log('✅ 세션 삭제 완료:', sessionId)
    return true
  } catch (error) {
    console.error('❌ 세션 삭제 실패:', error)
    return false
  }
}

/**
 * 모든 세션 삭제
 */
export const clearAllSessions = () => {
  try {
    localStorage.removeItem('zoomSessions')
    console.log('✅ 모든 세션 삭제 완료')
    return true
  } catch (error) {
    console.error('❌ 세션 삭제 실패:', error)
    return false
  }
}

/**
 * Mock 딥페이크 분석 결과 생성
 * ✅ 수정: 실제 캡처 정보 보존 + 딥페이크 확률 조정
 */
export const addMockAIResults = (captures) => {
  return captures.map(capture => {
    // ✅ 수정: 10% 확률로 딥페이크 (원래는 90%였음)
    const isDeepfake = Math.random() > 0.1
    
    return {
      ...capture, // ✅ 중요: 기존 캡처 정보 모두 보존 (url, timestamp, width, height 등)
      isDeepfake: isDeepfake,
      confidence: isDeepfake 
        ? parseFloat((Math.random() * 20 + 75).toFixed(1)) // 딥페이크: 75-95%
        : parseFloat((Math.random() * 30 + 10).toFixed(1)), // 안전: 10-40%
      aiResult: {
        face_count: Math.floor(Math.random() * 3) + 1,
        analyzed: true,
        model_version: 'v1.0',
        processing_time: Math.floor(Math.random() * 500 + 200)
      }
    }
  })
}

/**
 * 통계 데이터 가져오기
 */
export const getStatistics = () => {
  const sessions = getAllSessions()
  
  const totalSessions = sessions.length
  const deepfakeSessions = sessions.filter(s => s.deepfakeCount > 0).length
  const totalCaptures = sessions.reduce((sum, s) => sum + s.totalCaptures, 0)
  const totalDeepfakes = sessions.reduce((sum, s) => sum + s.deepfakeCount, 0)
  
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