// src/components/ErrorBanner.tsx —— 规范 §8.2：轻量提示条
import './ErrorBanner.css'

interface Props {
  message: string
  onRetry: () => void
}

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="error-banner" role="alert">
      <span className="error-dot" aria-hidden="true" />
      <span className="error-msg">{message}</span>
      <button className="error-retry" onClick={onRetry}>重试</button>
    </div>
  )
}
