import { computed, inject, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { HEAD_KEY } from '@/ssr'

// Page <title>, description and og:image. The server puts them into the HTML (entry-server.ts),
// the client keeps document.title/description in sync on navigation and language switch.
export function usePageMeta(
  meta: () => { title?: string; description?: string; image?: string; noindex?: boolean },
) {
  const { t } = useI18n()
  const head = inject(HEAD_KEY)!
  head.meta = computed(() => {
    const m = meta()
    return {
      title: m.title ? `${m.title} · ${t('site.name')}` : t('site.name'),
      description: m.description ?? t('site.description'),
      image: m.image,
      noindex: m.noindex,
    }
  })

  if (import.meta.env.SSR) return
  watchEffect(() => {
    const { title, description } = head.meta!.value
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  })
}
