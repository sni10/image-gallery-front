<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePageMeta } from '@/composables/usePageMeta'

const { t } = useI18n()
usePageMeta(() => ({ title: t('notFound.title') }))
</script>

<template>
  <section class="hero py-20" aria-labelledby="nf-title">
    <div class="hero-content flex-col text-center">
      <p class="text-8xl font-black text-base-content/20">404</p>
      <h1 id="nf-title">{{ $t('notFound.title') }}</h1>
      <RouterLink to="/galleries" class="btn btn-primary">{{ $t('home.cta') }}</RouterLink>
    </div>
  </section>
</template>
