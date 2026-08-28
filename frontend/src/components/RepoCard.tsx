// src/components/RepoCard.tsx —— 纸面墨线卡片：无封面，等宽标题 + 一句话卖点 + 元信息行（star/语言/日期）
import { Link } from 'react-router-dom'
import type { RepoCardData } from '../api/types'
import { formatCount, formatTime } from '../utils/format'
import { languageColor } from '../theme/languageColors'
import './RepoCard.css'

export default function RepoCard({ data }: { data: RepoCardData }) {
  return (
    <article className="repo-card">
      <div className="repo-card-top">
        <h3 className="repo-card-title">
          <Link to={`/repo/${data.id}`}>{data.title}</Link>
        </h3>
        <span className={`source-badge badge-${data.source}`}>
          {data.source === 'submitted' ? '投稿' : '采集'}
        </span>
      </div>
      <p className="repo-card-tagline">{data.tagline_zh}</p>
      <p className="repo-card-meta">
        <span className="meta-author">{data.owner_login}</span>
        <span className="meta-stars">
          <span className="star-icon" aria-hidden="true">★</span>
          {formatCount(data.stars)}
        </span>
        {data.language && (
          <span className="meta-lang">
            <span className="lang-dot" style={{ backgroundColor: languageColor(data.language) }} aria-hidden="true" />
            {data.language}
          </span>
        )}
        <span className="meta-date">{formatTime(data.published_at)}</span>
      </p>
    </article>
  )
}
