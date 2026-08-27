// src/components/ReadmeSection.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import type { RepoTreeItem } from '../api/types'
import ReadmeSection from './ReadmeSection'

const TREE_WITH_README: RepoTreeItem[] = [
  { name: 'README.md', path: 'README.md', type: 'file' },
  { name: 'src', path: 'src', type: 'dir', children: [] },
]

describe('ReadmeSection', () => {
  afterEach(() => vi.restoreAllMocks())

  it('定位 README.md 并完整渲染 Markdown（GFM 标题）', async () => {
    render(<ReadmeSection repoId={1} tree={TREE_WITH_README} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'mini-agent' })).toBeInTheDocument()
    expect(screen.getByText(/200 行的 LLM Agent 运行时/)).toBeInTheDocument()
  })

  it('树中没有 README：立即显示「暂无自述」且不发请求', async () => {
    const { api } = await import('../api/client')
    const spy = vi.spyOn(api, 'repoFile')
    render(<ReadmeSection repoId={1} tree={[{ name: 'main.py', path: 'main.py', type: 'file' }]} />)
    expect(screen.getByText('暂无自述')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it('读取失败同样降级为「暂无自述」', async () => {
    const { api } = await import('../api/client')
    vi.spyOn(api, 'repoFile').mockRejectedValueOnce(new Error('boom'))
    render(<ReadmeSection repoId={1} tree={TREE_WITH_README} />)
    expect(await screen.findByText('暂无自述')).toBeInTheDocument()
  })
})
