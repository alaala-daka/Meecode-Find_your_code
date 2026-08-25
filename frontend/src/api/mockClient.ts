// src/api/mockClient.ts
import {
  CATEGORIES, FIXTURE_FILES, FIXTURE_REPOS, FIXTURE_TREE, FIXTURE_USER,
} from './fixtures'
import type {
  ApiClient, FeedPage, InteractKind, RepoCardData, RepoDetail,
  RepoFile, RepoTreeItem, SearchResult, SubmitPayload, UserProfile,
} from './types'

const PAGE_SIZE = 8

function toDetail(card: RepoCardData): RepoDetail {
  return {
    ...card,
    intro_zh: `${card.tagline_zh}。这里放详细介绍，介绍作者在投稿时可以自由编辑。`,
    github_url: `https://github.com/${card.full_name}`,
    discussions_open: card.id % 2 === 1, // 奇数 id 开启，覆盖两种状态
  }
}

export function createMockClient(): ApiClient {
  const state = {
    repos: [...FIXTURE_REPOS],
    favorites: new Set<number>([3]),
    likes: new Set<number>([1]),
    history: [2, 1],
    bio: FIXTURE_USER.bio,
  }
  return {
    async categories() {
      return CATEGORIES
    },
    async feed(category, page): Promise<FeedPage> {
      const all = category
        ? state.repos.filter((r) => r.category === category)
        : state.repos
      const start = (page - 1) * PAGE_SIZE
      const cards = all.slice(start, start + PAGE_SIZE)
      return { cards, has_more: start + PAGE_SIZE < all.length }
    },
    async search(q, sort, page): Promise<SearchResult> {
      const kw = q.toLowerCase()
      let hit = state.repos.filter(
        (r) =>
          r.title.toLowerCase().includes(kw) ||
          r.tagline_zh.includes(q) ||
          r.topics.some((t) => t.includes(kw)),
      )
      if (sort === 'newest') {
        hit = [...hit].sort((a, b) => b.published_at.localeCompare(a.published_at))
      } else if (sort === 'stars') {
        hit = [...hit].sort((a, b) => b.stars - a.stars)
      }
      const start = (page - 1) * PAGE_SIZE
      return { total: hit.length, cards: hit.slice(start, start + PAGE_SIZE), has_more: start + PAGE_SIZE < hit.length }
    },
    async repo(id): Promise<RepoDetail> {
      const card = state.repos.find((r) => r.id === id)
      if (!card) throw new Error('仓库不存在')
      return toDetail(card)
    },
    async repoTree(): Promise<RepoTreeItem[]> {
      return FIXTURE_TREE
    },
    async repoFile(_id, path): Promise<RepoFile> {
      const content = FIXTURE_FILES[path]
      if (content === undefined) throw new Error('文件不存在')
      return { path, content }
    },
    async myRepos(): Promise<RepoCardData[]> {
      return state.repos.filter((r) => r.source === 'submitted' && r.owner_login === FIXTURE_USER.login)
    },
    async submitRepo(payload: SubmitPayload): Promise<RepoCardData> {
      const next: RepoCardData = {
        id: state.repos.length + 1,
        full_name: payload.full_name,
        title: payload.full_name.split('/')[1],
        owner_login: FIXTURE_USER.login,
        language: 'Python',
        topics: [],
        stars: 0, views: 0, likes: 0,
        source: 'submitted',
        category: payload.category,
        tagline_zh: payload.tagline_zh,
        published_at: new Date().toISOString(),
        cover_url: payload.cover_url,
      }
      state.repos = [next, ...state.repos]
      return next
    },
    async aiDraft(repoId): Promise<{ tagline_zh: string; intro_zh: string }> {
      const card = state.repos.find((r) => r.id === repoId)
      return {
        tagline_zh: card ? card.tagline_zh : '一句话卖点（AI 草稿）',
        intro_zh: '这里是 AI 读 README 后生成的介绍草稿，作者可以任意修改。',
      }
    },
    async userProfile(login): Promise<UserProfile> {
      return { ...FIXTURE_USER, login }
    },
    async userRepos(login): Promise<RepoCardData[]> {
      return state.repos.filter((r) => r.owner_login === login)
    },
    async userFavorites(): Promise<RepoCardData[]> {
      return state.repos.filter((r) => state.favorites.has(r.id))
    },
    async userHistory(): Promise<RepoCardData[]> {
      return state.history
        .map((id) => state.repos.find((r) => r.id === id))
        .filter((r): r is RepoCardData => Boolean(r))
    },
    async setBio(bio) {
      state.bio = bio
    },
    async interact(repoId, kind: InteractKind, on) {
      const set = kind === 'like' ? state.likes : state.favorites
      if (on) set.add(repoId); else set.delete(repoId)
      const card = state.repos.find((r) => r.id === repoId)
      if (card && kind === 'like') card.likes += on ? 1 : -1
    },
    async myFavorites(): Promise<number[]> {
      return [...state.favorites]
    },
    async myLikes(): Promise<number[]> {
      return [...state.likes]
    },
    async delist(repoId) {
      state.repos = state.repos.filter((r) => r.id !== repoId)
    },
    loginUrl(): string {
      return '/api/auth/github'
    },
  }
}
