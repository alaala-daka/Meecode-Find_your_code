// src/components/RelatedList.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { FIXTURE_REPOS } from '../api/fixtures'
import RelatedList from './RelatedList'

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('RelatedList', () => {
  it('渲染若干 RepoCard 卡片', () => {
    wrap(<RelatedList items={[FIXTURE_REPOS[5], FIXTURE_REPOS[1]]} />)
    expect(screen.getByLabelText('同类推荐').querySelectorAll('.repo-card')).toHaveLength(2)
  })

  it('空数组显示「同分类暂无更多仓库」，不渲染卡片', () => {
    wrap(<RelatedList items={[]} />)
    expect(screen.getByText('同分类暂无更多仓库')).toBeInTheDocument()
    expect(document.querySelectorAll('.repo-card')).toHaveLength(0)
  })
})
