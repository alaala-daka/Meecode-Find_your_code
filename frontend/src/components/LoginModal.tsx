// src/components/LoginModal.tsx —— 规范 §8.3 + 可达性：焦点圈定/Esc/关闭按钮/滚动锁
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import Button from './Button'
import loginLogo from '../assets/login-logo.png'
import './LoginModal.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LoginModal({ open, onClose }: Props) {
  const login = useAuthStore((s) => s.login)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const first = modalRef.current?.querySelector<HTMLElement>('button')
    first?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>('button')
        if (focusables.length === 0) return
        const firstF = focusables[0]
        const lastF = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === firstF) { e.preventDefault(); lastF.focus() }
        else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); firstF.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      prev?.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="login-mask" onClick={onClose}>
      <div
        className="login-modal"
        role="dialog"
        aria-modal="true"
        aria-label="登录"
        aria-describedby="login-tip"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <img className="login-logo-img" src={loginLogo} alt="" aria-hidden="true" />
        <p className="login-tip" id="login-tip">登录后即可收藏、点赞与推广仓库</p>
        <Button onClick={() => { login(); onClose() }}>用 GitHub 登录</Button>
        <button className="login-close" aria-label="关闭登录弹层" onClick={onClose}>✕</button>
      </div>
    </div>
  )
}
