// src/components/TopBar.test.tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIXTURE_USER } from '../api/fixtures'
import { useAuthStore } from '../store/authStore'
import TopBar from './TopBar'

const navigateSpy = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => navigateSpy }
})

function renderTopBar() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="*" element={<TopBar />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TopBar', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null })
    navigateSpy.mockClear()
  })

  it('搜索提交跳转搜索结果页', async () => {
    renderTopBar()
    const input = screen.getByPlaceholderText('搜索仓库、标签、一句话卖点…')
    await userEvent.type(input, 'agent')
    await userEvent.keyboard('{Enter}')
    expect(navigateSpy).toHaveBeenCalledWith('/search?q=agent')
  })

  it('未登录显示登录入口，登录后显示头像', () => {
    renderTopBar()
    expect(screen.getByText('登录')).toBeInTheDocument()
    act(() => useAuthStore.setState({ user: FIXTURE_USER }))
    expect(screen.getByLabelText('个人主页')).toBeInTheDocument()
    expect(screen.queryByText('登录')).not.toBeInTheDocument()
  })

  it('未登录点击推广弹出登录弹层（规范 §8.3）', async () => {
    renderTopBar()
    await userEvent.click(screen.getByRole('button', { name: /推广我的仓库/ }))
    expect(screen.getByText('用 GitHub 登录')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  it('登录后推广按钮跳转投稿页', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    renderTopBar()
    await userEvent.click(screen.getByRole('button', { name: /推广我的仓库/ }))
    expect(navigateSpy).toHaveBeenCalledWith('/submit')
  })

  it('浏览历史：已登录跳个人页历史 tab', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    renderTopBar()
    await userEvent.click(screen.getByLabelText('浏览历史'))
    expect(navigateSpy).toHaveBeenCalledWith('/user/alice?tab=history')
  })

  it('搜索页顶栏保留查询词（规范 §7.2）', () => {
    render(
      <MemoryRouter initialEntries={['/search?q=agent']}>
        <Routes>
          <Route path="*" element={<TopBar />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('textbox', { name: '搜索' })).toHaveValue('agent')
  })

  it('导航高亮仅首页', () => {
    render(
      <MemoryRouter initialEntries={['/repo/1']}>
        <Routes>
          <Route path="*" element={<TopBar />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: '首页' })).not.toHaveClass('is-current')
  })
})
