// src/test/mockIntersectionObserver.ts
// 可控 mock：构造时接管全局构造函数，triggerEnter() 模拟哨兵进视口
type Listener = (entries: { isIntersecting: boolean }[]) => void

export function mockIntersectionObserver() {
  let listener: Listener | null = null
  const instances: { disconnect: () => void }[] = []
  class FakeObserver {
    constructor(cb: Listener) {
      listener = cb
      instances.push(this)
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as Record<string, unknown>).IntersectionObserver = FakeObserver
  return {
    triggerEnter() {
      listener?.([{ isIntersecting: true }])
    },
  }
}
