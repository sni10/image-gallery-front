<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'

const { t } = useI18n()
usePageMeta(() => ({ title: t('notFound.title') }))
</script>

<template>
  <section class="hero" aria-labelledby="nf-title">
    <h1 id="nf-title">{{ $t('notFound.title') }}</h1>
    <RouterLink to="/galleries">{{ $t('home.cta') }}</RouterLink>
  </section>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 80px 0;
}
</style>
