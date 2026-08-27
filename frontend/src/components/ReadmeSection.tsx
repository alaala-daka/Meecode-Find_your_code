// src/components/ReadmeSection.tsx —— 五项改进 §3.5：自述文件（Markdown 完整渲染）
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { RepoTreeItem } from '../api/types'
import { api } from '../api/client'
import './ReadmeSection.css'

const README_RE = /^readme(\.(md|markdown|txt))?$/i

function findReadme(tree: RepoTreeItem[]): string | null {
  const hit = tree.find((n) => n.type === 'file' && README_RE.test(n.name))
  return hit?.path ?? null
}

/* 安全基线：不开 rehype-raw，原始 HTML 不会执行（决策 #9）；
   外链新窗口打开，相对路径资源不可达则退化为文本/占位符 */
const markdownComponents: Components = {
  a({ href, children }) {
    if (!href || !/^https?:\/\//.test(href)) return <span>{children}</span>
    return <a href={href} target="_blank" rel="noreferrer">{children}</a>
  },
  img({ alt, src }) {
    const url = typeof src === 'string' ? src : undefined
    if (!url || !/^https?:\/\//.test(url)) return <span>{alt || '[图片]'}</span>
    return <img src={url} alt={alt ?? ''} loading="lazy" />
  },
}

type Phase = 'loading' | 'ready' | 'missing'

interface Props {
  repoId: number
  tree: RepoTreeItem[]
}

export default function ReadmeSection({ repoId, tree }: Props) {
  const [phase, setPhase] = useState<Phase>('loading')
  const [content, setContent] = useState('')
  const reqRef = useRef(0)

  useEffect(() => {
    const path = findReadme(tree)
    if (!path) { setPhase('missing'); return }
    const req = ++reqRef.current
    setPhase('loading')
    api.repoFile(repoId, path)
      .then((f) => {
        if (req !== reqRef.current) return
        setContent(f.content)
        setPhase('ready')
      })
      .catch(() => {
        if (req === reqRef.current) setPhase('missing')
      })
  }, [repoId, tree])

  return (
    <section className="readme-section" aria-label="自述文件">
      <h2 className="readme-section-title">自述文件</h2>
      {phase === 'loading' && null}
      {phase === 'missing' && <p className="readme-section-empty">暂无自述</p>}
      {phase === 'ready' && (
        <div className="readme-section-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>
        </div>
      )}
    </section>
  )
}
