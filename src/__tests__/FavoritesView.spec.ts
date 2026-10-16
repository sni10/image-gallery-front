import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import FavoritesView from '../views/FavoritesView.vue'
import { createI18nFor } from '../i18n'
import { createRouter } from '../router'
import { logout } from '../api'
import { HEAD_KEY } from '../ssr'
import en from '../locales/en.json'

const photo = (id: string) => ({
  id,
  title: id,
  url: `/${id}.jpg`,
  thumbUrl: `/${id}.jpg`,
  width: 1,
  height: 1,
  isFavorite: false,
})
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

// fake API: one favorite; the wave gives [a, b], then [c], then nothing. Records every call
let calls: { path: string; exclude?: string[] }[]
beforeEach(() => {
  calls = []
  // the sentinel is always on screen: the list keeps loading until its source runs out
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private cb: (e: { isIntersecting: boolean }[]) => void) {}
      observe() {
        this.cb([{ isIntersecting: true }])
      }
      unobserve() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const path = new URL(url).pathname
      if (path === '/auth/refresh') return json({ access: 'a', refresh: 'r' })
      if (path === '/me/wave') {
        const { exclude } = JSON.parse(init!.body as string) as { exclude: string[] }
        calls.push({ path, exclude })
        if (!exclude.length) return json({ items: [photo('a'), photo('b')] })
        return json({ items: exclude.includes('c') ? [] : [photo('c')] })
      }
      calls.push({ path })
      return json({ items: [photo('fav')], total: 1 }) // /me/favorites
    }),
  )
})
afterEach(async () => {
  await logout().catch(() => {})
  localStorage.clear()
  vi.unstubAllGlobals()
})

async function open() {
  const router = createRouter()
  await router.push('/account/favorites')
  const w = mount(FavoritesView, {
    global: { plugins: [createI18nFor('en'), router], provide: { [HEAD_KEY]: {} } },
  })
  await flushPromises()
  return { w, router }
}
const click = async (w: Awaited<ReturnType<typeof open>>['w'], text: string) => {
  await w
    .findAll('button')
    .find((b) => b.text() === text)!
    .trigger('click')
  await flushPromises()
}
const waveCalls = () => calls.filter((c) => c.path === '/me/wave').map((c) => c.exclude)

it('the wave goes on in the favorites grid; each batch excludes what the wave showed', async () => {
  localStorage.setItem('refresh', 'r')
  const { w } = await open()
  await click(w, en.wave.start)
  // the favorite itself is not in exclude: the server leaves favorites out on its own
  expect(waveCalls()).toEqual([[], ['a', 'b'], ['a', 'b', 'c']])
  expect(w.findAll('img').length).toBe(4) // fav + a, b, c
  expect(w.text()).toContain(en.wave.end)
})

it('stop reloads the favorites; the next wave starts with an empty exclude', async () => {
  localStorage.setItem('refresh', 'r')
  const { w } = await open()
  await click(w, en.wave.start)
  calls = []
  await click(w, en.wave.stop)
  expect(calls).toEqual([{ path: '/me/favorites' }])
  expect(w.findAll('img').length).toBe(1)

  await click(w, en.wave.start)
  expect(waveCalls()[0]).toEqual([])
})

it('without a session redirects to sign-in', async () => {
  const { router } = await open()
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login')) // lazy route chunk
  expect(router.currentRoute.value.query.next).toBe('/account/favorites')
})
