import { ref } from 'vue'

export interface Photo {
  id: string
  title: string
  url: string | null // full version, ≤2048px long side; signed, expires (hours). null = locked for this viewer
  thumbUrl: string | null // ≤400px long side, public; null only for a locked photo without a thumb
  width: number // of the full version
  height: number
  isFavorite: boolean // always false for anonymous requests
  locked?: boolean // guest without access: url is null, sign-in opens it
  gallery?: { id: string; title: string } // where it lives; optional: older API lacks it (SPEC-photo-gallery.md)
}

// The API decides (locked, url: null). `legacy` = the old front-only guest rule for an API without `locked`.
// ponytail: drop `legacy` (and guestFree) once the backend with Photo.locked is deployed
export const isLocked = (p: Photo, legacy = false) =>
  !!p.locked || !p.url || (p.locked === undefined && legacy)

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
  cover: Photo | null // the chosen cover, else a random photo of the gallery, new on each request; null if empty
  coverId?: string | null // the chosen cover; null = none, random. Optional: older API lacks it
}

// GET /photos/{id}: the photo page
export interface PhotoDetail extends Photo {
  description: string
  tags: string[]
  gallery: Pick<Gallery, 'id' | 'title' | 'category'>
  // neighbours in the gallery's order (newest first); null at the ends. Optional: older API lacks them
  prevId?: string | null
  nextId?: string | null
}

export interface Page<T> {
  items: T[]
  total: number
}

