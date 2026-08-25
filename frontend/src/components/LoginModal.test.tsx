// src/components/LoginModal.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../store/authStore'
import LoginModal from './LoginModal'

describe('LoginModal', () => {
  beforeEach(() => useAuthStore.setState({ user: null }))

  it('open 时显示登录引导', () => {
    render(<LoginModal open onClose={() => {}} />)
    expect(screen.getByText('用 GitHub 登录')).toBeInTheDocument()
    expect(screen.getByText('登录后即可收藏、点赞与推广仓库')).toBeInTheDocument()
  })
  it('closed 时不渲染', () => {
    render(<LoginModal open={false} onClose={() => {}} />)
    expect(screen.queryByText('用 GitHub 登录')).not.toBeInTheDocument()
  })
  it('点击登录写入登录态并关闭', async () => {
    const onClose = vi.fn()
    render(<LoginModal open onClose={onClose} />)
    await userEvent.click(screen.getByText('用 GitHub 登录'))
    expect(useAuthStore.getState().user?.login).toBe('alice')
    expect(onClose).toHaveBeenCalled()
  })
})
