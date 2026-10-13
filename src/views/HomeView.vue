<script setup lang="ts">
import { useRoute } from 'vue-router'
import { FEED_SORTS, getFeed, type FeedSort } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import PhotoGrid from '@/components/PhotoGrid.vue'

usePageMeta(() => ({}))

// ?sort=new|popular; random is the default and keeps the URL clean. A new sort = new URL = remount (App.vue key)
const route = useRoute()
const q = route.query.sort
const sort: FeedSort = FEED_SORTS.includes(q as FeedSort) ? (q as FeedSort) : 'random'
const sortLink = (s: FeedSort) => ({ query: s === 'random' ? {} : { sort: s } })

// one seed per visit (made on the server, reused by the client) = stable random order while scrolling
const seed = useSsrState('home:seed', () => Math.random().toString(36).slice(2, 12) || 'seed')
const { items, total, loading, error, canRetry, empty, loadMore, remove } = useInfiniteList(
  `home:photos:${sort}`,
  (page) => getFeed(sort, seed.value, page),
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
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id="home-photos" class="m-0" itemprop="name">{{ $t(`home.sort.${sort}`) }}</h2>
      <!-- links, not buttons: each order has its own URL (shareable, crawlable) -->
      <nav class="join" :aria-label="$t('home.sortLabel')">
        <RouterLink
          v-for="s in FEED_SORTS"
          :key="s"
          :to="sortLink(s)"
          class="btn join-item btn-sm"
          :class="{ 'btn-active btn-primary': s === sort }"
          :aria-current="s === sort ? 'page' : undefined"
        >
          {{ $t(`home.sortShort.${s}`) }}
        </RouterLink>
      </nav>
    </div>
    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      :guest-free="10"
      @delete="remove"
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
