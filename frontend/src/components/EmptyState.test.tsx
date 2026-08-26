// src/components/EmptyState.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('渲染文案与行动按钮', async () => {
    const onAction = vi.fn()
    render(<EmptyState title="这个分类还没有仓库" actionLabel="推广我的仓库" onAction={onAction} />)
    expect(screen.getByText('这个分类还没有仓库')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '推广我的仓库' }))
    expect(onAction).toHaveBeenCalled()
  })
  it('无行动按钮时只渲染文案', () => {
    render(<EmptyState title="还没有浏览记录" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
  it('提供插画时渲染图片而非占位线条', () => {
    const { container } = render(<EmptyState title="空" image="/x.png" />)
    expect(container.querySelector('.empty-illustration')).toHaveAttribute('src', '/x.png')
    expect(container.querySelector('.empty-icon')).not.toBeInTheDocument()
  })
})
