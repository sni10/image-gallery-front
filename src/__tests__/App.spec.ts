import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError, getGallery } from '../api'

const respond = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )

afterEach(() => vi.unstubAllGlobals())

describe('api errors', () => {
  it('returns JSON on 200', async () => {
    respond(200, { id: '1', title: 'Горы', photosCount: 0, cover: null })
    await expect(getGallery('1')).resolves.toMatchObject({ title: 'Горы' })
  })

  it('404 is a non-retryable ApiError', async () => {
    respond(404)
    await expect(getGallery('999')).rejects.toMatchObject({ status: 404 })
  })

  it('5xx is ApiError with status', async () => {
    respond(500)
    const e = await getGallery('1').catch((e: unknown) => e)
    expect(e).toBeInstanceOf(ApiError)
    expect((e as ApiError).status).toBe(500)
  })

  it('network failure is ApiError with status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await expect(getGallery('1')).rejects.toMatchObject({ status: 0 })
  })
})
