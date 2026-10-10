import { ref } from 'vue'

export interface Photo {
  id: string
  title: string
  url: string // full version, ≤2048px long side
  thumbUrl: string // ≤400px long side
  width: number // of the full version
  height: number
  isFavorite: boolean // always false for anonymous requests
}

export interface Category {
  id: string
  slug: string
  title: string
  galleriesCount: number
}

export interface Gallery {
  id: string
  title: string
  category: Pick<Category, 'id' | 'slug' | 'title'>
  photosCount: number
  cover: Photo | null // random photo of the gallery, new on each request; null if empty
}

// GET /photos/{id}: the photo page
export interface PhotoDetail extends Photo {
  description: string
  tags: string[]
  gallery: Pick<Gallery, 'id' | 'title' | 'category'>
}

export interface Page<T> {
  items: T[]
  total: number
}

export interface Me {
  id: string
  email: string
  dateJoined: string
  isAdmin: boolean // staff: may delete photos
}

interface Tokens {
  access: string
  refresh: string
}

export class ApiError extends Error {
  status: number
  data: Record<string, unknown> // response body: field errors {field: [msg]}, {code}, …
  constructor(status: number, message: string, data: Record<string, unknown> = {}) {
    super(message)
    this.status = status
    this.data = data
  }
}

// 400 field errors -> {field: first message}
export function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || e.status !== 400) return {}
  return Object.fromEntries(
    Object.entries(e.data).map(([k, v]) => [k, String(Array.isArray(v) ? v[0] : v)]),
  )
}

// Browser: VITE_API_URL (baked in at build). Server render in Docker: API_INTERNAL_URL at runtime,
// since localhost inside the container is the container itself.
const API_URL = (
  import.meta.env.SSR
    ? (process.env.API_INTERNAL_URL ?? import.meta.env.VITE_API_URL)
    : import.meta.env.VITE_API_URL
) as string | undefined

// Session: access token in memory (15 min), refresh token in localStorage (single-use, rotated).
// Server render never has tokens, so SSR pages are always anonymous.
const REFRESH = 'refresh'
const store = typeof localStorage === 'undefined' ? undefined : localStorage
let access: string | null = null
let refreshing: Promise<void> | null = null
export const me = ref<Me | null>(null) // current user for the UI; null until /me loads

export const hasSession = () => !!store?.getItem(REFRESH)

function setTokens(t: Tokens) {
  access = t.access
  store?.setItem(REFRESH, t.refresh)
}

function clearTokens() {
  access = null
  store?.removeItem(REFRESH)
  me.value = null
}

function send(method: string, path: string, body?: unknown) {
  return fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(access && { Authorization: `Bearer ${access}` }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    // status 0 = network failure; UI text comes from errorMessage() in i18n.ts
    throw new ApiError(0, `${method} ${path}: network error`)
  })
}

// One refresh at a time: the refresh token is single-use, parallel 401s must share the new pair.
function refreshTokens() {
  refreshing ??= (async () => {
    const refresh = store?.getItem(REFRESH)
    access = null
    if (!refresh) return
    const res = await send('POST', '/auth/refresh', { refresh })
    if (res.ok) setTokens(await res.json())
    else if (res.status === 400 || res.status === 401)
      clearTokens() // dead session -> anonymous
    else throw new ApiError(res.status, `POST /auth/refresh: ${res.status}`)
  })().finally(() => (refreshing = null))
  return refreshing
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!access && hasSession()) await refreshTokens()
  const used = access
  let res = await send(method, path, body)
  // expired/broken access gives 401 even on public endpoints: refresh (or drop the session) and retry
  if (res.status === 401 && used) {
    if (access === used) await refreshTokens()
    res = await send(method, path, body)
  }
  if (!res.ok) {
    // error bodies may be HTML from a proxy (502…)
    const data = await res.json().catch(() => ({}))
    throw new ApiError(res.status, `${method} ${path}: ${res.status}`, data)
  }
  const text = await res.text() // 202/204 come without a body
  return (text ? JSON.parse(text) : undefined) as T
}

const get = <T>(path: string) => request<T>('GET', path)
const post = <T>(path: string, body: unknown) => request<T>('POST', path, body)

// non-empty categories, in display order, no pagination
export const getCategories = () => get<Category[]>('/categories')

// unknown category slug = empty list (not 404): check existence via getCategories()
export const getGalleries = (page = 1, limit = 20, category?: string) =>
  get<Page<Gallery>>(
    `/galleries?page=${page}&limit=${limit}` +
      (category ? `&category=${encodeURIComponent(category)}` : ''),
  )

export const getGallery = (id: string) => get<Gallery>(`/galleries/${encodeURIComponent(id)}`)

export const getGalleryPhotos = (id: string, page = 1, limit = 20) =>
  get<Page<Photo>>(`/galleries/${encodeURIComponent(id)}/photos?page=${page}&limit=${limit}`)

export const getPhoto = (id: string) => get<PhotoDetail>(`/photos/${encodeURIComponent(id)}`)

// Photos of all galleries in random order; same seed = stable order across pages.
export const getRandomPhotos = (seed: string, page = 1, limit = 20) =>
  get<Page<Photo>>(`/photos?seed=${seed}&page=${page}&limit=${limit}`)

// --- account ---

async function startSession(t: Tokens) {
  setTokens(t)
  me.value = await getMe()
}

export const getMe = () => get<Me>('/me')

// 401 = wrong credentials; 403 {code: 'email_not_confirmed'}; 429 = rate limit
export const login = (email: string, password: string) =>
  post<Tokens>('/auth/login', { email, password }).then(startSession)

export const register = (email: string, password: string) =>
  post<{ email: string }>('/auth/register', { email, password })

export const resendConfirmation = (email: string) =>
  post<void>('/auth/resend-confirmation', { email })

export const confirmEmail = (token: string) =>
  post<Tokens>('/auth/confirm-email', { token }).then(startSession)

export const confirmEmailChange = (token: string) =>
  post<{ email: string }>('/auth/confirm-email-change', { token })

export const changeEmail = (newEmail: string, password: string) =>
  post<void>('/me/email', { newEmail, password })

// other devices get logged out, this one gets a fresh pair
export const changePassword = (currentPassword: string, newPassword: string) =>
  post<Tokens>('/me/password', { currentPassword, newPassword }).then(setTokens)

export async function logout() {
  const refresh = store?.getItem(REFRESH)
  access = null // plain send: request() would spend the refresh token on a refresh first
  if (refresh) await send('POST', '/auth/logout', { refresh }).catch(() => {})
  clearTokens()
}

export const setFavorite = (photoId: string, on: boolean) =>
  request<void>(on ? 'PUT' : 'DELETE', `/me/favorites/${encodeURIComponent(photoId)}`)

// admin only; for good: files too. 404 = already gone
export const deletePhoto = (id: string) =>
  request<void>('DELETE', `/photos/${encodeURIComponent(id)}`)

// recently added first
export const getFavorites = (page = 1, limit = 20) =>
  get<Page<Photo>>(`/me/favorites?page=${page}&limit=${limit}`)
