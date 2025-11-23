// FE/src/utils/api.js
import { getToken } from './auth'

const API_BASE_URL = 'http://localhost:8000/api'

/**
 * 인증된 fetch 요청
 */
const authenticatedFetch = async (url, options = {}) => {
  const token = getToken()
  
  const headers = {
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }
  
  // FormData가 아닌 경우에만 Content-Type 설정
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '요청 실패' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

/**
 * Zoom 세션 시작
 */
export const startZoomSession = async (sessionName) => {
  return authenticatedFetch('/zoom/sessions/start/', {
    method: 'POST',
    body: JSON.stringify({ session_name: sessionName })
  })
}

/**
 * 화면 캡처 전송 및 분석
 */
export const sendCapture = async (sessionId, screenshot, participantCount = 1) => {
  const formData = new FormData()
  formData.append('screenshot', screenshot)
  formData.append('participant_count', participantCount)
  
  return authenticatedFetch(`/zoom/sessions/${sessionId}/capture/`, {
    method: 'POST',
    body: formData
  })
}

/**
 * Zoom 세션 종료
 */
export const endZoomSession = async (sessionId) => {
  return authenticatedFetch(`/zoom/sessions/${sessionId}/end/`, {
    method: 'POST'
  })
}

/**
 * 세션 목록 가져오기
 */
export const getZoomSessions = async (status = null) => {
  const url = status 
    ? `/zoom/sessions/?status=${status}` 
    : '/zoom/sessions/'
  
  return authenticatedFetch(url, {
    method: 'GET'
  })
}

/**
 * 세션 상세 정보 가져오기
 */
export const getZoomSessionDetail = async (sessionId) => {
  return authenticatedFetch(`/zoom/sessions/${sessionId}/report/`, {
    method: 'GET'
  })
}

/**
 * 캡처 상세 정보 가져오기
 */
export const getCaptureDetail = async (captureId) => {
  return authenticatedFetch(`/zoom/captures/${captureId}/`, {
    method: 'GET'
  })
}