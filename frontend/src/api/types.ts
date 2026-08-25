// src/api/types.ts —— 全部 DTO（与后端 schemas 对齐，后端就绪后不改前端类型）
export type Source = 'submitted' | 'crawled'
export type SortKey = 'default' | 'newest' | 'stars'
export type InteractKind = 'like' | 'favorite'

export interface RepoCardData {
  id: number
  full_name: string          // owner/repo
  title: string              // 仓库名
  owner_login: string
  language: string | null
  topics: string[]
  stars: number
  views: number
  likes: number
  source: Source
  category: string
  tagline_zh: string
  published_at: string       // ISO
  cover_url: string | null
}

export interface RepoDetail extends RepoCardData {
  intro_zh: string
  github_url: string
  discussions_open: boolean
}

export interface UserProfile {
  login: string
  avatar_url: string
  bio: string
  repo_count: number
  star_count: number
  favorite_count: number
}

export interface FeedPage {
  cards: RepoCardData[]
  has_more: boolean
}

export interface SearchResult extends FeedPage {
  total: number
}

export interface RepoTreeItem {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: RepoTreeItem[]
}

export interface RepoFile {
  path: string
  content: string
}

export interface SubmitPayload {
  full_name: string
  tagline_zh: string
  intro_zh: string
  category: string
  cover_url: string | null
}

export interface ApiClient {
  categories(): Promise<string[]>
  feed(category: string | null, page: number): Promise<FeedPage>
  search(q: string, sort: SortKey, page: number): Promise<SearchResult>
  repo(id: number): Promise<RepoDetail>
  repoTree(id: number): Promise<RepoTreeItem[]>
  repoFile(id: number, path: string): Promise<RepoFile>
  myRepos(): Promise<RepoCardData[]>
  submitRepo(payload: SubmitPayload): Promise<RepoCardData>
  aiDraft(repoId: number): Promise<{ tagline_zh: string; intro_zh: string }>
  userProfile(login: string): Promise<UserProfile>
  userRepos(login: string): Promise<RepoCardData[]>
  userFavorites(login: string): Promise<RepoCardData[]>
  userHistory(login: string): Promise<RepoCardData[]>
  setBio(bio: string): Promise<void>
  interact(repoId: number, kind: InteractKind, on: boolean): Promise<void>
  myFavorites(): Promise<number[]>
  myLikes(): Promise<number[]>
  delist(repoId: number): Promise<void>
  loginUrl(): string
}
