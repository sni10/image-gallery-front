import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createApp } from '../main'

const photo = (id: string, prevId: string | null, nextId: string | null) => ({
  id,
  title: id,
  description: '',
  tags: [],
  url: '/p.png',
  thumbUrl: '/t.webp',
  width: 1,
  height: 1,
  isFavorite: false,
  gallery: { id: 'g', title: 'G', category: { id: 'c', slug: 'c', title: 'C' } },
  prevId,
  nextId,
})

afterEach(() => vi.unstubAllGlobals())

it('arrow keys go to the gallery neighbours, not while typing', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const id = new URL(url).pathname.split('/').pop()!
      return new Response(JSON.stringify(photo(id, id === 'b' ? 'a' : null, 'b')))
    }),
  )
  const { app, router } = createApp('en')
  await router.push('/photos/b')
  app.mount(document.createElement('div'))
  await flushPromises()

  const press = (key: string, target: EventTarget = window) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  const input = document.body.appendChild(document.createElement('input'))
  press('ArrowLeft', input)
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/photos/b')

  press('ArrowLeft')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/photos/a')
  app.unmount()
})
