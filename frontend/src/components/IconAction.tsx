// src/components/IconAction.tsx —— 2026-08-27 五项改进 §3.4：心形点赞 / 五角星收藏
import './IconAction.css'

const GLYPH = {
  like: 'M12 21s-7.5-4.9-10-9.3C.6 8.2 2.6 4.5 6.2 4.1c2-.2 3.9.8 5 2.4h1.6c1.1-1.6 3-2.6 5-2.4 3.6.4 5.6 4.1 4.2 7.6C19.5 16.1 12 21 12 21z',
  favorite: 'M12 1.9l3.35 6.06 6.55 1.02-4.78 4.87.96 6.68L12 17.36l-6.08 3.17.96-6.68L2.1 8.98l6.55-1.02z',
} as const

const LABEL = { like: '点赞', favorite: '收藏' } as const

interface Props {
  kind: 'like' | 'favorite'
  on: boolean
  /** undefined/null 不渲染数字（favorites_count 后端就绪前的降级） */
  count?: number
  busy?: boolean
  onClick(): void
}

export default function IconAction({ kind, on, count, busy = false, onClick }: Props) {
  const size = kind === 'favorite' ? 29 : 26 // 五角星等比放大，上下顶缘与心形对齐（决策 #5）
  return (
    <button
      type="button"
      className={`icon-action kind-${kind}${on ? ' is-on' : ''}${busy ? ' is-busy' : ''}`}
      aria-label={LABEL[kind]}
      aria-pressed={on}
      disabled={busy}
      onClick={onClick}
    >
      {/* key=on：切换时重建 svg，让点亮弹动动画每次都会重播 */}
      <svg key={on ? 'on' : 'off'} className="icon-action-glyph" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <path d={GLYPH[kind]} fill="none" strokeWidth={2.2} strokeLinejoin="round" />
      </svg>
      {count !== undefined && <span className="icon-action-count">{count}</span>}
    </button>
  )
}
