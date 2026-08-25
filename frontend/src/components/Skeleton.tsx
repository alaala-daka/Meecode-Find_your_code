// src/components/Skeleton.tsx —— 规范 §6.9：卡片形骨架 + 微光
import './Skeleton.css'

export function CardSkeleton() {
  return (
    <div className="card-skeleton" aria-hidden="true">
      <div className="sk-cover shimmer" />
      <div className="sk-line shimmer" style={{ width: '90%' }} />
      <div className="sk-line shimmer short" style={{ width: '50%' }} />
    </div>
  )
}

export function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="repo-grid">
      {Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}
