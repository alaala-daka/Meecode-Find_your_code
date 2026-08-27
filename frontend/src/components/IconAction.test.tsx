// src/components/IconAction.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import IconAction from './IconAction'

describe('IconAction', () => {
  it('未点亮：空心、aria-pressed=false、无计数', () => {
    render(<IconAction kind="like" on={false} onClick={() => {}} />)
    const btn = screen.getByRole('button', { name: '点赞' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn.querySelector('.icon-action-count')).toBeNull()
    const path = btn.querySelector('svg path')!
    expect(path.getAttribute('fill')).toBe('none')
  })

  it('点亮：aria-pressed=true 且显示计数值', () => {
    render(<IconAction kind="favorite" on count={67} onClick={() => {}} />)
    const btn = screen.getByRole('button', { name: '收藏' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('67')).toBeInTheDocument()
  })

  it('点击回调触发一次', async () => {
    const spy = vi.fn()
    render(<IconAction kind="like" on={false} count={23} onClick={spy} />)
    await userEvent.click(screen.getByRole('button', { name: '点赞' }))
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('busy 时禁用防连点', () => {
    render(<IconAction kind="favorite" on={false} busy onClick={() => {}} />)
    expect(screen.getByRole('button', { name: '收藏' })).toBeDisabled()
  })

  it('count 为 undefined 时不渲染数字（stars 字段后端未供数场景）', () => {
    render(<IconAction kind="favorite" on={false} onClick={() => {}} />)
    expect(document.querySelectorAll('.icon-action-count')).toHaveLength(0)
  })
})
