// src/components/Pagination.tsx —— B 站数字分页样式；页数多时窗口化 + 省略号
import './Pagination.css'

interface Props {
  page: number
  total: number
  pageSize: number
  onChange: (page: number) => void
}

/** 窗口化页码：≤7 全显；否则 1 … n-1 n n+1 … N */
function pageItems(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const keep = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const n of keep) {
    if (prev && n - prev > 1) out.push('…')
    out.push(n)
    prev = n
  }
  return out
}

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <nav className="pagination" aria-label="分页">
      {pageItems(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="page-ellipsis" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            className={`page-item ${p === page ? 'is-active' : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}
    </nav>
  )
}
