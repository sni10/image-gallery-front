<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
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

// one seed per visit (made on the server, reused by the client) = stable random order while scrolling.
// "Shuffle" puts a new one in ?seed: new URL = remount with a fresh set, back = the previous set
const newSeed = () => Math.random().toString(36).slice(2, 12) || 'seed'
const s = route.query.seed
const seed = typeof s === 'string' && s ? s : useSsrState('home:seed', newSeed).value
// ponytail: every shuffled set stays in the SSR state (back works); fine until someone shuffles hundreds of times
const { items, total, loading, error, canRetry, empty, loadMore, remove } = useInfiniteList(
  `home:photos:${sort}:${seed}`,
  (page) => getFeed(sort, seed, page),
)
const router = useRouter()
const shuffle = () => router.push({ query: { seed: newSeed() } })
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
      <div class="flex items-center gap-2">
        <h2 id="home-photos" class="m-0" itemprop="name">{{ $t(`home.sort.${sort}`) }}</h2>
        <!-- a button, not a link: crawlers shouldn't walk endless ?seed= URLs -->
        <button
          v-if="sort === 'random'"
          type="button"
          class="btn btn-ghost btn-sm"
          :title="$t('home.shuffle')"
          @click="shuffle"
        >
          <svg
            viewBox="0 0 24 24"
            class="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            aria-hidden="true"
          >
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
          <span class="max-sm:sr-only">{{ $t('home.shuffle') }}</span>
        </button>
      </div>
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
