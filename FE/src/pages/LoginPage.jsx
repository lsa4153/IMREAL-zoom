import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

function LoginPage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true) // true: 로그인, false: 회원가입
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    nickname: ''
  })
  const [loading, setLoading] = useState(false)

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
        // 로그인 API 호출
        const response = await fetch('http://localhost:8000/api/users/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        })

        const data = await response.json()

        if (response.ok) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          alert('로그인 성공!')
          navigate('/')
        } else {
          alert(data.error || '로그인 실패')
        }
      } else {
        // 회원가입 API 호출
        if (formData.password !== formData.passwordConfirm) {
          alert('비밀번호가 일치하지 않습니다.')
          return
        }

        const response = await fetch('http://localhost:8000/api/users/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            password_confirm: formData.passwordConfirm,
            nickname: formData.nickname
          })
        })

        const data = await response.json()

        if (response.ok) {
          alert('회원가입 성공! 로그인해주세요.')
          setIsLogin(true)
          setFormData({ email: '', password: '', passwordConfirm: '', nickname: '' })
        } else {
          alert(data.error || '회원가입 실패')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      alert('서버 연결 오류')
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setIsLogin(!isLogin)
    setFormData({ email: '', password: '', passwordConfirm: '', nickname: '' })
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
        <div className="bubble bubble-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo">
            <img src="/logo-lock.png"  alt="IMREAL" className="logo-image" />
          </div>
          <p className="tagline">딥페이크 탐지 시스템</p>
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
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
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
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <div className="input-wrapper">
              <span className="input-icon">📧</span>
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
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <div className="input-wrapper">
              <span className="input-icon">🔒</span>
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
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="passwordConfirm">비밀번호 확인</label>
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
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
            <button onClick={toggleMode} className="toggle-btn">
              {isLogin ? '회원가입' : '로그인'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage