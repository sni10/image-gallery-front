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
import ListStatus from '@/components/ListStatus.vue'
</script>

<template>
  <section class="hero py-12" aria-labelledby="home-title">
    <div class="hero-content text-center">
      <div class="max-w-xl">
        <h1 id="home-title" class="text-5xl">{{ $t('site.name') }}</h1>
        <p class="text-lg text-base-content/70">{{ $t('home.tagline') }}</p>
        <RouterLink to="/galleries" class="btn btn-primary mt-6">{{ $t('home.cta') }}</RouterLink>
      </div>
    </div>
  </section>

  <section aria-labelledby="home-photos" itemscope itemtype="https://schema.org/CollectionPage">
    <h2 id="home-photos" class="mb-4" itemprop="name">{{ $t('home.photos') }}</h2>
    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      :alt="(_, i) => $t('home.photoAlt', { n: i + 1 })"
    />
  </section>

  <div ref="sentinel" />
  <ListStatus
    :loading="loading"
    :empty="empty"
    :empty-text="$t('home.empty')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
