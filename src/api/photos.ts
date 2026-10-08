export interface Photo {
  id: string
  title: string
  url: string
  thumbUrl: string
  width: number
  height: number
}

export interface Page<T> {
  items: T[]
  total: number
}

const API_URL = import.meta.env.VITE_API_URL as string | undefined

// ponytail: stub until REST is ready — set VITE_API_URL and the real fetch kicks in
async function stubPhotos(page: number, limit: number): Promise<Page<Photo>> {
  await new Promise((r) => setTimeout(r, 500)) // fake network latency
  const total = 1000
  const start = (page - 1) * limit
  const items = Array.from({ length: Math.max(0, Math.min(limit, total - start)) }, (_, i) => {
    const n = start + i + 1
    return {
      id: String(n),
      title: `Photo #${n}`,
      url: `https://picsum.photos/seed/${n}/1600/1067`,
      thumbUrl: `https://picsum.photos/seed/${n}/400/267`,
      width: 1600,
      height: 1067,
    }
  })
  return { items, total }
}

export async function getPhotos(page = 1, limit = 20): Promise<Page<Photo>> {
  if (!API_URL) return stubPhotos(page, limit)
  const res = await fetch(`${API_URL}/photos?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error(`GET /photos failed: ${res.status}`)
  return res.json()
}
