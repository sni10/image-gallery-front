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

it('admin trash in the similar photos drops the photo from the grid', async () => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  vi.stubGlobal('confirm', () => true)
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 })
      if (url.includes('/similar'))
        return new Response(JSON.stringify({ items: [photo('s1'), photo('s2')] }))
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
  expect(similar()).toEqual(['/photos/s2'])
})
