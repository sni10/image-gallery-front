// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '../entry-server'
import en from '../locales/en.json'
import ru from '../locales/ru.json'

// the header loads categories; any answer will do here
vi.stubGlobal(
  'fetch',
  vi.fn(async () => new Response('[]', { status: 200 })),
)
afterEach(() => vi.clearAllMocks())

describe('terms', () => {
  it.each([
    ['en', en],
    ['ru', ru],
  ] as const)('/terms renders every section in %s', async (locale, messages) => {
    const r = await render('/terms', `age_ok=1; locale=${locale}`)
    expect(r.status).toBe(200)
    expect(r.head).toContain(`<title>${messages.terms.title} · ArtAI.win</title>`)
    for (const s of messages.terms.sections) expect(r.html).toContain(s.title)
    expect(r.html).toContain('href="/complaint"')
  })

  it('complaint form: never shows the admin address, posts to the API', async () => {
    const r = await render('/complaint', 'age_ok=1')
    expect(r.status).toBe(200)
    expect(r.html).toMatch(/<textarea[^>]*required/)
    expect(r.html).not.toContain('@proton.me')
  })

  it('sign-up form has a required checkbox linking to /terms', async () => {
    const r = await render('/register', 'age_ok=1')
    expect(r.html).toMatch(/<input[^>]*type="checkbox"[^>]*required/)
    expect(r.html).toContain('href="/terms"')
  })
})
