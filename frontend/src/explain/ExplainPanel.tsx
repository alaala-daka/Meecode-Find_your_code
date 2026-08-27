/** 仓库解读面板:进入 tab 即自动以仓库为根建图(spec §5.2)。
 * 编排自原型 WorkspacePage——去除输入阶段与页面装饰,图引擎/面板原样复用。 */
import { useCallback, useEffect, useState } from 'react'
import type { RepoDetail } from '../api/types'
import { api } from './api/client'
import { GraphCanvas } from './components/GraphCanvas'
import { PracticeBar } from './components/PracticeBar'
import { SettingsPanel } from './components/SettingsPanel'
import { Toasts } from './components/Toasts'
import { ReaderPanel } from './components/reader/ReaderPanel'
import { openReaderFromTopbar } from './graph/controller'
import { useGraphStore } from './store/graphStore'
import { useReaderStore } from './store/readerStore'
import { useSessionStore } from './store/sessionStore'
import { useUiStore } from './store/uiStore'
import './explain-tokens.css'
import './explain.css'

type Stage = 'loading' | 'graph' | 'error'

/** https://github.com/owner/repo(.git) → owner/repo */
export function repoFullName(githubUrl: string): string {
  const raw = githubUrl.trim()
  const path = raw
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '')
  return path
}

interface Props {
  repo: RepoDetail
}

export default function ExplainPanel({ repo }: Props) {
  const [stage, setStage] = useState<Stage>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const full_name = repoFullName(repo.github_url)

  const rootId = useGraphStore((s) => s.rootId)
  const path = useSessionStore((s) => s.path)
  const mode = useSessionStore((s) => s.mode)
  const enterPractice = useSessionStore((s) => s.enterPractice)
  const resetSession = useSessionStore((s) => s.resetSession)
  const resetGraph = useGraphStore((s) => s.reset)
  const toggleSettings = useUiStore((s) => s.toggleSettings)
  const readerOpen = useReaderStore((s) => s.open)

  const build = useCallback(
    async (fullName: string, branch: string | null) => {
      setStage('loading')
      setErrorMsg('')
      useReaderStore.getState().reset()
      resetGraph()
      resetSession()
      try {
        const sessionId = await useSessionStore.getState().ensureSession()
        const result = await api.repoRoot(sessionId, { full_name: fullName, default_branch: branch })
        useGraphStore.getState().setRoot(result.node)
        if (result.children.length > 0) {
          useGraphStore.getState().addChildren(result.node.id, result.children, result.edges)
        }
        setStage('graph')
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : '解读服务暂不可用')
        setStage('error')
      }
    },
    [resetGraph, resetSession],
  )

  useEffect(() => {
    void build(full_name, repo.default_branch || null)
  }, [build, full_name, repo.default_branch])

  return (
    <div className="explain-root">
      {stage === 'loading' && (
        <div className="explain-loading" role="status" aria-label="正在生成仓库解读">
          <p className="explain-loading-title">AI 正在阅读这个仓库…</p>
          <p className="explain-loading-sub">拉取 README 与目录结构，生成解读图</p>
        </div>
      )}
      {stage === 'error' && (
        <div className="explain-error" role="alert">
          <p className="explain-error-title">解读服务暂不可用</p>
          <p className="explain-error-sub">{errorMsg}</p>
          <button className="explain-retry" onClick={() => void build(full_name, repo.default_branch || null)}>
            重试
          </button>
        </div>
      )}
      {stage === 'graph' && rootId && (
        <>
          <div className="explain-toolbar">
            {mode === 'explore' && (
              <button
                className="explain-tool-btn"
                onClick={enterPractice}
                disabled={path.length === 0}
                title={path.length === 0 ? '先展开几个节点，再来练习' : '沿着你的探索轨迹回忆'}
              >
                练习模式
              </button>
            )}
            <button className="explain-tool-btn" onClick={toggleSettings} aria-label="设置">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M12 2.8v3M12 18.2v3M21.2 12h-3M5.8 12h-3M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1M18.5 18.5l-2.1-2.1M7.6 7.6L5.5 5.5" />
              </svg>
            </button>
            <button
              className={`explain-tool-btn${readerOpen ? ' active' : ''}`}
              onClick={() => void openReaderFromTopbar()}
              aria-label={readerOpen ? '收起阅读器' : '展开阅读器'}
              aria-pressed={readerOpen}
              title={readerOpen ? '收起阅读器' : '展开阅读器'}
              disabled={mode === 'practice'}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6c-1.8-1.6-4.2-2-7-2v14c2.8 0 5.2.4 7 2 1.8-1.6 4.2-2 7-2V4c-2.8 0-5.2.4-7 2z" />
                <path d="M12 6v14" />
              </svg>
            </button>
          </div>
          {mode === 'practice' && <PracticeBar />}
          <GraphCanvas />
        </>
      )}
      <SettingsPanel />
      <ReaderPanel />
      <Toasts />
    </div>
  )
}
