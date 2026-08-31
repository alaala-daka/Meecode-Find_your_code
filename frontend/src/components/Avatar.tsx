// src/components/Avatar.tsx —— 统一头像：有 avatar_url 用其图，否则用觅码品牌默认头像，加载失败回退默认
import { useState } from 'react'
import avatarDefault from '../assets/avatar-default.png'
import './Avatar.css'

interface Props {
  login: string
  avatarUrl?: string
  className?: string
}

export default function Avatar({ login, avatarUrl, className }: Props) {
  const [failed, setFailed] = useState(false)
  const src = failed || !avatarUrl ? avatarDefault : avatarUrl
  return (
    <span className={className ? `avatar ${className}` : 'avatar'} role="img" aria-label={`${login} 的头像`}>
      <img
        className="avatar-img"
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </span>
  )
}
