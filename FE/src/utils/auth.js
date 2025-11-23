// utils/auth.js

// ✅ Django 백엔드 URL (config/settings.py의 CORS 설정과 동일)
const API_BASE_URL = 'http://localhost:8000/api'

/**
 * 로그인 함수 (Django API 연동)
 */
export const login = async (email, password) => {
  try {
    console.log('🔐 로그인 시도:', email)

    // ✅ Django /api/users/login/ 호출
    const response = await fetch(`${API_BASE_URL}/users/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email,
        password: password 
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 로그인 실패:', errorData)
      throw new Error(errorData.error || '로그인 실패')
    }

    // ✅ Django 응답 구조:
    // {
    //   "message": "로그인 성공",
    //   "user": { user_id, email, nickname },
    //   "token": "abc123..."
    // }
    const data = await response.json()
    
    // LocalStorage에 저장
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user_data', JSON.stringify(data.user))

    console.log('✅ 로그인 성공:', data.user.email)
    return { success: true, user: data.user }

  } catch (error) {
    console.error('❌ 로그인 에러:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 로그아웃 함수 (Django API 연동)
 */
export const logout = async () => {
  try {
    const token = getToken()
    
    if (token) {
      // ✅ Django /api/users/logout/ 호출
      await fetch(`${API_BASE_URL}/users/logout/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        }
      })
    }

    // 로컬 데이터 삭제
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    
    console.log('🚪 로그아웃 완료')
    return true
  } catch (error) {
    console.error('❌ 로그아웃 에러:', error)
    // 에러가 나도 로컬 데이터는 삭제
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    return true
  }
}

/**
 * 회원가입 함수 (Django API 연동)
 */
export const register = async (email, password, nickname) => {
  try {
    console.log('📝 회원가입 시도:', email)

    // ✅ Django /api/users/register/ 호출
    const response = await fetch(`${API_BASE_URL}/users/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email,
        password: password,
        password_confirm: password, // Django serializer 요구사항
        nickname: nickname 
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ 회원가입 실패:', errorData)
      throw new Error(errorData.error || '회원가입 실패')
    }

    const data = await response.json()
    
    // 회원가입 성공 시 자동 로그인
    localStorage.setItem('auth_token', data.token)
    localStorage.setItem('user_data', JSON.stringify(data.user))

    console.log('✅ 회원가입 성공:', data.user.email)
    return { success: true, user: data.user }

  } catch (error) {
    console.error('❌ 회원가입 에러:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 인증 상태 확인
 */
export const isAuthenticated = () => {
  const token = localStorage.getItem('auth_token')
  return !!token
}

/**
 * 토큰 가져오기
 */
export const getToken = () => {
  return localStorage.getItem('auth_token')
}

/**
 * 사용자 정보 가져오기
 */
export const getUserData = () => {
  try {
    const userData = localStorage.getItem('user_data')
    return userData ? JSON.parse(userData) : null
  } catch (error) {
    console.error('❌ 사용자 정보 파싱 실패:', error)
    return null
  }
}

/**
 * 백엔드 API 호출용 헤더 생성
 * (다른 API 요청 시 사용)
 */
export const getAuthHeaders = () => {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Token ${token}` : ''
  }
}

/**
 * 인증된 fetch 요청 (Wrapper 함수)
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = getToken()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Token ${token}`
  }
  
  return fetch(url, {
    ...options,
    headers
  })
}