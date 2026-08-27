// src/components/RepoRail.tsx —— §3.5 右栏：作者卡 + 同类推荐；推荐失败静默隐藏
import { useEffect, useState } from 'react'
import type { RepoCardData, RepoDetail } from '../api/types'
import { api } from '../api/client'
import AuthorCard from './AuthorCard'
import RelatedList from './RelatedList'
import './RepoRail.css'

type RailPhase =
  | { state: 'loading'; items: [] }
  | { state: 'ok'; items: RepoCardData[] }
  | { state: 'hidden'; items: [] }

export default function RepoRail({ repo }: { repo: RepoDetail }) {
  const [rail, setRail] = useState<RailPhase>({ state: 'loading', items: [] })

  useEffect(() => {
    let alive = true
    setRail({ state: 'loading', items: [] })
    api.related(repo.id)
      .then((items) => { if (alive) setRail({ state: 'ok', items }) })
      .catch(() => { if (alive) setRail({ state: 'hidden', items: [] }) })
    return () => { alive = false }
  }, [repo.id])

  return (
    <aside className="repo-rail">
      <div className="repo-rail-sticky">
        <AuthorCard ownerLogin={repo.owner_login} githubUrl={repo.github_url} />
        {rail.state === 'ok' && <RelatedList items={rail.items} />}
      </div>
    </aside>
  )
}
