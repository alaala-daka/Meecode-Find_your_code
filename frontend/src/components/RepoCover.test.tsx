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
  it('封面 img 带尺寸与懒加载', () => {
    const { container } = render(<RepoCover name="x" language={null} topics={[]} coverUrl="https://example.com/c.png" />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('width', '672')
    expect(img).toHaveAttribute('height', '378')
    expect(img).toHaveAttribute('loading', 'lazy')
  })
  it('封面 img 可指定急切加载（首屏头条）', () => {
    const { container } = render(<RepoCover name="x" language={null} topics={[]} coverUrl="https://example.com/c.png" loading="eager" />)
    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager')
  })
  it('长 topic 封面胶囊字号降档防溢出', () => {
    const { container } = render(<RepoCover name="x" language={null} topics={['machine-learning']} />)
    expect(container.querySelector('text[font-size="17"]')).toBeTruthy()
  })
})
