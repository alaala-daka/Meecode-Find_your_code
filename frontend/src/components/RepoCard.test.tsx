// src/components/RepoCard.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { RepoCardData } from '../api/types'
import RepoCard from './RepoCard'

const card: RepoCardData = {
  id: 1, full_name: 'alice/mini-agent', title: 'mini-agent', owner_login: 'alice',
  language: 'Python', topics: ['agent'], stars: 128, views: 3100, likes: 45,
  source: 'submitted', category: 'AI 与机器学习',
  tagline_zh: '给 LLM Agent 的最小运行时', published_at: new Date().toISOString(), cover_url: null,
}

function renderCard(data: RepoCardData) {
  return render(<RepoCard data={data} />, { wrapper: MemoryRouter })
}

describe('RepoCard', () => {
  it('渲染标题、tagline、作者与链接', () => {
    renderCard(card)
    expect(screen.getByText('mini-agent')).toBeInTheDocument()
    expect(screen.getByText('给 LLM Agent 的最小运行时')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    // 标题链接指向仓库页
    const link = screen.getByRole('link', { name: 'mini-agent' })
    expect(link).toHaveAttribute('href', '/repo/1')
  })
  it('无封面：不渲染图片与 SVG 封面', () => {
    const { container } = renderCard(card)
    expect(container.querySelector('img, svg')).toBeNull()
    expect(container.querySelector('.repo-card-cover')).toBeNull()
  })
  it('元信息行展示 star 数（浏览/点赞不在卡片曝光）', () => {
    renderCard(card)
    expect(screen.getByText('128')).toBeInTheDocument()
    expect(screen.queryByText('3100')).not.toBeInTheDocument()
    expect(screen.queryByText('45')).not.toBeInTheDocument()
  })
  it('投稿与采集角标', () => {
    const { rerender } = renderCard(card)
    expect(screen.getByText('投稿')).toHaveClass('badge-submitted')
    rerender(<RepoCard data={{ ...card, source: 'crawled' }} />)
    expect(screen.getByText('采集')).toHaveClass('badge-crawled')
  })
  it('语言圆点使用语言色', () => {
    const { container } = renderCard(card)
    const dot = container.querySelector('.lang-dot') as HTMLElement
    expect(dot).toBeTruthy()
    expect(dot.style.backgroundColor).not.toBe('')
  })
})
