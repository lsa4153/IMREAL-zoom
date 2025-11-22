import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import DetectionHistoryPage from './pages/DetectionHistoryPage'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<DetectionHistoryPage />} />
      </Routes>
    </Router>
  )
}

export default App