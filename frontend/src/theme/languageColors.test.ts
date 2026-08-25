// src/theme/languageColors.test.ts
import { describe, expect, it } from 'vitest'
import {
  LANGUAGE_COLORS, FALLBACK_LANGUAGE_COLOR, TEXT_ON_COVER,
  languageColor, coverBase, capsuleBg, capsuleText, mixHex
} from './languageColors'

describe('mixHex', () => {
  it('t=0.5 等比混合', () => {
    expect(mixHex('#000000', '#FFFFFF', 0.5)).toBe('#808080')
  })
  it('t=1 取 a，t=0 取 b', () => {
    expect(mixHex('#0E61AC', '#FAF2E0', 1)).toBe('#0E61AC')
    expect(mixHex('#0E61AC', '#FAF2E0', 0)).toBe('#FAF2E0')
  })
})

describe('languageColor', () => {
  it('规范 §3.8 色谱抽样', () => {
    expect(LANGUAGE_COLORS['Python']).toBe('#7FA8CC')
    expect(LANGUAGE_COLORS['JavaScript']).toBe('#E8C86A')
    expect(LANGUAGE_COLORS['TypeScript']).toBe('#6E93C9')
    expect(LANGUAGE_COLORS['Rust']).toBe('#C08A6E')
    expect(LANGUAGE_COLORS['C++']).toBe('#8E9AC0')
  })
  it('未知语言回退', () => {
    expect(languageColor('Brainfuck')).toBe(FALLBACK_LANGUAGE_COLOR)
    expect(languageColor(null)).toBe(FALLBACK_LANGUAGE_COLOR)
  })
  it('封面文字色等于 --text1', () => {
    expect(TEXT_ON_COVER).toBe('#2F2A22')
  })
})

describe('派生色', () => {
  it('封面底色 = 米底混入 15% 语言色（规范 §6.4）', () => {
    expect(coverBase('Python')).toBe('#E8E7DD')
  })
  it('胶囊浅底 = 语言色混入 85% bg1（规范 §6.5）', () => {
    expect(capsuleBg('#7FA8CC')).toBe('#ECF1F4')
  })
  it('胶囊深字 = 语言色混入 55% text1（规范 §6.5）', () => {
    expect(capsuleText('#7FA8CC')).toBe('#53636F')
  })
})