// Private photo folders of the signed-in user (Pinterest-like boards)
export interface Collection {
  id: string
  title: string // 1–100 chars
  photosCount: number
}
export interface CollectionCard extends Collection {
  cover: Photo | null // the last added photo
  hasPhoto?: boolean // only with getCollections(photoId): is that photo in it
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
// q = gallery title contains (case-insensitive), over the whole catalog (SPEC-gallery-search.md)
export const getGalleries = (page = 1, limit = 20, category?: string, q?: string) =>
  get<Page<Gallery>>(
    `/galleries?${new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(category ? { category } : {}),
      ...(q ? { q } : {}),
    })}`,
  )

export const getGallery = (id: string) => get<Gallery>(`/galleries/${encodeURIComponent(id)}`)

// admin only (SPEC-gallery-cover.md in the backend repo): a photo of this gallery, or null = random again
export const setGalleryCover = (id: string, photoId: string | null) =>
  request<Gallery>('PATCH', `/galleries/${encodeURIComponent(id)}`, { cover: photoId })

export const getGalleryPhotos = (id: string, page = 1, limit = 20) =>
  get<Page<Photo>>(`/galleries/${encodeURIComponent(id)}/photos?page=${page}&limit=${limit}`)

export const getPhoto = (id: string) => get<PhotoDetail>(`/photos/${encodeURIComponent(id)}`)

// The home feed: photos of all galleries. random: same seed = stable order across pages;
// new / popular (most favorited) ignore the seed.
export const FEED_SORTS = ['random', 'new', 'popular'] as const
export type FeedSort = (typeof FEED_SORTS)[number]
// filter: tag = exact tag (case and a leading # ignored), q = search in tags/description/titles (2-100 chars)
export const getFeed = (
  sort: FeedSort,
  seed: string,
  page = 1,
  limit = 20,
  filter: { tag?: string; q?: string } = {},
) =>
  get<Page<Photo>>(
    `/photos?${new URLSearchParams({ sort, seed, page: String(page), limit: String(limit), ...filter })}`,
  )

// related: tags found on the same photos as this one (count = shared photos); none: most used tags
export const getTags = (related?: string, limit = 20) =>
  get<{ items: { tag: string; count: number }[] }>(
    `/tags?${new URLSearchParams({ limit: String(limit), ...(related ? { related } : {}) })}`,
  )

// Photos like this one (by picture and tags: the API decides). Pages by offset (SPEC-similar-pages.md in the
// backend repo), no total: an empty page = the end. An older API ignores page and repeats page 1
export const getSimilar = (id: string, page = 1, limit = 24) =>
  get<{ items: Photo[] }>(`/photos/${encodeURIComponent(id)}/similar?page=${page}&limit=${limit}`)

// --- account ---

async function startSession(t: Tokens) {
  setTokens(t)
  me.value = await getMe()
}

export const getMe = () => get<Me>('/me')

// 401 = wrong credentials; 403 {code: 'email_not_confirmed'}; 429 = rate limit
export const login = (email: string, password: string) =>
  post<Tokens>('/auth/login', { email, password }).then(startSession)

// Date of the current Terms of Use (shown on /terms). Bump it when the text changes: the backend stores
// which version each user accepted (SPEC-terms-acceptance.md in the backend repo).
export const TERMS_VERSION = '2026-10-12'
// Date of the current Privacy Policy (/privacy); front only, nobody accepts it
export const PRIVACY_VERSION = '2026-10-13'

export const register = (email: string, password: string, captcha: string) =>
  post<{ email: string }>('/auth/register', {
    email,
    password,
    captcha,
    termsAccepted: true, // the form can't be sent without the checkbox
    termsVersion: TERMS_VERSION,
  })

// Complaint about content, emailed to the admin by the backend (SPEC-complaints.md in the backend repo).
// 400 field errors (email / photoUrl / message / captcha); 429 = rate limit
export const sendComplaint = (email: string, photoUrl: string, message: string, captcha: string) =>
  post<void>('/complaints', { email, photoUrl, message, captcha })

// captcha = Turnstile token on every endpoint that sends an email (SPEC-complaint-captcha.md)
export const resendConfirmation = (email: string, captcha: string) =>
  post<void>('/auth/resend-confirmation', { email, captcha })

// Forgot password (SPEC-password-reset.md in the backend repo): always 204, says nothing about who exists
export const requestPasswordReset = (email: string, captcha: string) =>
  post<void>('/auth/password-reset', { email, captcha })

// link from the email; 400 {token} = bad/expired link, {password} = weak. Logs in, other devices logged out
export const resetPassword = (token: string, password: string) =>
  post<Tokens>('/auth/password-reset/confirm', { token, password }).then(startSession)

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

// For good: account, favorites, sessions (SPEC-privacy.md in the backend repo).
// 400 {password} = wrong password; 403 = staff accounts can't be deleted this way
export async function deleteAccount(password: string) {
  await request<void>('DELETE', '/me', { password })
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

// "My wave" (SPEC-similar-wave.md in the backend repo): picks by the favorites, never one of them. The server
// keeps no state: the page sends the ids it has shown in this wave (the last 2 000, the API's cap).
// Empty items = nothing more to show
export const getWave = (shown: string[], limit = 24) =>
  post<{ items: Photo[] }>('/me/wave', { exclude: shown.slice(-2000), limit })

// --- collections (all need a session; someone else's collection = 404) ---

// recently changed first. 400 {code: 'limit'}: 100 collections / 1000 photos per collection
export const getCollections = (photoId?: string) =>
  get<CollectionCard[]>(
    '/me/collections' + (photoId ? `?photo=${encodeURIComponent(photoId)}` : ''),
  )
export const createCollection = (title: string) =>
  post<CollectionCard>('/me/collections', { title })
export const renameCollection = (id: string, title: string) =>
  request<CollectionCard>('PATCH', `/me/collections/${encodeURIComponent(id)}`, { title })
export const deleteCollection = (id: string) =>
  request<void>('DELETE', `/me/collections/${encodeURIComponent(id)}`)
export const getCollection = (id: string) =>
  get<Collection>(`/me/collections/${encodeURIComponent(id)}`)
// recently added first
export const getCollectionPhotos = (id: string, page = 1, limit = 20) =>
  get<Page<Photo>>(`/me/collections/${encodeURIComponent(id)}/photos?page=${page}&limit=${limit}`)
// both idempotent: adding twice / removing a missing one is still 204
export const setInCollection = (id: string, photoId: string, on: boolean) =>
  request<void>(
    on ? 'PUT' : 'DELETE',
    `/me/collections/${encodeURIComponent(id)}/photos/${encodeURIComponent(photoId)}`,
  )
