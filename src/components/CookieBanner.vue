<script setup lang="ts">
import { onMounted } from 'vue'
import { useSsrState } from '@/ssr'

// Cookie consent. Necessary cookies (age gate, this choice) and the session in localStorage work either way;
// "decline" turns off the optional one: the language cookie (saveLocale in i18n.ts).
// The answer is a cookie, so the server renders the banner only for visitors who haven't chosen yet.
const choice = useSsrState<'yes' | 'no' | null>('cookies', () => null)

// Google Analytics: optional too, loads only after "accept". GA4 counts SPA page views itself (history changes).
const GA_ID = import.meta.env.VITE_GA_ID
function loadGa() {
  if (!GA_ID || 'gtag' in window) return
  const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void }
  w.dataLayer = w.dataLayer || []
  w.gtag = function () {
    w.dataLayer.push(arguments) // eslint-disable-line prefer-rest-params -- gtag needs the arguments object
  }
  w.gtag('js', new Date())
  w.gtag('config', GA_ID)
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.append(s)
}
onMounted(() => choice.value === 'yes' && loadGa())

function choose(c: 'yes' | 'no') {
  document.cookie = `cookies=${c}; path=/; max-age=31536000; samesite=lax`
  if (c === 'no') document.cookie = 'locale=; path=/; max-age=0'
  else loadGa()
  choice.value = c
}
</script>

<template>
  <div
    v-if="!choice"
    class="fixed inset-x-0 bottom-0 z-50 p-4"
    role="region"
    :aria-label="$t('cookies.title')"
  >
    <div
      class="mx-auto flex max-w-3xl flex-col gap-3 rounded-box bg-base-200 p-4 shadow-xl sm:flex-row sm:items-center"
    >
      <p class="flex-1 text-sm">
        {{ $t('cookies.text') }}
        <RouterLink to="/privacy" class="link link-primary">{{ $t('nav.privacy') }}</RouterLink>
      </p>
      <div class="flex justify-end gap-2">
        <button type="button" class="btn btn-ghost btn-sm" @click="choose('no')">
          {{ $t('cookies.decline') }}
        </button>
        <button type="button" class="btn btn-primary btn-sm" @click="choose('yes')">
          {{ $t('cookies.accept') }}
        </button>
      </div>
    </div>
  </div>
</template>
