import { computed, inject, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { HEAD_KEY } from '@/ssr'

// Page <title>, description and og:image. The server puts them into the HTML (entry-server.ts),
// the client keeps document.title/description in sync on navigation and language switch.
// Search engines show ~160 characters of a description: long page texts are cut at a word
export function snippet(text: string, max = 160) {
  text = text.replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : text.slice(0, text.lastIndexOf(' ', max - 1)) + '…'
}

export function usePageMeta(
  meta: () => { title?: string; description?: string; image?: string; noindex?: boolean },
) {
  const { t } = useI18n()
  const head = inject(HEAD_KEY)!
  head.meta = computed(() => {
    const m = meta()
    return {
      title: m.title ? `${m.title} · ${t('site.name')}` : t('site.name'),
      description: snippet(m.description ?? t('site.description')),
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
