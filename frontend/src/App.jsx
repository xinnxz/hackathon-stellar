import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './landing/LandingPage'
import NewDashboard from './NewDashboard'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<NewDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
