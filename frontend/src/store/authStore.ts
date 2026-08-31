// src/store/authStore.ts —— 登录链路（最终审查 Critical-1 修复）：
// login 跳转 GitHub OAuth；bootstrap 用 GET /api/me 引导会话；logout 清会话
import { create } from 'zustand'
import { api } from '../api/client'
import type { CurrentUser, UserProfile } from '../api/types'

interface AuthState {
  // 已登录用户：真实后端为 CurrentUser（/api/me），mock/fixtures 场景为 UserProfile
  user: UserProfile | CurrentUser | null
  login: () => void
  logout: () => Promise<void>
  bootstrap: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  // 整页跳转 GitHub OAuth；mock 下同样跳 /api/auth/github（纯 mock dev 无后端会 404，属既有 mock 局限）
  login: () => { window.location.assign(api.loginUrl()) },
  logout: async () => {
    await api.logout()
    set({ user: null })
  },
  // 会话引导：/api/me 返回 null 即未登录（保持初始未登录态，不覆盖既有登出结果）；
  // 幂等，可安全重复调用（React 18 StrictMode 双调用无害）
  bootstrap: async () => {
    const me = await api.me()
    if (me) set({ user: me })
  },
}))
