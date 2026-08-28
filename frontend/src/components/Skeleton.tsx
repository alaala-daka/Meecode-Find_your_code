// src/components/Skeleton.tsx —— 加载骨架：与线框卡片同构（标题行 + 两行文本），微光扫过
import './Skeleton.css'

export function CardSkeleton() {
  return (
    <div className="card-skeleton" aria-hidden="true">
      <div className="sk-line shimmer sk-title" />
      <div className="sk-line shimmer" style={{ width: '90%' }} />
      <div className="sk-line shimmer short" style={{ width: '55%' }} />
    </div>
  )
}

export function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="repo-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}
