// src/styles/theme.test.ts
// token 契约：防止规范色值被无意改动（规范 §3）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(__dirname, 'theme.css'), 'utf-8')

describe('theme.css token 契约', () => {
  it.each([
    ['--bg1', '#FFFEFB'],
    ['--bg2', '#F9EFDB'],
    ['--bg3', '#F4E4C2'],
    ['--text1', '#2F2A22'],
    ['--text2', '#6E6558'],
    ['--text3', '#9C9284'],
    ['--text4', '#C9C0B0'],
    ['--brand_blue', '#0E61AC'],
    ['--brand_blue_hover', '#3B82C4'],
    ['--brand_blue_active', '#0A4E8A'],
    ['--brand_blue_disabled', '#A8C6E2'],
    ['--brand_blue_thin', '#E8F1FA'],
    ['--brand_amber', '#DA8E2D'],
    ['--brand_amber_thin', '#FBF0DC'],
    ['--stress_red', '#E0604F'],
    ['--success_green', '#4FB477'],
    ['--operate_orange', '#F09B3C'],
    ['--badge_red', '#EE6B60'],
    ['--line_light', '#F1E8D4'],
    ['--line_regular', '#E5DAC2'],
    ['--line_bold', '#CFC2A8'],
    ['--radius-sm', '6px'],
    ['--radius-md', '8px'],
    ['--radius-lg', '10px'],
    ['--radius-xl', '14px'],
    ['--time-fast', '0.2s'],
    ['--time-slow', '0.3s'],
    ['--mask_cover', 'rgba(43, 32, 16, 0.55)'],
    ['--mask_modal', 'rgba(43, 32, 16, 0.4)'],
    ['--topbar_bg', 'rgba(255, 254, 251, 0.85)'],
    ['--profile_banner', 'linear-gradient(135deg, #0A4E8A 0%, #15619E 60%, #2E77AE 100%)'],
    ['--on_banner', '#FFFDF8'],
    ['--on_banner_dim', 'rgba(255, 254, 251, 0.72)'],
    ['--like_pink', '#D84870'],
    ['--fav_yellow', '#E9A63C'],
  ])('包含 %s: %s', (name, value) => {
    expect(css).toContain(`${name}: ${value}`)
  })
})
