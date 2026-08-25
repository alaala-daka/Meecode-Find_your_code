// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
