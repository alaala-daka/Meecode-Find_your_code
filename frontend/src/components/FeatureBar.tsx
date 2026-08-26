// src/components/FeatureBar.tsx —— 首页头条「今日精选」：当前页 star 最高的投稿仓库
import { Link } from 'react-router-dom'
import type { RepoCardData } from '../api/types'
import { formatCount, formatTime } from '../utils/format'
import { languageColor } from '../theme/languageColors'
import RepoCover from './RepoCover'
// 显式导入所复用样式（.btn）的定义文件，避免依赖打包顺序
import './Button.css'
import './FeatureBar.css'

export default function FeatureBar({ data }: { data: RepoCardData }) {
  return (
    <section className="feature-bar" aria-label="今日精选">
      <Link className="feature-cover" to={`/repo/${data.id}`} aria-label={data.title} tabIndex={-1}>
        <RepoCover name={data.title} language={data.language} topics={data.topics} coverUrl={data.cover_url} />
      </Link>
      <div className="feature-info">
        <p className="feature-eyebrow">
          <span className="feature-flag">今日精选</span>
          <span className="feature-cat">{data.category}</span>
        </p>
        <h2 className="feature-title">
          <Link to={`/repo/${data.id}`}>{data.title}</Link>
        </h2>
        <p className="feature-tagline">{data.tagline_zh}</p>
        <p className="feature-meta">
          <span className="feature-stars">★ {formatCount(data.stars)}</span>
          <span className="feature-lang">
            <span className="lang-dot" style={{ backgroundColor: languageColor(data.language) }} aria-hidden="true" />
            {data.language ?? '多语言'}
          </span>
          <span className="feature-author">{data.owner_login}</span>
          <span>浏览 {formatCount(data.views)}</span>
          <span>{formatTime(data.published_at)}</span>
        </p>
      </div>
      <Link className="btn btn-primary feature-action" to={`/repo/${data.id}`}>看看这个仓库</Link>
    </section>
  )
}
