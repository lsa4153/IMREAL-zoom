import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './utils/auth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import DetectionHistoryPage from './pages/DetectionHistoryPage'
import SessionDetailPage from './pages/SessionDetailPage'

// ✅ 로그인 필요한 페이지 보호
function ProtectedRoute({ children }) {
  const token = getToken()
  
  if (!token) {
    // 토큰 없으면 로그인 페이지로
    return <Navigate to="/login" replace />
  }
  
  return children
}

// ✅ 이미 로그인한 사람이 로그인/회원가입 페이지 접근 막기
function PublicRoute({ children }) {
  const token = getToken()
  
  if (token) {
    // 토큰 있으면 홈으로
    return <Navigate to="/home" replace />
  }
  
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ 기본 경로 - 토큰 체크해서 분기 */}
        <Route 
          path="/" 
          element={
            getToken() ? <Navigate to="/home" replace /> : <Navigate to="/login" replace />
          } 
        />
        
        {/* ✅ 로그인/회원가입 페이지 (이미 로그인한 사람은 접근 불가) */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
        {/* ✅ 로그인 필요한 페이지들 */}
        <Route 
          path="/home" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <DetectionHistoryPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/history/:sessionId" 
          element={
            <ProtectedRoute>
              <SessionDetailPage />
            </ProtectedRoute>
          } 
        />
        
        {/* ✅ 404 페이지 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App