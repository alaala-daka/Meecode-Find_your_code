// src/components/RepoRail.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toDetail } from '../api/testUtils'
import RepoRail from './RepoRail'

function renderRail(id: number) {
  return render(
    <MemoryRouter initialEntries={[`/repo/${id}`]}>
      <RepoRail repo={toDetail(id)} />
    </MemoryRouter>,
  )
}

describe('RepoRail', () => {
  afterEach(() => vi.restoreAllMocks())

  it('作者卡常驻；成功时渲染同类推荐卡片', async () => {
    renderRail(1)
    expect(screen.getByLabelText('仓库作者')).toBeInTheDocument()
    const rail = await screen.findByLabelText('同类推荐')
    // fixture：AI 与机器学习 排除自身只剩 llm-eval-kit
    expect(rail.querySelectorAll('.repo-card')).toHaveLength(1)
  })

  it('加载中不闪出推荐区', () => {
    renderRail(1)
    // 同步阶段：related 尚未 resolve
    expect(screen.queryByLabelText('同类推荐')).not.toBeInTheDocument()
  })

  it('related 失败：推荐区静默隐藏，作者卡仍在（§3.5 错误策略）', async () => {
    const { api } = await import('../api/client')
    vi.spyOn(api, 'related').mockRejectedValue(new Error('boom'))
    renderRail(1)
    await waitFor(() => expect(screen.getByLabelText('仓库作者')).toBeInTheDocument())
    expect(screen.queryByLabelText('同类推荐')).not.toBeInTheDocument()
  })
})
