// src/theme/languageColors.ts —— 语言色表唯一定义源（规范 §3.8）
export const LANGUAGE_COLORS: Record<string, string> = {
  Python: '#7FA8CC',
  JavaScript: '#E8C86A',
  TypeScript: '#6E93C9',
  Go: '#7BC0C4',
  Rust: '#C08A6E',
  Java: '#CC9A6B',
  C: '#8E9AC0',
  'C++': '#8E9AC0',
  Ruby: '#CC8A99',
  Shell: '#9DB89A',
  HTML: '#D89A7A',
  CSS: '#8AA8C8',
  Kotlin: '#A890CC',
  Swift: '#E09A6A',
}

export const FALLBACK_LANGUAGE_COLOR = '#B9AE9A'

/** 封面文字色（= --text1，SVG 属性无法引用 CSS 变量，故在此声明） */
export const TEXT_ON_COVER = '#2F2A22'

export function languageColor(language: string | null | undefined): string {
  if (!language) return FALLBACK_LANGUAGE_COLOR
  return LANGUAGE_COLORS[language] ?? FALLBACK_LANGUAGE_COLOR
}

function parse(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

/** a 占 t、b 占 1-t 的逐通道混合 */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const c = (x: number, y: number) =>
    Math.round(x * t + y * (1 - t)).toString(16).padStart(2, '0')
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`.toUpperCase()
}

/** 封面底色：#FAF2E0 混入 15% 语言色（规范 §6.4） */
export function coverBase(language: string | null | undefined): string {
  return mixHex(languageColor(language), '#FAF2E0', 0.15)
}

/** 胶囊浅底：语言色混入 85% --bg1（规范 §6.5） */
export function capsuleBg(hex: string): string {
  return mixHex(hex, '#FFFEFB', 0.15)
}

/** 胶囊深字：语言色混入 55% --text1（规范 §6.5） */
export function capsuleText(hex: string): string {
  return mixHex('#2F2A22', hex, 0.55)
}
