// src/pages/RepoPage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { FIXTURE_USER } from '../api/fixtures'
import { useAuthStore } from '../store/authStore'
import RepoPage from './RepoPage'

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/repo/:id" element={<RepoPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RepoPage', () => {
  beforeEach(() => useAuthStore.setState({ user: null }))

  it('信息头：仓库名、卖点、元信息与去 GitHub', async () => {
    renderAt('/repo/1')
    expect(await screen.findByText('mini-agent')).toBeInTheDocument()
    expect(screen.getByText('给 LLM Agent 的最小运行时，200 行可读完')).toBeInTheDocument()
    // 实现文案为「去 GitHub ↗」（与 CodeView/降级链接一致），匹配需含箭头
    const gh = screen.getByText('去 GitHub ↗')
    expect(gh.closest('a')).toHaveAttribute('href', 'https://github.com/alice/mini-agent')
  })

  it('默认展示文件预览，可切换文件', async () => {
    renderAt('/repo/1')
    // README.md 同时出现在文件树与代码区文件名栏，故用 findAllByText
    expect((await screen.findAllByText('README.md')).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByTestId('code-content')).toHaveTextContent('200 行的 LLM Agent 运行时')
    await userEvent.click(screen.getAllByText('main.py')[0])
    expect(screen.getByTestId('code-content')).toHaveTextContent('from loop import run')
  })

  it('切换到解读占位', async () => {
    renderAt('/repo/1')
    await screen.findAllByText('README.md')
    await userEvent.click(screen.getByRole('tab', { name: '仓库解读' }))
    expect(screen.getByText('解读功能建设中')).toBeInTheDocument()
  })

  it('未登录点赞触发登录弹层', async () => {
    renderAt('/repo/2')
    await screen.findByText('tinyfetch')
    await userEvent.click(screen.getByRole('button', { name: '点赞' }))
    expect(screen.getByText('用 GitHub 登录')).toBeInTheDocument()
  })

  it('已登录点赞切换激活态', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    renderAt('/repo/2')
    await screen.findByText('tinyfetch')
    const btn = screen.getByRole('button', { name: '点赞' })
    await userEvent.click(btn)
    expect(btn).toHaveClass('is-on')
  })

  it('Discussions 未开启显示提示（fixture：偶数 id 未开启）', async () => {
    renderAt('/repo/2')
    await screen.findByText('tinyfetch')
    expect(screen.getByText('作者未开启讨论')).toBeInTheDocument()
  })
})
