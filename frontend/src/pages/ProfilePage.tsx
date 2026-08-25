// src/pages/ProfilePage.tsx —— 规范 §7.5
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import type { RepoCardData, UserProfile } from '../api/types'
import EmptyState from '../components/EmptyState'
import RepoCard from '../components/RepoCard'
import Tabs from '../components/Tabs'
import TopBar from '../components/TopBar'
import { useAuthStore } from '../store/authStore'
import './ProfilePage.css'

const TAB_ITEMS = [
  { key: 'repos', label: '我的仓库' },
  { key: 'favs', label: '收藏夹' },
  { key: 'history', label: '浏览历史' },
]

export default function ProfilePage() {
  const { login = '' } = useParams()
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user)
  const isMe = me?.login === login
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'repos'
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [editingBio, setEditingBio] = useState(false)
  const [lists, setLists] = useState<Record<'repos' | 'favs' | 'history', RepoCardData[]>>({ repos: [], favs: [], history: [] })

  const loadAll = useCallback(async () => {
    const [p, repos, favs, history] = await Promise.all([
      api.userProfile(login),
      api.userRepos(login),
      api.userFavorites(login),
      api.userHistory(login),
    ])
    setProfile(p)
    setLists({ repos, favs, history })
  }, [login])

  useEffect(() => { void loadAll() }, [loadAll])

  function switchTab(key: string) {
    params.set('tab', key)
    setParams(params, { replace: true })
  }

  async function saveBio(value: string) {
    setEditingBio(false)
    if (!profile || value === profile.bio) return
    setProfile({ ...profile, bio: value })
    await api.setBio(value)
  }

  async function delist(repo: RepoCardData) {
    if (!window.confirm(`确定下架「${repo.title}」吗？`)) return
    await api.delist(repo.id)
    void loadAll()
  }

  if (!profile) {
    return (<><TopBar /><main className="page-shell"><p className="profile-loading">加载中…</p></main></>)
  }

  const current = lists[tab as 'repos' | 'favs' | 'history'] ?? []
  const emptyText = tab === 'repos' ? '你还没有推广过仓库'
    : tab === 'favs' ? '还没有收藏' : '还没有浏览记录'

  return (
    <>
      <TopBar />
      <div className="profile-banner" aria-hidden="true" />
      <main className="page-shell profile-page">
        <header className="profile-head">
          <div className="profile-avatar" aria-label="头像">
            {profile.login.slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{profile.login}</h1>
            {editingBio ? (
              <input
                className="bio-input"
                defaultValue={profile.bio}
                autoFocus
                onBlur={(e) => void saveBio(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void saveBio((e.target as HTMLInputElement).value)}
                aria-label="签名"
              />
            ) : (
              <p className="profile-bio">
                {profile.bio || '这个人很懒，还没有写签名'}
                {isMe && (
                  <button className="bio-edit" aria-label="编辑签名" onClick={() => setEditingBio(true)}>✎</button>
                )}
              </p>
            )}
            <p className="profile-stats">
              <span>仓库 <b>{profile.repo_count}</b></span>
              <span>获赞星 <b>{profile.star_count}</b></span>
              <span>被收藏 <b>{profile.favorite_count}</b></span>
            </p>
          </div>
        </header>

        <Tabs items={TAB_ITEMS} active={tab} onChange={switchTab} />

        <div className="profile-tab-body" key={tab}>
          {current.length === 0 ? (
            <EmptyState title={emptyText}
              actionLabel={tab === 'repos' ? '推广我的仓库' : '去首页逛逛'}
              onAction={() => navigate(tab === 'repos' ? '/submit' : '/')} />
          ) : (
            <div className="repo-grid">
              {current.map((c) => (
                <div className="profile-card-wrap" key={c.id}>
                  <RepoCard data={c} />
                  {isMe && tab === 'repos' && (
                    <button className="delist-btn" onClick={() => void delist(c)}>下架</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
