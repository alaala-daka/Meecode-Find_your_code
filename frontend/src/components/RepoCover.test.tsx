// src/components/RepoCover.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RepoCover from './RepoCover'

describe('RepoCover', () => {
  it('渲染仓库名与 topics 胶囊', () => {
    render(<RepoCover name="mini-agent" language="Python" topics={['agent', 'llm', 'runtime']} />)
    expect(screen.getByText('mini-agent')).toBeInTheDocument()
    expect(screen.getByText('agent')).toBeInTheDocument()
    expect(screen.getByText('llm')).toBeInTheDocument()
    expect(screen.getByText('runtime')).toBeInTheDocument()
  })
  it('topics 最多显示 3 个', () => {
    render(<RepoCover name="x" language="Go" topics={['a', 'b', 'c', 'd']} />)
    expect(screen.queryByText('d')).not.toBeInTheDocument()
  })
  it('未知语言回退色', () => {
    const { container } = render(<RepoCover name="x" language="Brainfuck" topics={[]} />)
    const shape = container.querySelector('.cover-shape') as SVGElement
    expect(shape.getAttribute('fill')).toBe('#B9AE9A')
  })
  it('长名截为两行', () => {
    render(<RepoCover name="a-very-long-repository-name" language="Go" topics={[]} />)
    expect(screen.getByText('a-very-long-')).toBeInTheDocument()
    expect(screen.getByText('repository-name')).toBeInTheDocument()
  })
  it('提供 coverUrl 时渲染图片而非 SVG', () => {
    const { container } = render(<RepoCover name="x" language="Go" topics={[]} coverUrl="https://example.com/c.png" />)
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/c.png')
  })
})
