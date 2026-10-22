import { describe, expect, it } from 'vitest'
import { snippet } from '@/composables/usePageMeta'

describe('snippet', () => {
  it('keeps short texts and cuts long ones at a word', () => {
    expect(snippet(' A  neon\ncat ')).toBe('A neon cat')
    const cut = snippet('word '.repeat(60))
    expect(cut.length).toBeLessThanOrEqual(160)
    expect(cut).toMatch(/word…$/)
  })
})
