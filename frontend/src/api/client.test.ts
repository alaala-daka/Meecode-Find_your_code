// src/api/client.test.ts
import { describe, expect, it, vi } from 'vitest'

describe('feed createClient', () => {
  it('VITE_USE_MOCK=false 不抛错，恒返回 mock client（信息流暂无真实后端）', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    const { createClient } = await import('./client')
    expect(() => createClient()).not.toThrow()
    const client = createClient()
    expect(typeof client.feed).toBe('function')
  })
})
