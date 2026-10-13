<script setup lang="ts">
import { useSsrState } from '@/ssr'

// Cookie consent. Necessary cookies (age gate, this choice) and the session in localStorage work either way;
// "decline" turns off the optional one: the language cookie (saveLocale in i18n.ts).
// The answer is a cookie, so the server renders the banner only for visitors who haven't chosen yet.
const choice = useSsrState<'yes' | 'no' | null>('cookies', () => null)

function choose(c: 'yes' | 'no') {
  document.cookie = `cookies=${c}; path=/; max-age=31536000; samesite=lax`
  if (c === 'no') document.cookie = 'locale=; path=/; max-age=0'
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
        <RouterLink to="/terms" class="link link-primary">{{ $t('nav.terms') }}</RouterLink>
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
