import { describe, it, expect } from 'vitest'
import { getPhotos } from '../api/photos'

describe('photos stub', () => {
  it('paginates and stops at total', async () => {
    const p1 = await getPhotos(1, 20)
    const last = Math.ceil(p1.total / 20)
    const pLast = await getPhotos(last, 20)
    const pAfter = await getPhotos(last + 1, 20)
    expect(p1.items).toHaveLength(20)
    expect(p1.items[0]!.id).toBe('1')
    expect(pLast.items[pLast.items.length - 1]!.id).toBe(String(p1.total))
    expect(pAfter.items).toHaveLength(0)
  })
})
