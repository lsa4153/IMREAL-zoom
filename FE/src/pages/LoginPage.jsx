// FE/src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, register, isAuthenticated } from '../utils/auth'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: ''
  })
  const [loading, setLoading] = useState(false)

  // ✅ 이미 로그인되어 있으면 홈으로 리다이렉트
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/home', { replace: true })
    }
  }, [navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // ✅ 로그인
        const result = await login(formData.email, formData.password)

        if (result.success) {
          console.log('✅ 로그인 성공:', result.user)
          alert(`환영합니다, ${result.user.nickname}님!`)
          navigate('/home', { replace: true })  // ✅ /home으로 변경
        } else {
          alert(result.error || '로그인에 실패했습니다.')
        }
      } else {
        // ✅ 회원가입
        if (formData.password !== formData.passwordConfirm) {
          alert('비밀번호가 일치하지 않습니다.')
          setLoading(false)
          return
        }

        const result = await register(
          formData.email, 
          formData.password, 
          formData.nickname
        )

        if (result.success) {
          console.log('✅ 회원가입 성공:', result.user)
          alert(`회원가입 성공! 환영합니다, ${result.user.nickname}님!`)
          navigate('/home', { replace: true })  // ✅ /home으로 변경
        } else {
          alert(result.error || '회원가입에 실패했습니다.')
        }
      }
    } catch (error) {
      console.error('❌ 오류 발생:', error)
      alert('서버 연결 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* 배경 버블 애니메이션 */}
      <div className="login-background">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
        <div className="bubble bubble-4"></div>
        <div className="bubble bubble-5"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <img src="/logo-lock.png" alt="IMREAL" className="logo-image" />
          </div>
          <p className="tagline"></p>
        </div>

        <div className="tab-switcher">
          <button
            className={`tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            로그인
          </button>
          <button
            className={`tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            회원가입
          </button>
          <div className={`tab-indicator ${!isLogin ? 'right' : ''}`}></div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="nickname">닉네임</label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="사용할 닉네임을 입력하세요"
                required={!isLogin}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="이메일을 입력하세요"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="passwordConfirm">비밀번호 확인</label>
              <input
                type="password"
                id="passwordConfirm"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="비밀번호를 다시 입력하세요"
                required={!isLogin}
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="loading-spinner"></span>
            ) : (
              <span>{isLogin ? '로그인' : '회원가입'}</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
            <button onClick={() => setIsLogin(!isLogin)} className="toggle-btn">
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage