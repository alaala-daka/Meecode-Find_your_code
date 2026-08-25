// src/components/Pagination.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('渲染页码并响应切换', async () => {
    const onChange = vi.fn()
    render(<Pagination page={1} total={30} pageSize={8} onChange={onChange} />)
    expect(screen.getByText('1')).toHaveClass('is-active')
    await userEvent.click(screen.getByText('2'))
    expect(onChange).toHaveBeenCalledWith(2)
  })
  it('总数不足一页时不渲染', () => {
    const { container } = render(<Pagination page={1} total={5} pageSize={8} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
