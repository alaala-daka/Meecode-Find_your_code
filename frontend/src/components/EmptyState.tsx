// src/components/EmptyState.tsx —— 规范 §6.10
import Button from './Button'
import './EmptyState.css'

interface Props {
  title: string
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({ title, actionLabel, onAction }: Props) {
  return (
    <div className="empty-state">
      <svg className="empty-icon" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
        <circle cx="21" cy="21" r="12" fill="none" stroke="currentColor" strokeWidth="3" />
        <line x1="30" y1="30" x2="40" y2="40" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="empty-title">{title}</p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  )
}
