import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DetectionHistoryPage from './pages/DetectionHistoryPage'
import SessionDetailPage from './pages/SessionDetailPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<DetectionHistoryPage />} />
        <Route path="/history/:sessionId" element={<SessionDetailPage />} />
      </Routes>
    </Router>
  )
}

export default App