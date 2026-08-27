// src/components/RelatedList.tsx —— 五项改进 §3.5 同类推荐（复用 RepoCard，纵列 ≤3）
import type { RepoCardData } from '../api/types'
import RepoCard from './RepoCard'
import './RelatedList.css'

interface Props {
  items: RepoCardData[]
}

export default function RelatedList({ items }: Props) {
  return (
    <section className="related-list" aria-label="同类推荐">
      <h2 className="related-list-title">同类推荐</h2>
      {items.length === 0 ? (
        <p className="related-list-empty">同分类暂无更多仓库</p>
      ) : (
        <ul className="related-list-cards">
          {items.map((r) => (
            <li key={r.id}><RepoCard data={r} /></li>
          ))}
        </ul>
      )}
    </section>
  )
}
