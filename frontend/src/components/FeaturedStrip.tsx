// src/components/FeaturedStrip.tsx —— 分区页「今日精选」：横跨三列的单仓库条卡，每日一换、不轮播
import { Link } from 'react-router-dom'
import type { RepoCardData } from '../api/types'
import { formatCount, formatTime } from '../utils/format'
import { languageColor } from '../theme/languageColors'
import RepoCover from './RepoCover'
import './Button.css'
import './FeaturedStrip.css'

export function pickStripItem(cards: RepoCardData[]): RepoCardData | null {
  if (cards.length === 0) return null
  const sorted = [...cards].sort((a, b) => b.stars - a.stars)
  const day = Math.floor(Date.now() / 86400000)
  return sorted[day % sorted.length]
}

export default function FeaturedStrip({ data }: { data: RepoCardData }) {
  return (
    <section className="featured-strip" aria-label="今日精选">
      <Link className="strip-cover" to={`/repo/${data.id}`} aria-label={data.title} tabIndex={-1}>
        <RepoCover name={data.title} language={data.language} topics={data.topics} coverUrl={data.cover_url} loading="eager" crop />
      </Link>
      <div className="strip-info">
        <p className="strip-eyebrow">
          <span className="strip-flag">今日精选</span>
          <span className="strip-note">每日更新</span>
        </p>
        <h2 className="strip-title">
          <Link to={`/repo/${data.id}`}>{data.title}</Link>
        </h2>
        <p className="strip-tagline">{data.tagline_zh}</p>
        <p className="strip-meta">
          <span className="strip-stars">★ {formatCount(data.stars)}</span>
          <span className="strip-lang">
            <span className="lang-dot" style={{ backgroundColor: languageColor(data.language) }} aria-hidden="true" />
            {data.language ?? '多语言'}
          </span>
          <span className="strip-author">{data.owner_login}</span>
          <span>浏览 {formatCount(data.views)}</span>
          <span>{formatTime(data.published_at)}</span>
        </p>
      </div>
      <Link className="btn btn-primary strip-action" to={`/repo/${data.id}`}>看看这个仓库</Link>
    </section>
  )
}
