import { inject, onMounted, onServerPrefetch } from 'vue'
import { getCategories, type Category } from '@/api'
import { STATE_KEY, useSsrState } from '@/ssr'

// one request per app instance (= per server render), however many components ask
const pending = new WeakMap<object, Promise<void>>()

// Category list (header menu, category pages), shared via SSR state.
// null = not loaded (yet / failed). `ready` resolves once loading is done.
export function useCategories() {
  const state = inject(STATE_KEY)!
  const categories = useSsrState<Category[] | null>('categories', () => null)
  function load() {
    if (categories.value) return Promise.resolve()
    if (!pending.has(state))
      pending.set(
        state,
        getCategories()
          .then((c) => void (categories.value = c))
          .catch(() => void pending.delete(state)), // retried by the next mount
      )
    return pending.get(state)!
  }
  onServerPrefetch(load)
  onMounted(load)
  return { categories, ready: load }
}
