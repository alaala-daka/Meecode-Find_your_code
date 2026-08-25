// src/components/RepoCard.tsx —— 规范 §6.4
import { Link } from 'react-router-dom'
import type { RepoCardData } from '../api/types'
import { formatCount, formatTime } from '../utils/format'
import { languageColor } from '../theme/languageColors'
import RepoCover from './RepoCover'
import './RepoCard.css'

export default function RepoCard({ data }: { data: RepoCardData }) {
  return (
    <div className="repo-card">
      <Link className="repo-card-cover" to={`/repo/${data.id}`} aria-label={data.title}>
        <RepoCover name={data.title} language={data.language} topics={data.topics} coverUrl={data.cover_url} />
        <span className={`source-badge badge-${data.source}`}>
          {data.source === 'submitted' ? '投稿' : '采集'}
        </span>
        <span className="star-pill">
          <span className="star-icon" aria-hidden="true">★</span>
          <span>{formatCount(data.stars)}</span>
          <span className="lang-dot" style={{ backgroundColor: languageColor(data.language) }} aria-hidden="true" />
        </span>
        <span className="hover-mask">
          <span className="mask-stat">▶ <span>{formatCount(data.views)}</span></span>
          <span className="mask-stat">♥ <span>{formatCount(data.likes)}</span></span>
        </span>
      </Link>
      <div className="repo-card-info">
        <h3 className="repo-card-title">
          <Link to={`/repo/${data.id}`}>{data.title}</Link>
        </h3>
        <p className="repo-card-tagline">{data.tagline_zh}</p>
        <p className="repo-card-meta">
          <span className="meta-author">{data.owner_login}</span>
          <span className="meta-date">· {formatTime(data.published_at)}</span>
        </p>
      </div>
    </div>
  )
}
