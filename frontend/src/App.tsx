// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ProfilePage from './pages/ProfilePage'
import RepoPage from './pages/RepoPage'
import SearchPage from './pages/SearchPage'
import SubmitPage from './pages/SubmitPage'
import SiteFooter from './components/SiteFooter'
import './App.css'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">跳转到主要内容</a>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/repo/:id" element={<RepoPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/user/:login" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </>
  )
}
