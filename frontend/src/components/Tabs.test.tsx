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
})
