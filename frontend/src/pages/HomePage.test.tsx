// src/pages/HomePage.test.tsx
import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { FIXTURE_REPOS } from '../api/fixtures'
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

  it('全部页：大推荐卡轮播圆点与精选去重', async () => {
    render(<HomePage />, { wrapper: MemoryRouter })
    await screen.findAllByText('mini-agent')
    const hero = screen.getByRole('region', { name: '今日精选' })
    // 首屏投稿仓库 3 个 → 轮播 3 条，圆点可手动切换
    expect(within(hero).getAllByRole('button', { name: /共 3 条/ })).toHaveLength(3)
    // rust-kv 只出现在大卡内（封面文字 + 标题 = 2 处），网格不再重复曝光
    expect(screen.getAllByText('rust-kv')).toHaveLength(2)
  })

  it('分区页：今日精选横条单一仓库、不轮播', async () => {
    render(<HomePage />, {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?cat=AI 与机器学习']}>{children}</MemoryRouter>
      ),
    })
    await screen.findAllByText('mini-agent')
    const strip = screen.getByRole('region', { name: '今日精选' })
    expect(within(strip).queryAllByRole('button')).toHaveLength(0)
    // 分类内两个仓库：精选占一个、网格留一个，各只出现一张卡（封面 + 标题 = 2 处）
    expect(screen.getAllByText('llm-eval-kit')).toHaveLength(2)
    expect(screen.getAllByText('mini-agent')).toHaveLength(2)
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
    render(<HomePage />, {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?cat=其他']}>{children}</MemoryRouter>
      ),
    })
    expect(await screen.findByText('这个分类还没有仓库')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '推广我的仓库' })).toBeInTheDocument()
  })

  it('深链带分类参数时按分类加载', async () => {
    render(<HomePage />, {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/?cat=AI 与机器学习']}>{children}</MemoryRouter>
      ),
    })
    expect((await screen.findAllByText('mini-agent')).length).toBeGreaterThanOrEqual(2)
    expect(useFeedStore.getState().category).toBe('AI 与机器学习')
  })

  it('错误态显示重试', async () => {
    useFeedStore.setState({ cards: [], loading: false, error: '网络开小差了', hasMore: false, page: 1, category: null })
    render(<HomePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText('加载失败，请重试')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
  })

  it('页面提供 h1 标题', async () => {
    render(<HomePage />, { wrapper: MemoryRouter })
    await screen.findAllByText('mini-agent')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('觅码')
  })

  it('翻页失败时错误条仍可见（已有卡片）', async () => {
    useFeedStore.setState({
      cards: [FIXTURE_REPOS[0]], loading: false, error: '某错误',
      hasMore: false, page: 1, category: null,
    })
    render(<HomePage />, { wrapper: MemoryRouter })
    expect(await screen.findByText('加载失败，请重试')).toBeInTheDocument()
  })
})
