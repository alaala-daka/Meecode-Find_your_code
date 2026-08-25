// src/components/Button.tsx —— 规范 §6.6
import type { ButtonHTMLAttributes } from 'react'
import './Button.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  loading?: boolean
}

export default function Button({ variant = 'primary', loading = false, children, disabled, ...rest }: Props) {
  return (
    <button
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {loading ? '处理中…' : children}
    </button>
  )
}
