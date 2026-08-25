// src/components/Skeleton.test.tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SkeletonGrid } from './Skeleton'

describe('SkeletonGrid', () => {
  it('渲染指定数量卡片骨架', () => {
    const { container } = render(<SkeletonGrid count={8} />)
    expect(container.querySelectorAll('.card-skeleton')).toHaveLength(8)
  })
})
