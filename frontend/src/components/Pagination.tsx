// src/components/Pagination.tsx —— B 站数字分页样式
import './Pagination.css'

interface Props {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <nav className="pagination" aria-label="分页">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          className={`page-item ${p === page ? 'is-active' : ''}`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
    </nav>
  )
}
