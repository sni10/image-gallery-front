import { createApp } from './main'
import { LOCALES, type Locale } from './i18n'

declare global {
  interface Window {
    __SSR_STATE__?: Record<string, unknown>
  }
}

// Same locale and data the server rendered with, so hydration matches the HTML.
const lang = document.documentElement.lang as Locale
const { app, router } = createApp(LOCALES.includes(lang) ? lang : 'ru', window.__SSR_STATE__)

router.isReady().then(() => app.mount('#app'))
