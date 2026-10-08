export interface Photo {
  id: string
  title: string
  url: string // full version, ≤2048px long side
  thumbUrl: string // ≤400px long side
  width: number // of the full version
  height: number
}

export interface Gallery {
  id: string
  title: string
  photosCount: number
  cover: Photo | null // random photo of the gallery, new on each request; null if empty
}

export interface Page<T> {
  items: T[]
  total: number
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined

async function get<T>(path: string): Promise<T> {
  // status 0 = network failure; UI text comes from errorMessage() in i18n.ts
  const res = await fetch(`${API_URL}${path}`).catch(() => {
    throw new ApiError(0, `GET ${path}: network error`)
  })
  if (!res.ok) throw new ApiError(res.status, `GET ${path}: ${res.status}`)
  return res.json()
}

export const getGalleries = (page = 1, limit = 20) =>
  get<Page<Gallery>>(`/galleries?page=${page}&limit=${limit}`)

export const getGallery = (id: string) => get<Gallery>(`/galleries/${encodeURIComponent(id)}`)

export const getGalleryPhotos = (id: string, page = 1, limit = 20) =>
  get<Page<Photo>>(`/galleries/${encodeURIComponent(id)}/photos?page=${page}&limit=${limit}`)
