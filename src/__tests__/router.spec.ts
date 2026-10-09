import { afterEach, describe, expect, it } from 'vitest'
import { createRouter } from '../router'

const signIn = () => localStorage.setItem('refresh', 'some-refresh-token') // what api.ts keeps for a session

describe('guest-only pages', () => {
  afterEach(() => localStorage.clear())

  it.each(['/login', '/register'])(
    '%s redirects a signed-in visitor to the account page',
    async (path) => {
      signIn()
      const router = createRouter()
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('account')
    },
  )

  it.each(['/login', '/register'])('%s stays open for a guest', async (path) => {
    const router = createRouter()
    await router.push(path)
    expect(router.currentRoute.value.path).toBe(path)
  })

  it.each(['/confirm-email', '/confirm-email-change'])(
    '%s stays open with a session (email links)',
    async (path) => {
      signIn()
      const router = createRouter()
      await router.push(path)
      expect(router.currentRoute.value.path).toBe(path)
    },
  )
})
