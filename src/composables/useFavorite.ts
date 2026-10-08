import { useRoute, useRouter } from 'vue-router'
import { ApiError, hasSession, setFavorite, type Photo } from '@/api'

// Heart toggle: flips instantly, rolls back if the request fails; anonymous -> login page.
export function useFavorite() {
  const router = useRouter()
  const route = useRoute()
  const toLogin = () => router.push({ name: 'login', query: { next: route.fullPath } })

  return async function toggle(p: Photo) {
    if (!hasSession()) return toLogin()
    const on = (p.isFavorite = !p.isFavorite) // sync flip: callers can re-render right away
    try {
      await setFavorite(p.id, on)
    } catch (e) {
      p.isFavorite = !on
      if (e instanceof ApiError && e.status === 401) toLogin() // session died
    }
  }
}
