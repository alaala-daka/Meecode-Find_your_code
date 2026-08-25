// src/App.tsx —— 路由骨架，页面任务逐个填入
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<div data-testid="page-home">首页占位</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
