import {
  ref,
  computed,
  toRefs,
  onMounted,
  onUnmounted,
  onServerPrefetch,
  useTemplateRef,
  type Ref,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, hasSession, type Page } from '@/api'
import { errorMessage } from '@/i18n'
import { useSsrState } from '@/ssr'

// Infinite scroll: loads the next page when the element with ref="sentinel" nears the viewport.
// The first page is fetched during server render and handed to the client under `key`;
// ssr=false (private lists): client-only, fresh on every mount.
export function useInfiniteList<T extends { id: string }>(
  key: string,
  fetchPage: (page: number) => Promise<Page<T>>,
  ssr = true,
) {
  const { t } = useI18n()
  const init = () => ({ items: [] as T[], total: 0, page: 0 })
  const state = ssr ? useSsrState(key, init) : (ref(init()) as Ref<ReturnType<typeof init>>)
  const { items, total, page } = toRefs(state.value)
  const loading = ref(false)
  const failure = ref<unknown>(null)
  // computed, so the message follows a language switch
  const error = computed(() => (failure.value ? errorMessage(t, failure.value) : ''))
  const canRetry = ref(true)
  const empty = computed(() => page.value > 0 && total.value === 0)
  const sentinel = useTemplateRef<HTMLElement>('sentinel')
  let observer: IntersectionObserver | undefined

  async function loadMore() {
    if (loading.value || (page.value > 0 && items.value.length >= total.value)) return
    loading.value = true
    failure.value = null
    try {
      const res = await fetchPage(page.value + 1)
      // newest-first + page offsets: uploads during scroll shift pages, skip repeats
      const seen = new Set(items.value.map((p) => p.id))
      items.value.push(...res.items.filter((p) => !seen.has(p.id)))
      total.value = res.total
      page.value++
    } catch (e) {
      failure.value = e
      // 4xx won't fix itself on retry (bad id / params); network errors and 5xx might
      canRetry.value = !(e instanceof ApiError && e.status >= 400 && e.status < 500)
    } finally {
      loading.value = false
    }
    // re-observe: fires again if the sentinel is still on screen (tall viewport)
    if (!failure.value && sentinel.value) {
      observer?.unobserve(sentinel.value)
      observer?.observe(sentinel.value)
    }
  }

  // server: first page goes into the HTML; if it fails there, the client simply loads it
  if (ssr) onServerPrefetch(loadMore)
  onMounted(() => {
    // server rendered anonymously (isFavorite=false): re-fetch page 1 with the token
    if (ssr && page.value === 1 && hasSession())
      fetchPage(1)
        .then((res) => {
          const fresh = new Map(res.items.map((i) => [i.id, i]))
          items.value = items.value.map((i) => fresh.get(i.id) ?? i)
        })
        .catch(() => {})
    // ponytail: native IntersectionObserver, no scroll listeners/libs
    observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: '400px',
    })
    observer.observe(sentinel.value!)
  })
  onUnmounted(() => observer?.disconnect())

  return { items, total, loading, error, canRetry, empty, loadMore }
}
