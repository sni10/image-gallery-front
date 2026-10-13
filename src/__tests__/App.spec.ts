import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiError, deleteAccount, getGallery, logout, register, TERMS_VERSION } from '../api'

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

describe('register', () => {
  it('sends the accepted terms version', async () => {
    respond(201, { email: 'a@b.c' })
    await register('a@b.c', 'secret-pass')
    const body = JSON.parse((vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string)
    expect(body).toMatchObject({ termsAccepted: true, termsVersion: TERMS_VERSION })
  })
})

describe('session', () => {
  // routes fake API responses by path; records calls
  function api(routes: Record<string, () => Response>) {
    const calls: { path: string; auth: string | null }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const path = new URL(url).pathname
        calls.push({ path, auth: new Headers(init.headers).get('Authorization') })
        return routes[path]!()
      }),
    )
    return calls
  }
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

  it('parallel requests share one refresh (refresh token is single-use)', async () => {
    localStorage.setItem('refresh', 'r1')
    const calls = api({
      '/auth/refresh': () => json({ access: 'a2', refresh: 'r2' }),
      '/galleries/1': () => json({ id: '1' }),
    })
    await Promise.all([getGallery('1'), getGallery('1')])
    expect(calls.filter((c) => c.path === '/auth/refresh')).toHaveLength(1)
    expect(calls.filter((c) => c.path === '/galleries/1').map((c) => c.auth)).toEqual([
      'Bearer a2',
      'Bearer a2',
    ])
    expect(localStorage.getItem('refresh')).toBe('r2')
  })

  it('deleteAccount: DELETE /me with the password, then the session is gone; wrong password keeps it', async () => {
    localStorage.setItem('refresh', 'r1')
    const sent: unknown[] = []
    let status = 400
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        if (new URL(url).pathname === '/auth/refresh') return json({ access: 'a', refresh: 'r2' })
        sent.push([init.method, new URL(url).pathname, JSON.parse(init.body as string)])
        return status === 204
          ? new Response(null, { status })
          : json({ password: ['Wrong password.'] }, status)
      }),
    )
    await expect(deleteAccount('bad')).rejects.toMatchObject({ status: 400 })
    expect(localStorage.getItem('refresh')).not.toBeNull()
    status = 204
    await deleteAccount('good')
    expect(sent[sent.length - 1]).toEqual(['DELETE', '/me', { password: 'good' }])
    expect(localStorage.getItem('refresh')).toBeNull()
  })

  it('dead refresh drops the session and retries anonymously', async () => {
    const calls = api({
      '/auth/logout': () => new Response(null, { status: 204 }),
      '/auth/refresh': () => json({}, 401),
      '/galleries/1': () => json({ id: '1' }),
    })
    await logout() // drop in-memory access left by the previous test
    localStorage.setItem('refresh', 'dead')
    await expect(getGallery('1')).resolves.toMatchObject({ id: '1' })
    expect(localStorage.getItem('refresh')).toBeNull()
    expect(calls[calls.length - 1]).toEqual({ path: '/galleries/1', auth: null })
  })
})
