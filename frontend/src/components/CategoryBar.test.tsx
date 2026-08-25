// src/components/CategoryBar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFeedStore } from '../store/feedStore'
import CategoryBar from './CategoryBar'

function renderBar(initialUrl = '/') {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Routes>
        <Route path="*" element={<CategoryBar />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CategoryBar', () => {
  beforeEach(() => {
    useFeedStore.setState({ cards: [], loading: false, error: null, hasMore: true, page: 0, category: null })
  })

  it('渲染分类胶囊，点击写入选中态并加载', async () => {
    renderBar()
    const chip = await screen.findByRole('button', { name: '开发工具' })
    await userEvent.click(chip)
    expect(chip).toHaveClass('is-active')
    expect(useFeedStore.getState().category).toBe('开发工具')
  })

  it('超过 8 个分类收进更多（fixture 7 个不触发）', async () => {
    renderBar()
    await screen.findByRole('button', { name: '开发工具' })
    expect(screen.queryByText('更多')).not.toBeInTheDocument()
  })
})
