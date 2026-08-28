// src/components/FeaturedHero.tsx —— 「全部」页左上大推荐卡：2×2 近正方，5s 交叉淡入轮播（后台推送位，现取 star 最高仓库）
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { RepoCardData } from '../api/types'
import { formatCount, formatTime } from '../utils/format'
import { languageColor } from '../theme/languageColors'
import RepoCover from './RepoCover'
import './FeaturedHero.css'

const SLIDE_MS = 5000
export const HERO_MIN_ROTATE = 3
const HERO_MAX_ITEMS = 5

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function pickHeroItems(cards: RepoCardData[]): RepoCardData[] {
  const submitted = cards.filter((c) => c.source === 'submitted')
  const pool = submitted.length >= HERO_MIN_ROTATE ? submitted : cards
  return [...pool].sort((a, b) => b.stars - a.stars).slice(0, HERO_MAX_ITEMS)
}

export default function FeaturedHero({ items }: { items: RepoCardData[] }) {
  const rotating = items.length >= HERO_MIN_ROTATE
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduced] = useState(prefersReducedMotion)
  const active = rotating ? index % items.length : 0
  const slides = rotating ? items : items.slice(0, 1)

  useEffect(() => {
    if (!rotating || reduced || paused) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % items.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [rotating, reduced, paused, index, items.length])

  return (
    <section
      className="featured-hero"
      aria-label="今日精选"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false)
      }}
    >
      <div className="hero-slides">
        {slides.map((d, i) => (
          <article key={d.id} className={`hero-slide ${i === active ? 'is-active' : ''}`} aria-hidden={i !== active}>
            <Link className="hero-cover" to={`/repo/${d.id}`} aria-label={d.title}>
              <RepoCover name={d.title} language={d.language} topics={d.topics} coverUrl={d.cover_url}
                loading={i === 0 ? 'eager' : 'lazy'} crop />
            </Link>
            <div className="hero-info">
              <p className="hero-eyebrow">
                <span className="hero-flag">今日精选</span>
                <span className="hero-cat">{d.category}</span>
              </p>
              <h2 className="hero-title">
                <Link to={`/repo/${d.id}`}>{d.title}</Link>
              </h2>
              <p className="hero-tagline">{d.tagline_zh}</p>
              <p className="hero-meta">
                <span className="hero-stars">★ {formatCount(d.stars)}</span>
                <span className="hero-lang">
                  <span className="lang-dot" style={{ backgroundColor: languageColor(d.language) }} aria-hidden="true" />
                  {d.language ?? '多语言'}
                </span>
                <span className="hero-author">{d.owner_login}</span>
                <span>{formatTime(d.published_at)}</span>
              </p>
            </div>
          </article>
        ))}
      </div>
      {rotating && (
        <div className="hero-dots">
          {items.map((d, n) => (
            <button
              key={d.id}
              className={`hero-dot ${n === active ? 'is-active' : ''}`}
              aria-current={n === active}
              aria-label={`第 ${n + 1} 条，共 ${items.length} 条`}
              onClick={() => setIndex(n)}
            />
          ))}
        </div>
      )}
    </section>
  )
}
