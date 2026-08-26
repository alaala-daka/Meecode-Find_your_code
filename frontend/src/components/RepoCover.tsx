// src/components/RepoCover.tsx —— 封面即「一页代码」：文件名 + 行号栏 + 语言色代码指纹条
import {
  capsuleBg, capsuleText, coverBase, GUTTER_ON_COVER, languageColor, TEXT_ON_COVER,
} from '../theme/languageColors'
import './RepoCover.css'

interface Props {
  name: string
  language: string | null
  topics: string[]
  coverUrl?: string | null
  className?: string
  /** 图片来源加载策略：网格折下内容默认 lazy，首屏头条传 eager */
  loading?: 'lazy' | 'eager'
}

// 封面内 topic 胶囊字号：按估算宽度降档（胶囊定宽 138，防文字溢出画布）
function capsuleFontSize(t: string): number {
  const est = [...t].reduce((acc, ch) => acc + (ch.charCodeAt(0) > 255 ? 22 : 12), 0)
  return est > 132 ? 17 : 22
}

// 长名拆两行：≤14 单行；否则取前 12 字符（已以 '-' 结尾则不重复追加）与剩余部分
function splitName(name: string): [string, string?] {
  if (name.length <= 14) return [name]
  const head = name.slice(0, 12)
  return [head.endsWith('-') ? head : head + '-', name.slice(12)]
}

const BAR_COUNT = 5
const BAR_Y0 = 150
const BAR_STEP = 28
const BAR_OPACITY = [0.9, 0.5, 0.75, 0.45, 0.65]

// 代码指纹：条宽与缩进由仓库名哈希推导——同仓库同图，不同仓库彼此不同
interface Bar { y: number; x: number; w: number; opacity: number }
function codeBars(name: string): Bar[] {
  const bars: Bar[] = []
  for (let i = 0; i < BAR_COUNT; i += 1) {
    const c = name.charCodeAt(i % name.length) || 97
    const w = 140 + ((c * 31 + i * 97) % 380)
    const indent = (c + i * 7) % 3 === 0 ? 36 : 0
    bars.push({ y: BAR_Y0 + i * BAR_STEP, x: 72 + indent, w, opacity: BAR_OPACITY[i] })
  }
  return bars
}

export default function RepoCover({ name, language, topics, coverUrl, className, loading }: Props) {
  if (coverUrl) {
    return <img className={`repo-cover repo-cover-img ${className ?? ''}`} src={coverUrl} alt={name}
      width={672} height={378} loading={loading ?? 'lazy'} />
  }
  const base = coverBase(language)
  const accent = languageColor(language)
  const [line1, line2] = splitName(name)
  const shown = topics.slice(0, 3)
  const bars = codeBars(name)
  const mono = { fontFamily: 'var(--font-mono)' }
  return (
    <svg className={`repo-cover ${className ?? ''}`} viewBox="0 0 672 378" role="img" aria-label={name}>
      <rect width="672" height="378" fill={base} />
      <text x="48" y={line2 ? 76 : 96} fontSize={line2 ? 38 : 42} fontWeight="600"
        fill={TEXT_ON_COVER} style={mono}>{line1}</text>
      {line2 && (
        <text x="48" y="120" fontSize="38" fontWeight="600" fill={TEXT_ON_COVER} style={mono}>{line2}</text>
      )}
      <line x1="64" y1="140" x2="64" y2="288" stroke={GUTTER_ON_COVER} strokeWidth="1" opacity="0.6" />
      {bars.map((b, i) => (
        <g key={i}>
          <text x="52" y={b.y + 13} fontSize="16" textAnchor="end" fill={GUTTER_ON_COVER} style={mono}>
            {i + 1}
          </text>
          <rect className={i === 0 ? 'cover-shape' : undefined} x={b.x} y={b.y} width={b.w}
            height="16" rx="8" fill={accent} opacity={b.opacity} />
        </g>
      ))}
      {shown.map((t, i) => (
        <g key={t}>
          <rect x={48 + i * 150} y="312" width="138" height="40" rx="12" fill={capsuleBg(accent)} />
          <text x={48 + i * 150 + 69} y="338" fontSize={capsuleFontSize(t)} textAnchor="middle" fill={capsuleText(accent)}>{t}</text>
        </g>
      ))}
    </svg>
  )
}
