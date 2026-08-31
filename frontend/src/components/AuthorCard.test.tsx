// src/components/AuthorCard.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import AuthorCard from './AuthorCard'

describe('AuthorCard', () => {
  it('展示作者头像、名称、GitHub 外链与站内创作者入口', () => {
    render(
      <MemoryRouter>
        <AuthorCard ownerLogin="alice" githubUrl="https://github.com/alice/mini-agent" />
      </MemoryRouter>,
    )
    const avatar = screen.getByRole('img', { name: 'alice 的头像' })
    expect(avatar.querySelector('img')).toHaveAttribute('src', 'https://github.com/alice.png?size=96')
    expect(screen.getByText('alice')).toBeInTheDocument()
    const gh = screen.getByRole('link', { name: '跳转 GitHub ↗' })
    expect(gh).toHaveAttribute('href', 'https://github.com/alice/mini-agent')
    expect(gh).toHaveAttribute('target', '_blank')
    expect(screen.getByRole('link', { name: '浏览创作者其他仓库' })).toHaveAttribute('href', '/user/alice')
  })
})
