<script setup lang="ts">
import { getRandomPhotos } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import PhotoGrid from '@/components/PhotoGrid.vue'

usePageMeta(() => ({}))

// one seed per visit (made on the server, reused by the client) = stable random order while scrolling
const seed = useSsrState('home:seed', () => Math.random().toString(36).slice(2, 12) || 'seed')
const { items, total, loading, error, canRetry, empty, loadMore } = useInfiniteList(
  'home:photos',
  (page) => getRandomPhotos(seed.value, page),
)
</script>

<template>
  <section class="hero" aria-labelledby="home-title">
    <h1 id="home-title">{{ $t('site.name') }}</h1>
    <p>{{ $t('home.tagline') }}</p>
    <RouterLink to="/galleries" class="btn">{{ $t('home.cta') }}</RouterLink>
  </section>

  <section aria-labelledby="home-photos" itemscope itemtype="https://schema.org/CollectionPage">
    <h2 id="home-photos" itemprop="name">{{ $t('home.photos') }}</h2>
    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      :alt="(_, i) => $t('home.photoAlt', { n: i + 1 })"
    />
  </section>

  <div ref="sentinel" />
  <p v-if="loading" class="status" role="status">{{ $t('common.loading') }}</p>
  <p v-if="empty" class="status" role="status">{{ $t('home.empty') }}</p>
  <p v-if="error" class="status error" role="alert">
    {{ error }}
    <button v-if="canRetry" type="button" @click="loadMore">{{ $t('common.retry') }}</button>
  </p>
</template>

<style scoped>
.hero {
  text-align: center;
  padding: 48px 0;
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
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
