// src/pages/RepoPage.tsx —— 规范 §7.3
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { RepoDetail, RepoFile, RepoTreeItem } from '../api/types'
import Button from '../components/Button'
import Capsule from '../components/Capsule'
import CodeView from '../components/CodeView'
import EmptyState from '../components/EmptyState'
import FileTree from '../components/FileTree'
import LoginModal from '../components/LoginModal'
import Tabs from '../components/Tabs'
import TopBar from '../components/TopBar'
import { useAuthStore } from '../store/authStore'
import { capsuleBg, capsuleText, languageColor } from '../theme/languageColors'
import { formatCount, formatTime } from '../utils/format'
// 显式导入所复用样式（.source-badge）的定义文件，避免依赖打包顺序
import '../components/RepoCard.css'
import explainPlaceholder from '../assets/explain-placeholder.png'
import './RepoPage.css'

const TAB_ITEMS = [
  { key: 'files', label: '文件预览' },
  { key: 'explain', label: '仓库解读' },
]

export default function RepoPage() {
  const { id } = useParams()
  const repoId = Number(id)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [detail, setDetail] = useState<RepoDetail | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState('files')
  const [tree, setTree] = useState<RepoTreeItem[]>([])
  const [file, setFile] = useState<RepoFile | null>(null)
  const [fileError, setFileError] = useState(false)
  const [liked, setLiked] = useState(false)
  const [faved, setFaved] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const fileReqRef = useRef(0) // 文件请求令牌：丢弃过期响应，防切仓库/快速点文件时旧响应覆盖

  useEffect(() => {
    let alive = true
    api.repo(repoId)
      .then((d) => { if (!alive) return; setDetail(d) })
      .catch(() => { if (alive) setLoadError(true) })
    api.repoTree(repoId).then((t) => {
      if (!alive) return
      setTree(t)
      const first = t.find((n) => n.type === 'file')
      if (first) void selectFile(first.path)
    })
    api.myLikes().then((ids) => alive && setLiked(ids.includes(repoId)))
    api.myFavorites().then((ids) => alive && setFaved(ids.includes(repoId)))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId])

  async function selectFile(path: string) {
    const req = ++fileReqRef.current
    setFileError(false)
    try {
      const f = await api.repoFile(repoId, path)
      if (req !== fileReqRef.current) return // 已有更新的请求，丢弃过期响应
      setFile(f)
    } catch {
      if (req !== fileReqRef.current) return
      setFileError(true)
      setFile(null)
    }
  }

  function gate(fn: () => void) {
    if (user) fn()
    else setLoginOpen(true)
  }

  async function toggleLike() {
    const next = !liked
    setLiked(next)
    await api.interact(repoId, 'like', next)
    setDetail((d) => d ? { ...d, likes: d.likes + (next ? 1 : -1) } : d)
  }

  async function toggleFav() {
    const next = !faved
    setFaved(next)
    await api.interact(repoId, 'favorite', next)
  }

  if (loadError) {
    return (
      <>
        <TopBar />
        <main className="page-shell">
          <EmptyState title="仓库不存在或已下架" actionLabel="回首页" onAction={() => navigate('/')} />
        </main>
      </>
    )
  }

  if (!detail) {
    return (<><TopBar /><main className="page-shell"><p className="repo-loading">加载中…</p></main></>)
  }

  return (
    <>
      <TopBar />
      <main className="page-shell repo-page">
        <section className="repo-head" style={{ borderTop: `3px solid ${languageColor(detail.language)}` }}>
          <div className="repo-head-main">
            <h1 className="repo-name">{detail.title}</h1>
            <p className="repo-tagline">{detail.tagline_zh}</p>
            <p className="repo-meta">
              <span className="repo-stars">★ {formatCount(detail.stars)}</span>
              {detail.language && (
                <span className="repo-lang">
                  <span className="lang-dot" style={{ backgroundColor: languageColor(detail.language) }} aria-hidden="true" />
                  {detail.language}
                </span>
              )}
              <span>浏览 {formatCount(detail.views)}</span>
              <span>{formatTime(detail.published_at)}发布</span>
              <span className={`source-badge badge-${detail.source}`}>
                {detail.source === 'submitted' ? '投稿' : '采集'}
              </span>
            </p>
            {detail.topics.length > 0 && (
              <p className="repo-topics">
                {detail.topics.map((t) => (
                  <Capsule key={t} label={t}
                    bg={capsuleBg(languageColor(detail.language))}
                    fg={capsuleText(languageColor(detail.language))} />
                ))}
              </p>
            )}
          </div>
          <div className="repo-head-actions">
            <a className="btn btn-secondary" href={detail.github_url} target="_blank" rel="noreferrer">去 GitHub ↗</a>
            <Button variant="ghost" className={`btn-fav ${faved ? 'is-on' : ''}`} onClick={() => gate(() => void toggleFav())}>
              {faved ? '已收藏' : '收藏'}
            </Button>
            <Button variant="ghost" className={`btn-like ${liked ? 'is-on' : ''}`} onClick={() => gate(() => void toggleLike())}>
              {liked ? '已点赞' : '点赞'}
            </Button>
          </div>
        </section>

        <Tabs items={TAB_ITEMS} active={tab} onChange={setTab} />

        <div className="repo-tab-body" key={tab}>
          {tab === 'files' && (
            <div className="repo-files">
              <FileTree tree={tree} current={file?.path ?? null} onSelect={(p) => void selectFile(p)} />
              {file && <CodeView file={file} githubUrl={detail.github_url} />}
              {fileError && (
                <p className="file-fallback">
                  文件预览失败，<a href={detail.github_url} target="_blank" rel="noreferrer">去 GitHub 查看 ↗</a>
                </p>
              )}
            </div>
          )}
          {tab === 'explain' && (
            <div className="explain-placeholder">
              <img className="explain-img" src={explainPlaceholder} alt="" aria-hidden="true" />
              <p className="explain-title">解读功能建设中</p>
              <p className="explain-sub">AI 将把这个仓库讲给中文开发者听（第 2 块规划）</p>
            </div>
          )}
        </div>

        <section className="repo-discussions">
          <h2 className="discussions-title">讨论</h2>
          {detail.discussions_open ? (
            <p className="discussions-body">评论区（giscus，后端就绪后接入）</p>
          ) : (
            <p className="discussions-closed">作者未开启讨论</p>
          )}
        </section>

        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      </main>
    </>
  )
}
