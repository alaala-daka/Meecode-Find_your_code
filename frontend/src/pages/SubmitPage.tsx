// src/pages/SubmitPage.tsx —— 规范 §7.4：三步向导
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { RepoCardData } from '../api/types'
import Button from '../components/Button'
import LoginModal from '../components/LoginModal'
import RepoCover from '../components/RepoCover'
import TopBar from '../components/TopBar'
import { useAuthStore } from '../store/authStore'
// 显式导入所复用样式的定义文件（.cat-pill/.source-badge），避免依赖打包顺序、兼容未来路由级代码分割
import '../components/CategoryBar.css'
import '../components/RepoCard.css'
import './SubmitPage.css'

const STEPS = ['选仓库', '编辑推广页', '发布']
const TAGLINE_MAX = 40

export default function SubmitPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [repos, setRepos] = useState<RepoCardData[]>([])
  const [picked, setPicked] = useState<RepoCardData | null>(null)
  const [cats, setCats] = useState<string[]>([])
  const [tagline, setTagline] = useState('')
  const [intro, setIntro] = useState('')
  const [category, setCategory] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    void api.myRepos().then(setRepos)
    void api.categories().then((cs) => { setCats(cs); setCategory(cs[0]) })
  }, [user])

  async function aiDraft() {
    if (!picked) return
    setDrafting(true)
    const draft = await api.aiDraft(picked.id)
    setTagline(draft.tagline_zh.slice(0, TAGLINE_MAX))
    setIntro(draft.intro_zh)
    setDrafting(false)
  }

  async function publish() {
    if (!picked || !tagline.trim()) return
    setPublishing(true)
    await api.submitRepo({
      full_name: picked.full_name,
      tagline_zh: tagline.trim(),
      intro_zh: intro,
      category,
      cover_url: null,
    })
    setPublishing(false)
    setStep(2)
  }

  if (!user) {
    return (
      <>
        <TopBar />
        <main className="page-shell submit-page">
          <div className="submit-login-guard">
            <p className="guard-title">用 GitHub 登录后即可推广你的仓库</p>
            <Button onClick={() => setLoginOpen(true)}>用 GitHub 登录</Button>
          </div>
          <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar />
      <main className="page-shell submit-page">
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s} className={`step ${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`}>
              <span className="step-dot" aria-hidden="true">{i < step ? '✓' : i + 1}</span>
              {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <section className="submit-section">
            <ul className="my-repos">
              {repos.map((r) => (
                <li key={r.id}>
                  <label className={`my-repo ${picked?.id === r.id ? 'is-picked' : ''}`}>
                    <input type="radio" name="pick" checked={picked?.id === r.id}
                      onChange={() => setPicked(r)} aria-label={r.title} />
                    <span className="my-repo-name">{r.title}</span>
                    <span className="my-repo-stars">★ {r.stars}</span>
                    <span className={`source-badge badge-${r.source}`}>
                      {r.source === 'submitted' ? '已投稿' : '已在觅码 · 认领'}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Button disabled={!picked} onClick={() => setStep(1)}>下一步</Button>
          </section>
        )}

        {step === 1 && picked && (
          <section className="submit-edit">
            <div className="edit-form">
              <label className="field">
                <span className="field-label">一句话卖点（必填，{TAGLINE_MAX} 字内）</span>
                <input value={tagline} maxLength={TAGLINE_MAX}
                  onChange={(e) => setTagline(e.target.value)} aria-label="一句话卖点" />
              </label>
              <label className="field">
                <span className="field-label">详细介绍</span>
                <textarea rows={6} value={intro} onChange={(e) => setIntro(e.target.value)} aria-label="详细介绍" />
              </label>
              <div className="field">
                <span className="field-label">分类</span>
                <div className="cat-pills">
                  {cats.map((c) => (
                    <button key={c} className={`cat-pill ${category === c ? 'is-active' : ''}`} onClick={() => setCategory(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="edit-actions">
                <Button variant="secondary" loading={drafting} onClick={() => void aiDraft()}>AI 帮我写</Button>
                <Button disabled={!tagline.trim()} loading={publishing} onClick={() => void publish()}>发布</Button>
              </div>
            </div>
            <div className="edit-preview">
              <p className="preview-label">卡片预览</p>
              <RepoCover name={picked.title} language={picked.language} topics={picked.topics} />
              <p className="preview-title">{picked.title}</p>
              <p className="preview-tagline">{tagline || '一句话卖点会显示在这里'}</p>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="submit-done">
            <p className="done-emoji" aria-hidden="true">🎉</p>
            <p className="done-title">已发布，进入首发曝光窗口</p>
            <p className="done-sub">72 小时内你的仓库会获得加权与保底曝光</p>
            <Button onClick={() => navigate(`/user/${user.login}`)}>查看我的主页</Button>
          </section>
        )}
      </main>
    </>
  )
}
