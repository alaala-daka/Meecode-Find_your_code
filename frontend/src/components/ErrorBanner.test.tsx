// src/components/ErrorBanner.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ErrorBanner from './ErrorBanner'

describe('ErrorBanner', () => {
  it('显示消息并触发重试', async () => {
    const onRetry = vi.fn()
    render(<ErrorBanner message="网络开小差了" onRetry={onRetry} />)
    expect(screen.getByText('网络开小差了')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重试' }))
    expect(onRetry).toHaveBeenCalled()
  })
})
