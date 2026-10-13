// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render } from '../entry-server'

const urls: string[] = []
beforeEach(() => {
  urls.length = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      urls.push(url)
      return new Response(JSON.stringify(url.includes('/photos') ? { items: [], total: 0 } : []))
    }),
  )
})
afterEach(() => vi.unstubAllGlobals())
const feed = () => urls.filter((u) => u.includes('/photos?'))

it('tag page: newest photos with that tag, indexable', async () => {
  const r = await render('/tags/neon', 'age_ok=1')
  expect(feed()[0]).toContain('sort=new')
  expect(feed()[0]).toContain('tag=neon')
  expect(r.head).toContain('<title>#neon · ArtAI.win</title>')
  expect(r.head).not.toContain('noindex')
})

it('search: popular first with q, noindex; under 2 chars no request', async () => {
  const r = await render('/search?q=%20neo%20', 'age_ok=1')
  expect(feed()[0]).toContain('sort=popular')
  expect(feed()[0]).toContain('q=neo')
  expect(r.head).toContain('noindex')
  expect(r.html).toContain('value="neo"')

  urls.length = 0
  await render('/search?q=a', 'age_ok=1')
  expect(feed()).toEqual([])
})
