// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import RepoPage from './pages/RepoPage'
import SearchPage from './pages/SearchPage'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/repo/:id" element={<RepoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
