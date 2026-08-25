// src/pages/HomePage.tsx —— 规范 §7.1
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import CategoryBar from '../components/CategoryBar'
import EmptyState from '../components/EmptyState'
import ErrorBanner from '../components/ErrorBanner'
import RepoCard from '../components/RepoCard'
import { SkeletonGrid } from '../components/Skeleton'
import TopBar from '../components/TopBar'
import { useFeedStore } from '../store/feedStore'
import './HomePage.css'

export default function HomePage() {
  const { cards, loading, error, hasMore, load, loadMore } = useFeedStore()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    // 仅在从未加载过时拉取；空态/错误态由测试预置 state（page>0）不会被覆盖
    if (useFeedStore.getState().page === 0) void load(null)
  }, [load])

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
        {cards.length === 0 && loading && <SkeletonGrid count={8} />}
        {showEmpty && (
          <EmptyState title="这个分类还没有仓库" actionLabel="推广我的仓库" onAction={() => navigate('/submit')} />
        )}
        {cards.length > 0 && (
          <>
            <div className="repo-grid feed-enter">
              {cards.map((c) => <RepoCard key={c.id} data={c} />)}
            </div>
            {showSentinel && <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />}
            {loading && cards.length > 0 && <SkeletonGrid count={4} />}
          </>
        )}
      </main>
    </>
  )
}
