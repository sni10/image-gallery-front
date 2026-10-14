<script setup lang="ts">
import { computed, onServerPrefetch, ref, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getGalleries, type Gallery } from '@/api'
import { useCategories } from '@/composables/useCategories'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import MasonryGrid from '@/components/MasonryGrid.vue'
import BreadCrumbs from '@/components/BreadCrumbs.vue'

// /galleries = all galleries; /categories/:slug = galleries of one category
const props = defineProps<{ slug?: string }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const ssr = import.meta.env.SSR ? useSSRContext<{ status?: number }>() : undefined

const { categories, ready } = useCategories()
const category = computed(() => categories.value?.find((c) => c.slug === props.slug))
// the API answers an unknown slug with an empty list, so existence comes from /categories
const unknown = computed(() => !!props.slug && !!categories.value && !category.value)
onServerPrefetch(async () => {
  await ready()
  if (unknown.value) ssr!.status = 404
})

const title = computed(() =>
  props.slug
    ? (category.value?.title ?? (unknown.value ? t('notFound.title') : '…'))
    : t('catalog.title'),
)
usePageMeta(() => ({
  title: title.value,
  description: category.value
    ? t(
        'catalog.categoryDescription',
        { title: category.value.title },
        category.value.galleriesCount,
      )
    : t('catalog.description'),
  noindex: !!route.query.q, // search results: endless URL variants, not pages to index
}))
const crumbs = computed(() => [
  { title: t('nav.galleries'), to: '/galleries' },
  { title: title.value },
])

// ?q= searches titles over the whole catalog (the API does it, not the loaded pages). New q = new URL = remount
const q = typeof route.query.q === 'string' ? route.query.q.trim() : ''
const query = ref(q)
const search = () => router.push({ query: query.value.trim() ? { q: query.value.trim() } : {} })

const { items, loading, error, canRetry, empty, loadMore } = useInfiniteList(
  `catalog:${props.slug ?? ''}:${q}`,
  (page) => getGalleries(page, 20, props.slug, q),
)
const ratio = (g: Gallery) => (g.cover ? g.cover.height / g.cover.width : 2 / 3)
import ListStatus from '@/components/ListStatus.vue'
</script>

<template>
  <BreadCrumbs v-if="slug" :items="crumbs" />

  <!-- schema.org microdata: crawlers read galleries/images straight from the markup -->
  <section aria-labelledby="catalog-title" itemscope itemtype="https://schema.org/CollectionPage">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 id="catalog-title" class="m-0" itemprop="name">{{ title }}</h1>
      <form v-if="!unknown" role="search" class="join" @submit.prevent="search">
        <input
          v-model="query"
          type="search"
          maxlength="100"
          class="input join-item input-sm w-56"
          :placeholder="$t('catalog.search')"
          :aria-label="$t('catalog.search')"
        />
        <button class="btn join-item btn-sm">{{ $t('find.go') }}</button>
      </form>
    </div>

    <MasonryGrid v-if="!unknown" :items="items" :ratio="ratio" :min-width="280">
      <template #default="{ item: g }">
        <article
          class="group overflow-hidden rounded-box shadow-md"
          itemprop="hasPart"
          itemscope
          itemtype="https://schema.org/ImageGallery"
        >
          <RouterLink
            :to="`/galleries/${g.id}`"
            class="relative block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            itemprop="url"
          >
            <img
              v-if="g.cover?.thumbUrl"
              :src="g.cover.thumbUrl"
              :alt="g.title"
              loading="lazy"
              decoding="async"
              :width="g.cover.width"
              :height="g.cover.height"
              itemprop="thumbnailUrl"
              class="block h-auto w-full bg-base-300 transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div v-else class="aspect-[3/2] bg-base-300" />
            <!-- category label only on the all-galleries page -->
            <span v-if="!slug" class="badge badge-neutral absolute top-2 left-2" itemprop="genre">
              {{ g.category.title }}
            </span>
            <div
              class="absolute inset-x-0 bottom-0 flex items-baseline justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-3 text-white"
            >
              <h2 class="text-base" itemprop="name">{{ g.title }}</h2>
              <p class="text-sm whitespace-nowrap opacity-80">
                {{ $t('catalog.photos', g.photosCount) }}
              </p>
            </div>
          </RouterLink>
        </article>
      </template>
    </MasonryGrid>
  </section>

  <template v-if="!unknown">
    <div ref="sentinel" />
    <ListStatus
      :loading="loading"
      :empty="empty"
      :empty-text="$t(q ? 'find.empty' : 'catalog.empty')"
      :error="error"
      :can-retry="canRetry"
      @retry="loadMore"
    />
  </template>
  <p v-else class="my-8 text-center">
    <RouterLink to="/galleries" class="btn btn-ghost">{{ $t('gallery.back') }}</RouterLink>
  </p>
</template>
