import { describe, it, expect } from 'vitest'
import ru from '../locales/ru.json'
import en from '../locales/en.json'
import { i18n, setLocale, errorMessage } from '../i18n'
import { ApiError } from '../api'

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  )

describe('i18n', () => {
  it('every locale has exactly the keys of ru.json', () => {
    expect(keys(en).sort()).toEqual(keys(ru).sort())
  })

  it("every t('key') used in source exists in ru.json", () => {
    const sources = import.meta.glob(['../**/*.{vue,ts}', '!../__tests__/**'], {
      query: '?raw',
      import: 'default',
      eager: true,
    }) as Record<string, string>
    const known = new Set(keys(ru))
    const used = Object.entries(sources).flatMap(([file, code]) =>
      [...code.matchAll(/\bt\(\s*'([\w.]+)'/g)].map((m) => `${m[1]} (${file})`),
    )
    expect(used.length).toBeGreaterThan(10)
    expect(used.filter((u) => !known.has(u.split(' ')[0]!))).toEqual([])
  })

  it('russian plural rule picks one/few/many forms', () => {
    setLocale('ru')
    i18n.global.mergeLocaleMessage('ru', { test: '{n} галерея | {n} галереи | {n} галерей' })
    const t = i18n.global.t as (k: string, n: number) => string
    expect([1, 2, 5, 11, 21, 22].map((n) => t('test', n))).toEqual([
      '1 галерея',
      '2 галереи',
      '5 галерей',
      '11 галерей',
      '21 галерея',
      '22 галереи',
    ])
  })

  it('english plural and error messages follow locale', () => {
    setLocale('en')
    expect(i18n.global.t('catalog.photos', 1)).toBe('1 photo')
    expect(i18n.global.t('catalog.photos', 5)).toBe('5 photos')
    expect(errorMessage(new ApiError(0, ''))).toBe('No connection to the server')
    setLocale('ru')
    expect(errorMessage(new ApiError(503, ''))).toBe('Ошибка сервера: 503')
    expect(document.documentElement.lang).toBe('ru')
  })
})
