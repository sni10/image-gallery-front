import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import PhotoGrid from '../components/PhotoGrid.vue'
import { createI18nFor } from '../i18n'
import { createRouter } from '../router'
import { me, type Me, type Photo } from '../api'

const deletePhoto = vi.hoisted(() => vi.fn<(id: string) => Promise<void>>(async () => {}))
vi.mock('../api', async (orig) => ({ ...(await orig<typeof import('../api')>()), deletePhoto }))

const photo: Photo = {
  id: 'p1',
  title: 'P',
  url: '/p.jpg',
  thumbUrl: '/t.jpg',
  width: 100,
  height: 100,
  isFavorite: false,
}
const user = (isAdmin: boolean): Me => ({ id: 'u', email: 'a@b.c', dateJoined: '', isAdmin })

function grid() {
  return mount(PhotoGrid, {
    props: { items: [photo], total: 1, loadMore: async () => {}, alt: () => '' },
    global: { plugins: [createI18nFor('en'), createRouter()] },
  })
}
const trash = (w: ReturnType<typeof grid>) => w.find('button[aria-label="Delete photo"]')

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
  deletePhoto.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
  me.value = null
})

describe('admin trash', () => {
  it.each([
    ['guest', null],
    ['user', user(false)],
  ])('hidden for a %s', (_, who) => {
    me.value = who
    expect(trash(grid()).exists()).toBe(false)
  })

  it('confirmed: deletes and asks the parent to drop the photo', async () => {
    me.value = user(true)
    vi.stubGlobal('confirm', () => true)
    const w = grid()
    await trash(w).trigger('click')
    await flushPromises()
    expect(deletePhoto).toHaveBeenCalledWith('p1')
    expect(w.emitted('delete')).toEqual([['p1']])
  })

  it('cancelled: no request', async () => {
    me.value = user(true)
    vi.stubGlobal('confirm', () => false)
    const w = grid()
    await trash(w).trigger('click')
    expect(deletePhoto).not.toHaveBeenCalled()
    expect(w.emitted('delete')).toBeUndefined()
  })
})
