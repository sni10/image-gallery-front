import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive } from 'vue'
import CatalogView from '../views/CatalogView.vue'
import { createI18nFor } from '../i18n'
import { createRouter } from '../router'
import { HEAD_KEY, STATE_KEY } from '../ssr'

const gallery = (title: string) => ({
  id: title,
  title,
  cover: null,
  category: { slug: 'c', title: 'C' },
  photosCount: 1,
})
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

// /galleries answers one gallery named after q; the answer for "slow" waits for release()
let asked: string[]
let release: () => void
beforeEach(() => {
  asked = []
  vi.stubGlobal(
    'IntersectionObserver',
    // the sentinel is always on screen
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
    vi.fn(async (url: string) => {
      const u = new URL(url)
      if (u.pathname !== '/galleries') return json([]) // categories
      const q = u.searchParams.get('q') ?? ''
      asked.push(q)
      if (q === 'slow') await new Promise<void>((r) => (release = r))
      return json({ items: [gallery(q || 'all')], total: 1 })
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())

async function open() {
  const router = createRouter()
  await router.push('/galleries')
  const w = mount(CatalogView, {
    global: {
      plugins: [createI18nFor('en'), router],
      provide: { [HEAD_KEY]: {}, [STATE_KEY]: reactive({}) },
    },
  })
  await flushPromises()
  return w
}
const titles = (w: Awaited<ReturnType<typeof open>>) => w.findAll('h2').map((h) => h.text())

it('searches while typing, once the typing pauses', async () => {
  const w = await open()
  expect(titles(w)).toEqual(['all'])
  const input = w.find('input[type="search"]')
  await input.setValue('a')
  await input.setValue('ab')
  await pause(350)
  await flushPromises()
  expect(asked).toEqual(['', 'ab']) // no request for the half-typed "a"
  expect(titles(w)).toEqual(['ab'])
  expect(location.search).toBe('?q=ab') // shareable, without a remount
})

it('an answer for an old query that comes late is dropped', async () => {
  const w = await open()
  const input = w.find('input[type="search"]')
  await input.setValue('slow')
  await pause(350)
  await input.setValue('fast')
  await pause(350)
  await flushPromises()
  release() // "slow" answers after "fast"
  await flushPromises()
  expect(titles(w)).toEqual(['fast'])
})
