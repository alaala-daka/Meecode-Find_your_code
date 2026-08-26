// src/components/TopBar.tsx —— 规范 §6.2、§8.3（未登录触达收藏/投稿/历史先弹登录）
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import LoginModal from './LoginModal'
import historyIcon from '../assets/history-icon.png'
import './TopBar.css'

export default function TopBar() {
  const [q, setQ] = useState('')
  const [loginOpen, setLoginOpen] = useState(false)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  function submitSearch() {
    const kw = q.trim()
    if (kw) navigate(`/search?q=${encodeURIComponent(kw)}`)
  }

  function goSubmit() {
    if (user) navigate('/submit')
    else setLoginOpen(true)
  }

  function goHistory() {
    if (user) navigate(`/user/${user.login}?tab=history`)
    else setLoginOpen(true)
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-left">
          <Link className="logo" to="/" aria-label="觅码 首页">
            <span className="logo-mark" aria-hidden="true">
              <svg viewBox="0 0 32 32" width="32" height="32">
                <circle cx="14" cy="14" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <line x1="21" y1="21" x2="28" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="14" cy="14" r="2.5" fill="currentColor" />
              </svg>
            </span>
            <span className="logo-text">
              觅码
              <span className="logo-sub">Meecode</span>
            </span>
          </Link>
          <nav className="topbar-nav">
            <Link className="nav-item is-current" to="/">首页</Link>
          </nav>
        </div>
        <div className="topbar-search">
          <input
            className="search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            placeholder="搜索仓库、标签、一句话卖点"
            aria-label="搜索"
          />
          <button className="search-btn" onClick={submitSearch} aria-label="搜索按钮">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <line x1="11" y1="11" x2="14" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="topbar-right">
          <button className="icon-btn" aria-label="浏览历史" onClick={goHistory}>
            <img className="icon-img" src={historyIcon} alt="" aria-hidden="true" />
          </button>
          <button className="btn btn-primary btn-submit" onClick={goSubmit}>+ 推广我的仓库</button>
          {user ? (
            <Link className="avatar-sm" to={`/user/${user.login}`} aria-label="个人主页">
              {user.login.slice(0, 1).toUpperCase()}
            </Link>
          ) : (
            <button className="login-entry" onClick={() => setLoginOpen(true)}>登录</button>
          )}
        </div>
      </div>
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </header>
  )
}
