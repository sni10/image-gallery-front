import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import PhotoView from '../views/PhotoView.vue'
import { createI18nFor } from '../i18n'
import { createRouter } from '../router'
import { HEAD_KEY, STATE_KEY } from '../ssr'
import { me } from '../api'

const photo = (id: string) => ({
  id,
  title: id,
  url: `https://api/${id}.png`,
  thumbUrl: `https://api/${id}.webp`,
  width: 1,
  height: 1,
  isFavorite: false,
  tags: [],
  gallery: { id: 'g', title: 'G', category: { id: 'c', slug: 'c', title: 'C' } },
})

// fake backend: similar s1..s3 minus deleted, two per page; `paged: false` = an older API that repeats page 1
let gone: Set<string>
let similarCalls: number
function api(paged = true) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        gone.add(url.split('/').pop()!)
        return new Response(null, { status: 204 })
      }
      const u = new URL(url)
      if (u.pathname.endsWith('/similar')) {
        similarCalls++
        const page = paged ? Number(u.searchParams.get('page')) : 1
        const pool = ['s1', 's2', 's3'].filter((id) => !gone.has(id))
        return new Response(
          JSON.stringify({ items: pool.slice((page - 1) * 2, page * 2).map((id) => photo(id)) }),
        )
      }
      return new Response(JSON.stringify(photo('p1')))
    }),
  )
}

beforeEach(() => {
  gone = new Set()
  similarCalls = 0
  // the sentinel is always on screen: the list loads until it ends
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
  vi.stubGlobal('confirm', () => true)
})
afterEach(() => {
  vi.unstubAllGlobals()
  me.value = null
})

async function open() {
  const router = createRouter()
  await router.push('/photos/p1')
  const w = mount(PhotoView, {
    props: { id: 'p1' },
    global: {
      plugins: [createI18nFor('en'), router],
      provide: { [HEAD_KEY]: {}, [STATE_KEY]: reactive({}) },
    },
  })
  await flushPromises()
  return w
}
// sorted: the masonry puts them in columns, so the DOM order is not the list order
const similar = (w: Awaited<ReturnType<typeof open>>) =>
  w
    .findAll('#similar-title ~ * a[href^="/photos/"]')
    .map((a) => a.attributes('href'))
    .sort()

it('similar photos load page by page until a page comes back empty', async () => {
  api()
  const w = await open()
  expect(similar(w)).toEqual(['/photos/s1', '/photos/s2', '/photos/s3'])
  expect(similarCalls).toBe(3) // [s1, s2], [s3], []
})

it('an older API without pages: page 1 again ends the list instead of looping', async () => {
  api(false)
  const w = await open()
  expect(similar(w)).toEqual(['/photos/s1', '/photos/s2'])
  expect(similarCalls).toBe(2)
})

it('admin trash in the similar photos drops the photo from the grid', async () => {
  api()
  me.value = { id: 'u', email: 'a@b.c', dateJoined: '', isAdmin: true }
  const w = await open()
  await w.find('#similar-title ~ * button[aria-label="Delete photo"]').trigger('click')
  await flushPromises()
  expect(gone).toEqual(new Set(['s1']))
  expect(similar(w)).toEqual(['/photos/s2', '/photos/s3'])
})
