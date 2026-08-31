// src/api/client.ts —— 唯一数据入口;VITE_USE_MOCK=false 走真实后端,缺省 mock(离线开发)
import { createMockClient } from './mockClient'
import { createRealClient } from './realClient'
import type { ApiClient } from './types'

export type { ApiClient }

export function createClient(): ApiClient {
  return import.meta.env.VITE_USE_MOCK === 'false' ? createRealClient() : createMockClient()
}

export const api = createClient()
