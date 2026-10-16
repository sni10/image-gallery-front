import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import WaveView from '../views/WaveView.vue'
import { createI18nFor } from '../i18n'
import { createRouter } from '../router'
import { logout } from '../api'
import en from '../locales/en.json'
import { HEAD_KEY } from '../ssr'

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

// fake wave: [a, b], then [c], then nothing; records every exclude sent
let excludes: string[][]
beforeEach(() => {
  excludes = []
  // the sentinel is always on screen: the list keeps loading until the wave ends
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
      // by suffix: the API base comes from the env and may be empty here
      if (url.endsWith('/auth/refresh')) return json({ access: 'a', refresh: 'r' })
      if (url.endsWith('/me/wave')) {
        const { exclude } = JSON.parse(init!.body as string) as { exclude: string[] }
        excludes.push(exclude)
        const items = !exclude.length
          ? [photo('a'), photo('b')]
          : exclude.includes('c')
            ? []
            : [photo('c')]
        return json({ items })
      }
      return json({ items: [], total: 0 }) // favorites count
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
  await router.push('/account/wave')
  const w = mount(WaveView, {
    global: { plugins: [createI18nFor('en'), router], provide: { [HEAD_KEY]: {} } },
  })
  await flushPromises()
  return { w, router }
}

it('each batch excludes what was shown; refresh starts over with an empty exclude', async () => {
  localStorage.setItem('refresh', 'r')
  const { w } = await open()
  expect(excludes).toEqual([[], ['a', 'b'], ['a', 'b', 'c']])
  expect(w.text()).toContain(en.wave.end)

  excludes = []
  await w.find('button').trigger('click') // "Refresh the wave"
  await flushPromises()
  expect(excludes[0]).toEqual([])
})

it('without a session redirects to sign-in', async () => {
  const { router } = await open()
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login')) // lazy route chunk
  expect(router.currentRoute.value.query.next).toBe('/account/wave')
})
