// src/components/LoginModal.tsx —— 规范 §8.3
import { useAuthStore } from '../store/authStore'
import Button from './Button'
import './LoginModal.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function LoginModal({ open, onClose }: Props) {
  const login = useAuthStore((s) => s.login)
  if (!open) return null
  return (
    <div className="login-mask" onClick={onClose}>
      <div className="login-modal" role="dialog" aria-label="登录" onClick={(e) => e.stopPropagation()}>
        <div className="login-logo" aria-hidden="true">觅</div>
        <p className="login-tip">登录后即可收藏、点赞与推广仓库</p>
        <Button onClick={() => { login(); onClose() }}>用 GitHub 登录</Button>
      </div>
    </div>
  )
}
