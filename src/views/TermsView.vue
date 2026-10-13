<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { TERMS_VERSION } from '@/api'
import { usePageMeta } from '@/composables/usePageMeta'

const { t, tm, rt, locale } = useI18n()
usePageMeta(() => ({ title: t('terms.title'), description: t('terms.description') }))

const sections = computed(() => tm('terms.sections'))
const updated = computed(() =>
  new Date(`${TERMS_VERSION}T00:00:00Z`).toLocaleDateString(locale.value, { timeZone: 'UTC' }),
)
</script>

<template>
  <article
    class="mx-auto my-8 flex max-w-3xl flex-col gap-6 leading-relaxed"
    aria-labelledby="terms-title"
  >
    <header>
      <h1 id="terms-title" class="text-3xl font-bold">{{ $t('terms.title') }}</h1>
      <p class="mt-1 text-sm text-base-content/60">{{ $t('terms.updated', { date: updated }) }}</p>
    </header>
    <section v-for="(s, i) in sections" :key="i">
      <h2 class="mb-2 text-xl font-semibold">{{ rt(s.title) }}</h2>
      <p>{{ rt(s.body) }}</p>
    </section>
  </article>
</template>
