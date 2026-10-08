import { watchEffect } from 'vue'
import { i18n } from '@/i18n'

// Sets <title> and <meta name="description"> for the current page; re-runs on locale/data change.
// ponytail: client-side only — bots that don't run JS (social previews, some crawlers) still see
// index.html defaults; needs SSR/prerender if per-page previews matter
export function usePageMeta(meta: () => { title?: string; description?: string }) {
  watchEffect(() => {
    const { t } = i18n.global
    const { title, description } = meta()
    document.title = title ? `${title} · ${t('site.name')}` : t('site.name')
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', description ?? t('site.description'))
  })
}
