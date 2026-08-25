// src/test/setup.ts
import '@testing-library/jest-dom'

// jsdom 无 IntersectionObserver：装默认空实现兜底；
// 需要触发哨兵的测试用 mockIntersectionObserver() 覆盖
if (!('IntersectionObserver' in globalThis)) {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as Record<string, unknown>).IntersectionObserver = NoopObserver
}
