// src/components/Pagination.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('渲染页码并响应切换', async () => {
    const onChange = vi.fn()
    render(<Pagination page={1} total={30} pageSize={8} onChange={onChange} />)
    expect(screen.getByRole('button', { name: '1' })).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: '1' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
  it('总数不足一页时不渲染', () => {
    const { container } = render(<Pagination page={1} total={5} pageSize={8} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('页数很多时窗口化并以省略号收拢', () => {
    render(<Pagination page={13} total={200} pageSize={8} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '13' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '25' })).toBeInTheDocument()
    expect(screen.getAllByText('…').length).toBeGreaterThanOrEqual(2)
  })
})
