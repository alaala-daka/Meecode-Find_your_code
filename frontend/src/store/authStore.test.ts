// src/store/authStore.test.ts —— 登录链路：bootstrap 引导 / login 跳转 / logout 清态
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api/client'
import { FIXTURE_USER } from '../api/fixtures'
import { useAuthStore } from './authStore'

describe('authStore 登录链路', () => {
  afterEach(() => {
    useAuthStore.setState({ user: null })
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('bootstrap 用 me() 结果引导登录态（mock 返回模拟用户）', async () => {
    await useAuthStore.getState().bootstrap()
    expect(useAuthStore.getState().user?.login).toBe(FIXTURE_USER.login)
  })

  it('bootstrap 遇 me() 返回 null 时为未登录', async () => {
    vi.spyOn(api, 'me').mockResolvedValue(null)
    await useAuthStore.getState().bootstrap()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('login 跳转 OAuth 地址', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })
    useAuthStore.getState().login()
    expect(assign).toHaveBeenCalledWith('/api/auth/github')
  })

  it('logout 调用接口并清空登录态', async () => {
    useAuthStore.setState({ user: FIXTURE_USER })
    const logout = vi.spyOn(api, 'logout').mockResolvedValue(undefined)
    await useAuthStore.getState().logout()
    expect(logout).toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
