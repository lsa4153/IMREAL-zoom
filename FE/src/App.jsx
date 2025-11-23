import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated } from './utils/auth'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import DetectionHistoryPage from './pages/DetectionHistoryPage'
import SessionDetailPage from './pages/SessionDetailPage'

// 인증이 필요한 라우트를 보호하는 컴포넌트
function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    // 로그인 안 되어 있으면 로그인 페이지로 리다이렉트
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 로그인 페이지 (인증 불필요) */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* 보호된 라우트들 (인증 필요) */}
        <Route 
          path="/" 
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
        
        {/* 잘못된 경로는 홈으로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App