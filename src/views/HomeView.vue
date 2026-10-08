<script setup lang="ts">
import { usePageMeta } from '@/composables/usePageMeta'

usePageMeta(() => ({}))
</script>

<template>
  <section class="hero" aria-labelledby="home-title">
    <h1 id="home-title">{{ $t('site.name') }}</h1>
    <p>{{ $t('home.tagline') }}</p>
    <RouterLink to="/galleries" class="btn">{{ $t('home.cta') }}</RouterLink>
  </section>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 80px 0;
}
.btn {
  display: inline-block;
  margin-top: 16px;
  padding: 12px 24px;
  border-radius: 8px;
  background: #eee;
  color: #111;
  text-decoration: none;
}
</style>
