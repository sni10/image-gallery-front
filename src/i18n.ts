import { createI18n } from 'vue-i18n'
import ru from '@/locales/ru.json'
import en from '@/locales/en.json'
import { ApiError } from '@/api'

// English is the main language. en.json is the source of truth: typed for editor autocomplete; unknown keys in
// code are caught by __tests__/i18n.spec.ts (vue-i18n's t() still accepts any string). Russian is optional.
type Schema = typeof en
declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends Schema {}
}

export const LOCALES = ['en', 'ru'] as const
export type Locale = (typeof LOCALES)[number]
const COOKIE = 'locale'

// Server side: English unless the visitor picked another language in the switcher (cookie).
// The browser's Accept-Language is deliberately ignored: English is the main language, Russian is opt-in.
export function pickLocale(cookie?: string): Locale {
  const saved = new RegExp(`(?:^|;\\s*)${COOKIE}=(\\w+)`).exec(cookie ?? '')?.[1]
  return LOCALES.includes(saved as Locale) ? (saved as Locale) : 'en'
}

// Client side, after a switch: cookie so the next server render uses it too. Unless cookies were declined
// (CookieBanner): then the choice lasts until reload.
export function saveLocale(locale: Locale) {
  if (!/(?:^|;\s*)cookies=no(?:;|$)/.test(document.cookie))
    document.cookie = `${COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`
  document.documentElement.lang = locale
}

// Russian has 3 plural forms: "1 галерея | 2 галереи | 5 галерей"
const ruRules = new Intl.PluralRules('ru')
const ruPlural = (n: number, forms: number) => {
  const form = ruRules.select(n)
  return Math.min(form === 'one' ? 0 : form === 'few' ? 1 : 2, forms - 1)
}

// ponytail: both locales bundled (a few KB); lazy-load per locale when there are many/large ones
export function createI18nFor(locale: Locale) {
  return createI18n({
    legacy: false,
    locale,
    fallbackLocale: 'en',
    messages: { en, ru },
    pluralRules: { ru: ruPlural },
  })
}

type T = ReturnType<typeof createI18nFor>['global']['t']

// Reactive to locale when called inside computed/template
export function errorMessage(t: T, e: unknown): string {
  if (!(e instanceof ApiError)) return t('errors.unknown')
  if (e.status === 0) return t('errors.network')
  if (e.status === 404) return t('errors.notFound')
  if (e.status === 429) return t('errors.tooMany')
  return t('errors.server', { status: e.status })
}
