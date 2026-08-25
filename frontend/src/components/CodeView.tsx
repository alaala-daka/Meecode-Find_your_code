// src/components/CodeView.tsx —— 规范 §7.3：等宽 13px + 行号，纯文本
import type { RepoFile } from '../api/types'
import './CodeView.css'

export default function CodeView({ file, githubUrl }: { file: RepoFile; githubUrl: string }) {
  const lines = file.content.split('\n')
  return (
    <div className="code-view">
      <div className="code-head">
        <span className="code-path">{file.path}</span>
        <a className="code-gh-link" href={`${githubUrl}/blob/main/${file.path}`} target="_blank" rel="noreferrer">
          在 GitHub 查看 ↗
        </a>
      </div>
      <pre className="code-body" data-testid="code-content">
        {lines.map((line, i) => (
          <div key={i} className="code-line">
            <span className="code-ln">{i + 1}</span>
            <span className="code-text">{line || ' '}</span>
          </div>
        ))}
      </pre>
    </div>
  )
}
