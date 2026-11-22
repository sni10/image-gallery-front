// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { render } from '../entry-server'

afterEach(() => vi.unstubAllGlobals())

it('server renders the cookie banner until the visitor accepts or declines', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ items: [], total: 0 }))),
  )
  expect((await render('/')).html).toContain('Decline')
  for (const c of ['yes', 'no']) {
    const r = await render('/', `cookies=${c}`)
    expect(r.html).not.toContain('Decline')
    expect(r.state).toContain(`"cookies":"${c}"`)
  }
})
