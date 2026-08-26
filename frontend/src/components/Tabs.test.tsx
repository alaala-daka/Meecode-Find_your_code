// src/components/Tabs.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Tabs from './Tabs'

const items = [
  { key: 'repos', label: '我的仓库' },
  { key: 'favs', label: '收藏夹' },
]

describe('Tabs', () => {
  it('激活项带 active 类，点击触发 onChange', async () => {
    const onChange = vi.fn()
    render(<Tabs items={items} active="repos" onChange={onChange} />)
    expect(screen.getByRole('tab', { name: '我的仓库' })).toHaveClass('is-active')
    await userEvent.click(screen.getByRole('tab', { name: '收藏夹' }))
    expect(onChange).toHaveBeenCalledWith('favs')
  })

  it('方向键切换 tab（ARIA tabs 模式）', async () => {
    const onChange = vi.fn()
    render(<Tabs items={items} active="repos" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: '我的仓库' })) // 先让焦点进入 tablist
    await userEvent.keyboard('{ArrowRight}')
    expect(onChange).toHaveBeenCalledWith('favs')
    await userEvent.keyboard('{ArrowLeft}')
    expect(onChange).toHaveBeenCalledWith('repos')
  })

  it('tab 关联面板（aria-controls）', () => {
    render(<Tabs items={items} active="repos" onChange={() => {}} panelId="test-panel" />)
    expect(screen.getByRole('tab', { name: '我的仓库' })).toHaveAttribute('aria-controls', 'test-panel')
  })
})
