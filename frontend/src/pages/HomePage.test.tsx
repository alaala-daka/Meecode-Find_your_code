// src/pages/HomePage.test.tsx
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFeedStore } from '../store/feedStore'
import { mockIntersectionObserver } from '../test/mockIntersectionObserver'
import HomePage from './HomePage'

describe('HomePage', () => {
  beforeEach(() => {
    useFeedStore.setState({ cards: [], loading: false, error: null, hasMore: true, page: 0, category: null })
  })

  it('渲染卡片流', async () => {
    render(<HomePage />, { wrapper: MemoryRouter })
    // 仓库名同时出现在封面 SVG 与标题链接中，故用 findAllByText（同 Task 8 约定）
    expect(await screen.findAllByText('mini-agent')).not.toHaveLength(0)
    expect((await screen.findAllByText('tinyfetch')).length).toBeGreaterThanOrEqual(2)
  })

  it('哨兵进视口触发翻页', async () => {
    const io = mockIntersectionObserver()
    render(<HomePage />, { wrapper: MemoryRouter })
    await screen.findAllByText('mini-agent')
    expect(useFeedStore.getState().cards).toHaveLength(8)
    await act(async () => io.triggerEnter()) // act 包裹，避免外部状态更新警告
    await screen.findAllByText('wasm-notes')
    expect(useFeedStore.getState().cards).toHaveLength(12)
  })

  it('空分类显示空态与推广按钮', async () => {
    useFeedStore.setState({ cards: [], loading: false, hasMore: false, page: 1, category: '其他' })
    render(<HomePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText('这个分类还没有仓库')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '推广我的仓库' })).toBeInTheDocument()
  })

  it('错误态显示重试', async () => {
    useFeedStore.setState({ cards: [], loading: false, error: '网络开小差了', hasMore: false, page: 1, category: null })
    render(<HomePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText('网络开小差了')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })
})
