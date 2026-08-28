// src/pages/HomePage.tsx —— 规范 §7.1：「全部」页左上 2×2 轮播大卡；分区页横跨三列「今日精选」
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CategoryBar from '../components/CategoryBar'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import FeaturedHero, { HERO_MIN_ROTATE, pickHeroItems } from '../components/FeaturedHero'
import FeaturedStrip, { pickStripItem } from '../components/FeaturedStrip'
import RepoCard from '../components/RepoCard'
import { SkeletonGrid } from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { useFeedStore } from '../store/feedStore'
import type { RepoCardData } from '../api/types'
import emptyCategory from '../assets/empty-category.png'
import './HomePage.css'

export default function HomePage() {
  const { cards, loading, error, hasMore, load, loadMore } = useFeedStore()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const cat = params.get('cat')

  // 精选只按各分类「首屏数据」锁定一次，避免翻页加载导致轮播内容中途变化
  const [featured, setFeatured] = useState<RepoCardData[]>([])
  const featuredFor = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    if (cards.length === 0 || featuredFor.current === cat) return
    featuredFor.current = cat
    if (cat) {
      const item = pickStripItem(cards)
      setFeatured(item ? [item] : [])
    } else {
      setFeatured(pickHeroItems(cards))
    }
  }, [cards, cat])

  // 精选仓库从普通网格去重，首屏不重复曝光
  const gridCards = useMemo(() => {
    if (featured.length === 0) return cards
    const shown = !cat && featured.length < HERO_MIN_ROTATE ? featured.slice(0, 1) : featured
    const ids = new Set(shown.map((f) => f.id))
    return cards.filter((c) => !ids.has(c.id))
  }, [cards, featured, cat])

  useEffect(() => {
    const s = useFeedStore.getState()
    // 首次加载，或 URL 分类与 store 不一致时重载（预置空态/错误态的测试 page>0 且 category 一致，不会误触发）
    if (s.page === 0 || s.category !== cat) void load(cat)
  }, [cat, load])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMore()
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, cards.length, hasMore])

  const showEmpty = !loading && !error && cards.length === 0 && !hasMore
  const showSentinel = hasMore && cards.length > 0

  return (
    <>
      <TopBar />
      <CategoryBar />
      <h1 className="visually-hidden">觅码 · 发现潜力开源仓库</h1>
      <main id="main" className="page-shell">
        {error && (
          <ErrorBanner message="加载失败，请重试" onRetry={() => void load(useFeedStore.getState().category)} />
        )}
        {cards.length === 0 && loading && <SkeletonGrid count={10} />}
        {showEmpty && (
          <EmptyState title="这个分类还没有仓库" actionLabel="推广我的仓库" onAction={() => navigate('/submit')} image={emptyCategory} />
        )}
        {cards.length > 0 && (
          <>
            <div className="repo-grid feed-enter">
              {!cat && featured.length > 0 && <FeaturedHero items={featured} />}
              {cat && featured.length > 0 && <FeaturedStrip data={featured[0]} />}
              {gridCards.map((c) => <RepoCard key={c.id} data={c} />)}
            </div>
            {showSentinel && <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />}
            {loading && cards.length > 0 && <SkeletonGrid count={5} />}
          </>
        )}
      </main>
    </>
  )
}
