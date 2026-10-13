import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createI18nFor } from '../i18n'
import { STATE_KEY } from '../ssr'
import { useInfiniteList } from '../composables/useInfiniteList'
import type { Page } from '../api'

afterEach(() => vi.unstubAllGlobals())

it('an empty page ends the list even if fewer than total were loaded (no endless loading loop)', async () => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  // a removal shifted the offsets: page 2 is empty although only 2 of total=3 arrived
  const fetchPage = vi.fn<(page: number) => Promise<Page<{ id: string }>>>(async (page) =>
    page === 1 ? { items: [{ id: 'a' }, { id: 'b' }], total: 3 } : { items: [], total: 3 },
  )
  let list!: ReturnType<typeof useInfiniteList<{ id: string }>>
  mount(
    defineComponent({
      setup() {
        list = useInfiniteList('t', fetchPage, false)
        return () => h('div', { ref: 'sentinel' })
      },
    }),
    { global: { plugins: [createI18nFor('en')] } },
  )
  for (let i = 0; i < 4; i++) await list.loadMore()
  expect(fetchPage).toHaveBeenCalledTimes(2)
  expect(list.loading.value).toBe(false)
})

it('signed in: the anonymous server page 1 is replaced whole, even when the token reorders it', async () => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  localStorage.setItem('refresh', 'r')
  // guest home feed: open photos first; signed in: other photos on page 1, none locked
  const state = { t: { items: [{ id: 'open' }, { id: 'shut', locked: true }], total: 4, page: 1 } }
  const fetchPage = vi.fn(async () => ({ items: [{ id: 'x' }, { id: 'open' }], total: 4 }))
  let list!: ReturnType<typeof useInfiniteList<{ id: string; locked?: boolean }>>
  mount(
    defineComponent({
      setup() {
        list = useInfiniteList('t', fetchPage)
        return () => h('div', { ref: 'sentinel' })
      },
    }),
    { global: { plugins: [createI18nFor('en')], provide: { [STATE_KEY]: state } } },
  )
  await flushPromises()
  localStorage.removeItem('refresh')
  expect(list.items.value.map((i) => i.id)).toEqual(['x', 'open'])
})
