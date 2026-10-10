import { afterEach, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { createI18nFor } from '../i18n'
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
