// src/store/authStore.ts
import { create } from 'zustand'
import { FIXTURE_USER } from '../api/fixtures'
import type { UserProfile } from '../api/types'

interface AuthState {
  user: UserProfile | null
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: () => set({ user: FIXTURE_USER }), // mock：登录即置为 fixture 用户
  logout: () => set({ user: null }),
}))
