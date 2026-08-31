// src/api/client.test.ts —— 验证 VITE_USE_MOCK 开关确实切换 mock / real client
import { afterEach, describe, expect, it, vi } from 'vitest'

function stubFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }))
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('feed createClient', () => {
  it('VITE_USE_MOCK=false 返回真实后端 client（feed 走 fetch /api/feed）', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'false')
    const f = stubFetchOk({ cards: [], has_more: false })
    vi.stubGlobal('fetch', f)
    vi.resetModules() // 重新执行 client.ts，让开关在模块求值时生效
    const { api } = await import('./client')
    await api.feed(null, 1)
    expect(f).toHaveBeenCalledWith('/api/feed?page=1', expect.anything())
  })

  it('VITE_USE_MOCK 缺省返回 mock client（离线数据，不发请求）', async () => {
    const f = stubFetchOk({ cards: [], has_more: false })
    vi.stubGlobal('fetch', f)
    vi.resetModules()
    const { api } = await import('./client')
    const page = await api.feed(null, 1)
    expect(page.cards).toHaveLength(8)
    expect(f).not.toHaveBeenCalled()
  })
})
