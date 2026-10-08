import { ref, computed, onMounted, onUnmounted, useTemplateRef, type Ref } from 'vue'
import { ApiError, type Page } from '@/api'
import { errorMessage } from '@/i18n'

// Infinite scroll: loads the next page when the element with ref="sentinel" nears the viewport.
export function useInfiniteList<T extends { id: string }>(
  fetchPage: (page: number) => Promise<Page<T>>,
) {
  const items = ref([]) as Ref<T[]>
  const total = ref(0)
  const page = ref(0)
  const loading = ref(false)
  const failure = ref<unknown>(null)
  // computed, so the message follows a language switch
  const error = computed(() => (failure.value ? errorMessage(failure.value) : ''))
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

  onMounted(() => {
    // ponytail: native IntersectionObserver, no scroll listeners/libs
    observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: '400px',
    })
    observer.observe(sentinel.value!)
  })
  onUnmounted(() => observer?.disconnect())

  return { items, total, loading, error, canRetry, empty, loadMore }
}
