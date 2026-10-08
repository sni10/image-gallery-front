import { renderToString } from 'vue/server-renderer'
import { createApp } from './main'
import { pickLocale } from './i18n'

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function render(url: string, cookie?: string, acceptLanguage?: string) {
  const lang = pickLocale(cookie, acceptLanguage)
  const { app, router, state, head } = createApp(lang)

  await router.push(url)
  await router.isReady()

  // components may set ctx.status (e.g. 404 for an unknown gallery) via useSSRContext()
  const ctx: { status?: number } = {}
  const html = await renderToString(app, ctx)

  const m = head.meta?.value
  const tags = m
    ? [
        `<title>${esc(m.title)}</title>`,
        `<meta name="description" content="${esc(m.description)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:title" content="${esc(m.title)}">`,
        `<meta property="og:description" content="${esc(m.description)}">`,
        m.image ? `<meta property="og:image" content="${esc(m.image)}">` : '',
      ]
        .filter(Boolean)
        .join('\n    ')
    : ''

  return {
    html,
    head: tags,
    lang,
    // `<` escaped so data can't close the <script> it's embedded in
    state: `<script>window.__SSR_STATE__=${JSON.stringify(state).replace(/</g, '\\u003c')}</script>`,
    status: router.currentRoute.value.name === 'not-found' ? 404 : (ctx.status ?? 200),
  }
}
