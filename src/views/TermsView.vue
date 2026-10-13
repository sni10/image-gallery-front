<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PRIVACY_VERSION, TERMS_VERSION } from '@/api'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'

// Legal text from the locale files: /terms (Terms of Use) and /privacy (Privacy Policy).
// A section may carry `link` (to the complaint form) and `cookies` (a button that reopens the cookie banner).
const props = withDefaults(defineProps<{ doc?: 'terms' | 'privacy' }>(), { doc: 'terms' })
const { t, tm, rt, locale } = useI18n()
usePageMeta(() => ({ title: t(`${props.doc}.title`), description: t(`${props.doc}.description`) }))

type Section = { title: string; body: string; link?: string; cookies?: string }
const sections = computed(() => tm(`${props.doc}.sections`) as Section[])
const updated = computed(() =>
  new Date(
    `${props.doc === 'terms' ? TERMS_VERSION : PRIVACY_VERSION}T00:00:00Z`,
  ).toLocaleDateString(locale.value, { timeZone: 'UTC' }),
)

// withdraw/change consent: forget the choice, CookieBanner shows up again
const cookieChoice = useSsrState<'yes' | 'no' | null>('cookies', () => null)
function reopenCookies() {
  document.cookie = 'cookies=; path=/; max-age=0'
  cookieChoice.value = null
}
</script>

<template>
  <article
    class="mx-auto my-8 flex max-w-3xl flex-col gap-6 leading-relaxed"
    aria-labelledby="legal-title"
  >
    <header>
      <h1 id="legal-title" class="text-3xl font-bold">{{ $t(`${doc}.title`) }}</h1>
      <p class="mt-1 text-sm text-base-content/60">{{ $t('terms.updated', { date: updated }) }}</p>
    </header>
    <section v-for="(s, i) in sections" :key="i">
      <h2 class="mb-2 text-xl font-semibold">{{ rt(s.title) }}</h2>
      <p class="whitespace-pre-line">{{ rt(s.body) }}</p>
      <RouterLink v-if="s.link" to="/complaint" class="link link-primary mt-2 inline-block">
        {{ rt(s.link) }}
      </RouterLink>
      <button v-if="s.cookies" type="button" class="btn btn-sm mt-2" @click="reopenCookies">
        {{ rt(s.cookies) }}
      </button>
    </section>
  </article>
</template>
