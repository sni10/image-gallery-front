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
