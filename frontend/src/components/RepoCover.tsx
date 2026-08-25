// src/components/RepoCover.tsx —— 规范 §6.4 封面：语言取色 + 仓库名 + ≤3 topics
import { capsuleBg, capsuleText, coverBase, languageColor, TEXT_ON_COVER } from '../theme/languageColors'
import './RepoCover.css'

interface Props {
  name: string
  language: string | null
  topics: string[]
  coverUrl?: string | null
  className?: string
}

// 长名拆两行：≤14 单行；否则取前 12 字符（已以 '-' 结尾则不重复追加）与剩余部分
function splitName(name: string): [string, string?] {
  if (name.length <= 14) return [name]
  const head = name.slice(0, 12)
  return [head.endsWith('-') ? head : head + '-', name.slice(12)]
}

export default function RepoCover({ name, language, topics, coverUrl, className }: Props) {
  if (coverUrl) {
    return <img className={`repo-cover repo-cover-img ${className ?? ''}`} src={coverUrl} alt={name} />
  }
  const base = coverBase(language)
  const accent = languageColor(language)
  const [line1, line2] = splitName(name)
  const shown = topics.slice(0, 3)
  return (
    <svg className={`repo-cover ${className ?? ''}`} viewBox="0 0 672 378" role="img" aria-label={name}>
      <rect width="672" height="378" fill={base} />
      <circle className="cover-shape" cx="560" cy="80" r="140" fill={accent} opacity="0.55" />
      <circle cx="90" cy="330" r="60" fill={accent} opacity="0.3" />
      <text x="48" y="160" fontSize="40" fontWeight="500" fill={TEXT_ON_COVER}>{line1}</text>
      {line2 && <text x="48" y="212" fontSize="40" fontWeight="500" fill={TEXT_ON_COVER}>{line2}</text>}
      {shown.map((t, i) => (
        <g key={t}>
          <rect x={48 + i * 150} y="286" width="138" height="40" rx="12" fill={capsuleBg(accent)} />
          <text x={48 + i * 150 + 69} y="312" fontSize="22" textAnchor="middle" fill={capsuleText(accent)}>{t}</text>
        </g>
      ))}
    </svg>
  )
}
