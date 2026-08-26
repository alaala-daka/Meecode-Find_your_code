// src/pages/HomePage.tsx —— 规范 §7.1
import { useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CategoryBar from '../components/CategoryBar'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import FeatureBar from '../components/FeatureBar'
import RepoCard from '../components/RepoCard'
import { SkeletonGrid } from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { useFeedStore } from '../store/feedStore'
import emptyCategory from '../assets/empty-category.png'
import './HomePage.css'

export default function HomePage() {
  const { cards, loading, error, hasMore, load, loadMore } = useFeedStore()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const cat = params.get('cat')

  // 头条：当前页 star 最高的仓库，投稿优先（数据给定即确定，不随渲染抖动）
  const featured = useMemo(() => {
    if (cards.length === 0) return null
    const submitted = cards.filter((c) => c.source === 'submitted')
    const pool = submitted.length > 0 ? submitted : cards
    return pool.reduce((a, b) => (b.stars > a.stars ? b : a))
  }, [cards])

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
      <main className="page-shell">
        {error && cards.length === 0 && (
          <ErrorBanner message={error} onRetry={() => void load(useFeedStore.getState().category)} />
        )}
        {cards.length === 0 && loading && <SkeletonGrid count={10} />}
        {showEmpty && (
          <EmptyState title="这个分类还没有仓库" actionLabel="推广我的仓库" onAction={() => navigate('/submit')} image={emptyCategory} />
        )}
        {cards.length > 0 && (
          <>
            {featured && <FeatureBar data={featured} />}
            <div className="repo-grid feed-enter">
              {cards.map((c) => <RepoCard key={c.id} data={c} />)}
            </div>
            {showSentinel && <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />}
            {loading && cards.length > 0 && <SkeletonGrid count={5} />}
          </>
        )}
      </main>
    </>
  )
}
