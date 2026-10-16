import { afterEach, expect, it, vi } from 'vitest'
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

afterEach(() => {
  vi.unstubAllGlobals()
  me.value = null
})

it('admin trash in the similar photos: the photo goes, the next similar one takes its place', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('confirm', () => true)
  // fake backend: the two most similar of s1..s3 that are not deleted
  const gone = new Set<string>()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        gone.add(url.split('/').pop()!)
        return new Response(null, { status: 204 })
      }
      if (url.includes('/similar')) {
        const items = ['s1', 's2', 's3'].filter((id) => !gone.has(id)).slice(0, 2)
        return new Response(JSON.stringify({ items: items.map(photo) }))
      }
      return new Response(JSON.stringify(photo('p1')))
    }),
  )
  me.value = { id: 'u', email: 'a@b.c', dateJoined: '', isAdmin: true }
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
  const similar = () =>
    w.findAll('#similar-title ~ * a[href^="/photos/"]').map((a) => a.attributes('href'))
  expect(similar()).toEqual(['/photos/s1', '/photos/s2'])

  await w.find('#similar-title ~ * button[aria-label="Delete photo"]').trigger('click')
  await flushPromises()
  expect(similar()).toEqual(['/photos/s2', '/photos/s3'])
})
