// src/App.test.tsx —— 全路由冒烟：每条路由可渲染、无崩溃
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { api } from './api/client'
import { useAuthStore } from './store/authStore'

function renderAt(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><App /></MemoryRouter>)
}

describe('App 路由冒烟', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
    // App 挂载会做 /api/me 会话引导：冒烟测试统一按匿名会话处理
    vi.spyOn(api, 'me').mockResolvedValue(null)
  })
  afterEach(() => vi.restoreAllMocks())

  it('首页渲染顶栏与卡片流', async () => {
    renderAt('/')
    // 无封面卡：仓库名只在标题链接渲染一次
    expect((await screen.findAllByText('mini-agent')).length).toBeGreaterThanOrEqual(1)
    // 顶栏输入框与按钮共用 aria-label="搜索"，用 textbox 角色精确定位输入框
    expect(screen.getByRole('textbox', { name: '搜索' })).toBeInTheDocument()
  })

  it('搜索结果页', async () => {
    renderAt('/search?q=agent')
    expect(await screen.findByText('搜索「agent」· 共 1 个结果')).toBeInTheDocument()
  })

  it('仓库详情页', async () => {
    renderAt('/repo/1')
    expect(await screen.findByText('给 LLM Agent 的最小运行时，200 行可读完')).toBeInTheDocument()
  })

  it('投稿页未登录引导', async () => {
    renderAt('/submit')
    expect(await screen.findByText('用 GitHub 登录后即可推广你的仓库')).toBeInTheDocument()
  })

  it('个人主页', async () => {
    renderAt('/user/alice')
    expect(await screen.findByText('在写小而可读的系统软件。')).toBeInTheDocument()
  })

  it('未知路径回首页', async () => {
    renderAt('/no-such-page')
    expect((await screen.findAllByText('mini-agent')).length).toBeGreaterThanOrEqual(1)
  })

  it('提供跳转主内容链接', () => {
    renderAt('/')
    expect(screen.getByRole('link', { name: '跳转到主要内容' })).toHaveAttribute('href', '#main')
  })

  it('app-root 存在且页脚是其最后一个子元素', () => {
    renderAt('/')
    const root = document.querySelector('#app-root')
    expect(root).not.toBeNull()
    const children = Array.from(root!.children)
    expect(children.length).toBeGreaterThan(1)
    expect(children[children.length - 1]).toHaveClass('site-footer')
  })

  it('app-shell 样式契约：纵向弹性撑满，main 占满剩余空间', () => {
    const css = readFileSync(resolve(__dirname, 'App.css'), 'utf-8')
    expect(css).toContain('#app-root { display: flex; flex-direction: column; min-height: 100dvh; }')
    expect(css).toContain('#app-root main { flex: 1; }')
  })
})
