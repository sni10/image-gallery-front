import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, hasSession, setFavorite, type Photo } from '@/api'

// Photo whose last heart click failed to save; App.vue shows a toast with "retry" (= toggle it again)
export const favoriteFailed = ref<Photo | null>(null)

// Heart toggle: flips instantly, rolls back if the request fails; anonymous -> login page.
export function useFavorite() {
  const router = useRouter()
  const route = useRoute()
  const toLogin = () => router.push({ name: 'login', query: { next: route.fullPath } })

  return async function toggle(p: Photo) {
    if (!hasSession()) return toLogin()
    favoriteFailed.value = null
    const on = (p.isFavorite = !p.isFavorite) // sync flip: callers can re-render right away
    try {
      await setFavorite(p.id, on)
    } catch (e) {
      p.isFavorite = !on
      if (e instanceof ApiError && e.status === 401)
        toLogin() // session died
      else favoriteFailed.value = p
    }
  }
}
