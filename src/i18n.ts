import { watchEffect } from 'vue'
import { createI18n } from 'vue-i18n'
import ru from '@/locales/ru.json'
import en from '@/locales/en.json'
import { ApiError } from '@/api'

// ru.json is the source of truth: typed for editor autocomplete; unknown keys in code
// are caught by __tests__/i18n.spec.ts (vue-i18n's t() still accepts any string)
type Schema = typeof ru
declare module 'vue-i18n' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefineLocaleMessage extends Schema {}
}

export const LOCALES = ['ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]
const STORAGE_KEY = 'locale'

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LOCALES.includes(saved as Locale)) return saved as Locale
  } catch {
    // storage blocked (private mode etc.) — fall through to browser language
  }
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

// Russian has 3 plural forms: "1 галерея | 2 галереи | 5 галерей"
const ruRules = new Intl.PluralRules('ru')
const ruPlural = (n: number, forms: number) => {
  const form = ruRules.select(n)
  return Math.min(form === 'one' ? 0 : form === 'few' ? 1 : 2, forms - 1)
}

// ponytail: both locales bundled (a few KB); lazy-load per locale when there are many/large ones
export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'ru',
  messages: { ru, en },
  pluralRules: { ru: ruPlural },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // not persisted, still switched for this visit
  }
}

watchEffect(() => (document.documentElement.lang = i18n.global.locale.value))

// Reactive to locale when called inside computed/template
export function errorMessage(e: unknown): string {
  const { t } = i18n.global
  if (!(e instanceof ApiError)) return t('errors.unknown')
  if (e.status === 0) return t('errors.network')
  if (e.status === 404) return t('errors.notFound')
  return t('errors.server', { status: e.status })
}
