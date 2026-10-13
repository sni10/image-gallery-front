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
  // An empty page = the end, even if items < total: a removal or an upload during scroll shifts the page
  // offsets, so the loaded count may never reach total. Without this the sentinel loops on empty pages forever.
  const done = ref(false)

  async function loadMore() {
    if (loading.value || done.value || (page.value > 0 && items.value.length >= total.value)) return
    loading.value = true
    failure.value = null
    try {
      const res = await fetchPage(page.value + 1)
      // newest-first + page offsets: uploads during scroll shift pages, skip repeats
      const seen = new Set(items.value.map((p) => p.id))
      items.value.push(...res.items.filter((p) => !seen.has(p.id)))
      total.value = res.total
      page.value++
      done.value = res.items.length === 0
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
    // server rendered anonymously (locked, isFavorite=false): replace page 1 with the token's answer.
    // Whole page, not a merge by id: the guest home feed puts open photos first, so a signed-in page 1
    // holds other photos; a merge kept the guest's locked ones between two signed-in pages.
    if (ssr && page.value === 1 && hasSession()) {
      const guestCount = items.value.length
      fetchPage(1)
        .then((res) => {
          const fresh = new Set(res.items.map((i) => i.id))
          // pages 2+ loaded meanwhile already came with the token: keep them
          const later = items.value.slice(guestCount).filter((i) => !fresh.has(i.id))
          items.value = [...res.items, ...later]
          total.value = res.total
        })
        .catch(() => {})
    }
    // ponytail: native IntersectionObserver, no scroll listeners/libs
    observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: '400px',
    })
    observer.observe(sentinel.value!)
  })
  onUnmounted(() => observer?.disconnect())

  // ponytail: later pages are offset-based, so the next page may skip one photo per removal until reload
  function remove(id: string) {
    const before = items.value.length
    items.value = items.value.filter((i) => i.id !== id)
    if (items.value.length < before) total.value--
  }

  return { items, total, loading, error, canRetry, empty, loadMore, remove }
}
