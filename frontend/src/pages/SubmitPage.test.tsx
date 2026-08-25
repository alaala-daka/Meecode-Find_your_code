// src/pages/SubmitPage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { FIXTURE_USER } from '../api/fixtures'
import { useAuthStore } from '../store/authStore'
import SubmitPage from './SubmitPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/submit']}>
      <Routes>
        <Route path="/submit" element={<SubmitPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SubmitPage', () => {
  beforeEach(() => useAuthStore.setState({ user: null }))

  it('未登录显示登录引导', () => {
    renderPage()
    expect(screen.getByText('用 GitHub 登录后即可推广你的仓库')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '用 GitHub 登录' })).toBeInTheDocument()
  })

  it('步1 列出我的仓库并可勾选', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    renderPage()
    const repo = await screen.findByText('mini-agent')
    expect(repo).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText(/mini-agent/))
    expect(screen.getByRole('button', { name: '下一步' })).toBeEnabled()
  })

  it('步2 卖点必填校验与 AI 草稿', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    renderPage()
    await userEvent.click(await screen.findByLabelText(/mini-agent/))
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    const next = screen.getByRole('button', { name: '发布' })
    expect(next).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'AI 帮我写' }))
    expect(await screen.findByDisplayValue(/最小运行时/)).toBeInTheDocument()
    expect(next).toBeEnabled()
  })

  it('步3 发布成功', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    renderPage()
    await userEvent.click(await screen.findByLabelText(/mini-agent/))
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    await userEvent.type(screen.getByLabelText('一句话卖点'), '手写的一句话卖点')
    await userEvent.click(screen.getByRole('button', { name: '发布' }))
    expect(await screen.findByText('已发布，进入首发曝光窗口')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '查看我的主页' })).toBeInTheDocument()
  })
})
