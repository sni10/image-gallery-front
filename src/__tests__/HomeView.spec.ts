// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { render } from '../entry-server'

afterEach(() => vi.unstubAllGlobals())

it('?sort= picks the feed order; unknown values fall back to random; each order has a link', async () => {
  const urls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(url)
      return new Response(JSON.stringify(url.includes('/photos') ? { items: [], total: 0 } : []))
    }),
  )
  const r = await render('/?sort=new', 'age_ok=1')
  expect(urls.some((u) => u.includes('/photos?sort=new&'))).toBe(true)
  expect(r.html).toContain('href="/?sort=popular"')

  urls.length = 0
  await render('/?sort=evil', 'age_ok=1')
  expect(urls.some((u) => u.includes('/photos?sort=random&'))).toBe(true)
})
