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
    // 仓库名同时出现在封面 SVG 与标题链接中，故用 getAllByText
    expect(screen.getAllByText('mini-agent').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('给 LLM Agent 的最小运行时')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    // 封面链接（aria-label）与标题链接都指向仓库页
    const links = screen.getAllByRole('link', { name: 'mini-agent' })
    expect(links.length).toBeGreaterThanOrEqual(2)
    links.forEach((l) => expect(l).toHaveAttribute('href', '/repo/1'))
  })
  it('常驻 star 与悬停统计', () => {
    renderCard(card)
    expect(screen.getByText('128')).toBeInTheDocument()          // 常驻 star
    expect(screen.getByText('3100')).toBeInTheDocument()         // 遮罩内浏览量
    expect(screen.getByText('45')).toBeInTheDocument()           // 遮罩内点赞
  })
  it('投稿与采集角标', () => {
    const { rerender } = renderCard(card)
    expect(screen.getByText('投稿')).toHaveClass('badge-submitted')
    rerender(<RepoCard data={{ ...card, source: 'crawled' }} />)
    expect(screen.getByText('采集')).toHaveClass('badge-crawled')
  })
  it('常驻统计与悬停遮罩位于同一封面内（互斥显示由 CSS 控制）', () => {
    renderCard(card)
    const cover = screen.getAllByRole('link', { name: 'mini-agent' })[0]
    const pill = cover.querySelector('.star-pill')
    const mask = cover.querySelector('.hover-mask')
    expect(pill).toBeTruthy()
    expect(mask).toBeTruthy()
    expect(mask).toHaveTextContent('3100')
    expect(mask).toHaveTextContent('45')
  })
})
