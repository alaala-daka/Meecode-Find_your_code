// src/pages/SearchPage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import SearchPage from './SearchPage'

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('SearchPage', () => {
  it('渲染横向富卡片：标题、卖点、作者、分类胶囊', async () => {
    renderAt('/search?q=agent')
    expect(await screen.findByTestId('search-card-1')).toBeInTheDocument()
    expect(screen.getByText('给 LLM Agent 的最小运行时，200 行可读完')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('AI 与机器学习')).toBeInTheDocument()
  })

  it('命中词在标题中高亮', async () => {
    renderAt('/search?q=agent')
    const card = await screen.findByTestId('search-card-1')
    // 标题被 <mark> 拆分，无法按完整文本查询，直接在卡片内定位 mark
    const mark = card.querySelector('.search-title mark')
    expect(mark).toHaveTextContent('agent')
  })

  it('切换排序重新请求', async () => {
    renderAt('/search?q=a')
    await screen.findByTestId('search-card-1')
    await userEvent.click(screen.getByRole('tab', { name: '最多 star' }))
    const cards = await screen.findAllByTestId(/^search-card-/)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('无结果显示空态', async () => {
    renderAt('/search?q=不存在的关键词')
    expect(await screen.findByText('没有找到相关仓库，换个关键词试试')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '推广我的仓库' })).toBeInTheDocument()
  })
})
