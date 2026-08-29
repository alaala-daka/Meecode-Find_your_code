// src/components/IconAction.tsx —— 2026-08-28：改用 feedback 提供的 Like/Star 线性图标，并修复未点亮时缺 stroke 不显示的问题
import './IconAction.css'

/** 图形取自 feedback/Like1-Linear-32px.svg 与 feedback/Star1-Linear-32px.svg（Iconsax Linear，24 视窗） */
const GLYPH = {
  like: [
    'm7.48 18.35 3.1 2.4c.4.4 1.3.6 1.9.6h3.8c1.2 0 2.5-.9 2.8-2.1l2.4-7.3c.5-1.4-.4-2.6-1.9-2.6h-4c-.6 0-1.1-.5-1-1.2l.5-3.2c.2-.9-.4-1.9-1.3-2.2-.8-.3-1.8.1-2.2.7l-4.1 6.1',
    'M2.38 18.35v-9.8c0-1.4.6-1.9 2-1.9h1c1.4 0 2 .5 2 1.9v9.8c0 1.4-.6 1.9-2 1.9h-1c-1.4 0-2-.5-2-1.9Z',
  ],
  favorite: [
    'm13.73 3.51 1.76 3.52c.24.49.88.96 1.42 1.05l3.19.53c2.04.34 2.52 1.82 1.05 3.28l-2.48 2.48c-.42.42-.65 1.23-.52 1.81l.71 3.07c.56 2.43-.73 3.37-2.88 2.1l-2.99-1.77c-.54-.32-1.43-.32-1.98 0l-2.99 1.77c-2.14 1.27-3.44.32-2.88-2.1l.71-3.07c.13-.58-.1-1.39-.52-1.81l-2.48-2.48c-1.46-1.46-.99-2.94 1.05-3.28l3.19-.53c.53-.09 1.17-.56 1.41-1.05l1.76-3.52c.96-1.91 2.52-1.91 3.47 0Z',
  ],
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
  const size = kind === 'favorite' ? 28 : 26 // 星形视窗内占比略小，等比放大与点赞对齐
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
        {GLYPH[kind].map((d, i) => (
          <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      {count !== undefined && <span className="icon-action-count">{count}</span>}
    </button>
  )
}
