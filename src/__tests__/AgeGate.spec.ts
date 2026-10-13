// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { render } from '../entry-server'

afterEach(() => vi.unstubAllGlobals())

it('server renders the age gate until the visitor agrees (cookie)', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ items: [], total: 0 }))),
  )
  expect((await render('/')).html).toContain('id="age-title"')
  const agreed = await render('/', 'locale=en; age_ok=1')
  expect(agreed.html).not.toContain('id="age-title"')
  expect(agreed.state).toContain('"ageOk":true') // client hydrates the same state
})

it('server renders the cookie banner until the visitor accepts or declines', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ items: [], total: 0 }))),
  )
  expect((await render('/', 'age_ok=1')).html).toContain('Decline')
  for (const c of ['yes', 'no']) {
    const r = await render('/', `age_ok=1; cookies=${c}`)
    expect(r.html).not.toContain('Decline')
    expect(r.state).toContain(`"cookies":"${c}"`)
  }
})
