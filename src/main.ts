import './assets/main.css'
import { createSSRApp, reactive } from 'vue'

import App from './App.vue'
import { createRouter } from './router'
import { createI18nFor, type Locale } from './i18n'
import { STATE_KEY, HEAD_KEY, type SsrState, type Head } from './ssr'

// Fresh instances per call: the server renders every request with its own app.
export function createApp(locale: Locale, initialState: SsrState = {}) {
  const app = createSSRApp(App)
  const router = createRouter()
  const state = reactive(initialState)
  const head: Head = {}

  app.use(router)
  app.use(createI18nFor(locale))
  app.provide(STATE_KEY, state)
  app.provide(HEAD_KEY, head)

  return { app, router, state, head }
}
