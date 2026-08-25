// src/components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('渲染文字并响应点击', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>推广我的仓库</Button>)
    await userEvent.click(screen.getByRole('button', { name: '推广我的仓库' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
  it('loading 时禁用并显示处理中文案', () => {
    render(<Button loading>发布</Button>)
    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(screen.getByText('处理中…')).toBeInTheDocument()
  })
  it('variant 落到 class', () => {
    render(<Button variant="secondary">去 GitHub</Button>)
    expect(screen.getByRole('button')).toHaveClass('btn', 'btn-secondary')
  })
})
