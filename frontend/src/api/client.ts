// src/api/client.ts —— 唯一数据入口；VITE_USE_MOCK 默认开
import { createMockClient } from './mockClient'
import type { ApiClient } from './types'

export type { ApiClient }

export function createClient(): ApiClient {
  const useMock = import.meta.env.VITE_USE_MOCK ?? 'true'
  if (useMock !== 'false') return createMockClient()
  // 真实实现：后端就绪后在此接 fetch('/api/...')，类型不变
  throw new Error('真实 API 客户端待后端就绪后实现（本计划范围外）')
}

export const api = createClient()
