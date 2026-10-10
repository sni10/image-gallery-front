// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '../entry-server'

const photo = {
  id: 'p1',
  title: 'Neon cat',
  description: '',
  tags: ['cat'],
  url: 'https://api/p.png',
  thumbUrl: 'https://api/t.webp',
  width: 100,
  height: 100,
  isFavorite: false,
  gallery: { id: 'g1', title: 'Cats', category: { id: 'c1', slug: 'ai', title: 'AI' } },
  prevId: null,
  nextId: 'p2',
}
const respond = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  )

afterEach(() => vi.unstubAllGlobals())

describe('photo page SSR', () => {
  it('puts title, og:image (thumb) and canonical into head, crumbs into html', async () => {
    respond(200, photo)
    const r = await render('/photos/p1?utm=x', undefined, 'https://artai.win')
    expect(r.status).toBe(200)
    expect(r.head).toContain('<title>Neon cat · ArtAI.win</title>')
    expect(r.head).toContain('Photo &quot;Neon cat&quot; from the gallery &quot;Cats&quot;')
    expect(r.head).toContain('<meta property="og:image" content="https://api/t.webp">')
    expect(r.head).toContain('<link rel="canonical" href="https://artai.win/photos/p1">')
    expect(r.html).toContain('href="/galleries/g1"')
    expect(r.html).toContain('href="/categories/ai"')
  })

  it('arrows to gallery neighbours (none at the start), tags under the photo', async () => {
    respond(200, photo)
    const r = await render('/photos/p1', 'age_ok=1')
    expect(r.html).toContain('href="/photos/p2"')
    expect(r.html).toContain('rel="next"')
    expect(r.html).not.toContain('rel="prev"')
    expect(r.html).toContain('#cat')
    expect(r.html).toContain('blur-2xl') // server renders as a guest
  })

  it('unknown photo: 404, no canonical', async () => {
    respond(404)
    const r = await render('/photos/nope', undefined, 'https://artai.win')
    expect(r.status).toBe(404)
    expect(r.head).not.toContain('canonical')
  })
})

describe('photo page lock from the API', () => {
  it('locked: blurred thumb, the original url is nowhere in the page', async () => {
    respond(200, { ...photo, url: null, locked: true })
    const r = await render('/photos/p1', 'age_ok=1')
    expect(r.html).toContain('src="https://api/t.webp"')
    expect(r.html).toContain('blur-2xl')
    expect(r.html + r.state).not.toContain('p.png')
  })

  it('free for guests (first photos of a gallery): the original, no blur', async () => {
    respond(200, { ...photo, locked: false })
    const r = await render('/photos/p1', 'age_ok=1')
    expect(r.html).toContain('src="https://api/p.png"')
    expect(r.html).not.toContain('blur-2xl')
  })
})
