// src/api/client.ts —— 唯一数据入口；信息流暂无真实后端，恒走 mock
import { createMockClient } from './mockClient'
import type { ApiClient } from './types'

export type { ApiClient }

export function createClient(): ApiClient {
  // 信息流真实后端就绪后在此按开关接 fetch('/api/...')，类型不变
  return createMockClient()
}

export const api = createClient()
