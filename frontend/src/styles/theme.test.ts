// src/styles/theme.test.ts
// token 契约：防止「纸面墨线」规范色值被无意改动（2026-08-28 简约线条风重设计 §3）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf-8')

describe('theme.css token 契约', () => {
  it.each([
    // 中性面
    ['--paper', '#FAF9F6'],
    ['--surface', '#FFFFFF'],
    ['--tint', '#F3F1EA'],
    ['--tint-deep', '#ECE9E0'],
    // 墨色文字
    ['--ink', '#313A45'],
    ['--ink-2', '#5F6874'],
    ['--ink-3', '#9098A3'],
    ['--ink-4', '#C3C8CE'],
    // 赭红强调（唯一 accent）
    ['--brand', '#AE5139'],
    ['--brand-hover', '#96432C'],
    ['--brand-active', '#7E3822'],
    ['--brand-disabled', '#E3B4A5'],
    ['--brand-thin', '#F8EFEA'],
    ['--brand-line', '#E9D2C7'],
    // 语义色
    ['--like', '#C24E6F'],
    ['--fav', '#D9962E'],
    ['--danger', '#C25040'],
    ['--ok', '#4E9B72'],
    ['--warn', '#C98A2D'],
    // 发丝线
    ['--line', '#E7E3D8'],
    ['--line-strong', '#D6D1C4'],
    // 圆角与动效
    ['--radius-sm', '6px'],
    ['--radius-md', '8px'],
    ['--radius-lg', '10px'],
    ['--radius-xl', '14px'],
    ['--radius-pill', '999px'],
    ['--time-fast', '0.18s'],
    ['--time-slow', '0.28s'],
    // 遮罩
    ['--mask_modal', 'rgba(49, 42, 32, 0.44)'],
  ])('包含 %s: %s', (name, value) => {
    expect(css).toContain(`${name}: ${value}`)
  })

  it('旧令牌以别名保留（explain 等外围模块兼容）', () => {
    expect(css).toContain('--bg1: var(--surface)')
    expect(css).toContain('--brand_blue: var(--brand)')
    expect(css).toContain('--line_light: var(--line)')
  })
})
