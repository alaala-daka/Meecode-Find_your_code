// src/pages/SearchPage.tsx —— 规范 §7.2：横向富卡片 + 排序 tab + 分页
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { RepoCardData, SortKey } from '../api/types'
import Capsule from '../components/Capsule'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import RepoCover from '../components/RepoCover'
import Tabs from '../components/Tabs'
import TopBar from '../components/TopBar'
import { languageColor } from '../theme/languageColors'
import { formatCount, formatTime } from '../utils/format'
import './SearchPage.css'

const PAGE_SIZE = 8
const SORTS = [
  { key: 'default', label: '综合' },
  { key: 'newest', label: '最新' },
  { key: 'stars', label: '最多 star' },
]

function Highlight({ text, kw }: { text: string; kw: string }) {
  const i = text.toLowerCase().indexOf(kw.toLowerCase())
  if (i < 0 || !kw) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + kw.length)}</mark>
      {text.slice(i + kw.length)}
    </>
  )
}

export default function SearchPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const [sort, setSort] = useState<SortKey>('default')
  const [page, setPage] = useState(1)
  const [cards, setCards] = useState<RepoCardData[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const run = useCallback(async () => {
    if (!q) return
    setLoading(true)
    const res = await api.search(q, sort, page)
    setCards(res.cards)
    setTotal(res.total)
    setLoading(false)
  }, [q, sort, page])

  useEffect(() => { void run() }, [run])

  return (
    <>
      <TopBar />
      <main className="page-shell search-page">
        <p className="search-summary">搜索「{q}」· 共 {total} 个结果</p>
        <Tabs items={SORTS.map((s) => ({ key: s.key, label: s.label }))} active={sort}
          onChange={(k) => { setSort(k as SortKey); setPage(1) }} />
        {loading && <p className="search-loading">搜索中…</p>}
        {!loading && total === 0 && (
          <EmptyState title="没有找到相关仓库，换个关键词试试" actionLabel="推广我的仓库" onAction={() => navigate('/submit')} />
        )}
        {!loading && cards.length > 0 && (
          <ul className="search-list">
            {cards.map((c) => {
              const lang = languageColor(c.language)
              return (
                <li key={c.id} className="search-card" data-testid={`search-card-${c.id}`}>
                  <Link className="search-cover" to={`/repo/${c.id}`} aria-label={c.title}>
                    <RepoCover name={c.title} language={c.language} topics={c.topics} coverUrl={c.cover_url} />
                  </Link>
                  <div className="search-info">
                    <h3 className="search-title">
                      <Link to={`/repo/${c.id}`}><Highlight text={c.title} kw={q} /></Link>
                    </h3>
                    <p className="search-tagline">{c.tagline_zh}</p>
                    <p className="search-meta">
                      <span>{c.owner_login}</span>
                      <span>· {formatTime(c.published_at)}</span>
                      <span className="search-stars">★ {formatCount(c.stars)}</span>
                      {c.language && (
                        <span className="search-lang">
                          <span className="lang-dot" style={{ backgroundColor: lang }} aria-hidden="true" />
                          {c.language}
                        </span>
                      )}
                    </p>
                    <Capsule label={c.category} bg="var(--brand_blue_thin)" fg="var(--brand_blue)" />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
      </main>
    </>
  )
}
