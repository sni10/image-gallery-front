<script setup lang="ts">
import { computed, onServerPrefetch, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { getGalleries, type Gallery } from '@/api'
import { useCategories } from '@/composables/useCategories'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import MasonryGrid from '@/components/MasonryGrid.vue'
import BreadCrumbs from '@/components/BreadCrumbs.vue'

// /galleries = all galleries; /categories/:slug = galleries of one category
const props = defineProps<{ slug?: string }>()
const { t } = useI18n()
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
}))
const crumbs = computed(() => [
  { title: t('nav.galleries'), to: '/galleries' },
  { title: title.value },
])

const { items, loading, error, canRetry, empty, loadMore } = useInfiniteList(
  `catalog:${props.slug ?? ''}`,
  (page) => getGalleries(page, 20, props.slug),
)
const ratio = (g: Gallery) => (g.cover ? g.cover.height / g.cover.width : 2 / 3)
</script>

<template>
  <BreadCrumbs v-if="slug" :items="crumbs" />

  <!-- schema.org microdata: crawlers read galleries/images straight from the markup -->
  <section aria-labelledby="catalog-title" itemscope itemtype="https://schema.org/CollectionPage">
    <h1 id="catalog-title" itemprop="name">{{ title }}</h1>

    <MasonryGrid v-if="!unknown" :items="items" :ratio="ratio" :min-width="280">
      <template #default="{ item: g }">
        <article
          class="card"
          itemprop="hasPart"
          itemscope
          itemtype="https://schema.org/ImageGallery"
        >
          <RouterLink :to="`/galleries/${g.id}`" class="link" itemprop="url">
            <img
              v-if="g.cover"
              :src="g.cover.thumbUrl"
              :alt="g.title"
              loading="lazy"
              decoding="async"
              :width="g.cover.width"
              :height="g.cover.height"
              itemprop="thumbnailUrl"
            />
            <div v-else class="empty" />
            <!-- category label only on the all-galleries page -->
            <span v-if="!slug" class="tag" itemprop="genre">{{ g.category.title }}</span>
            <div class="caption">
              <h2 itemprop="name">{{ g.title }}</h2>
              <p class="count">{{ $t('catalog.photos', g.photosCount) }}</p>
            </div>
          </RouterLink>
        </article>
      </template>
    </MasonryGrid>
  </section>

  <template v-if="!unknown">
    <div ref="sentinel" />
    <p v-if="loading" class="status" role="status">{{ $t('common.loading') }}</p>
    <p v-if="empty" class="status" role="status">{{ $t('catalog.empty') }}</p>
    <p v-if="error" class="status error" role="alert">
      {{ error }}
      <button v-if="canRetry" type="button" @click="loadMore">{{ $t('common.retry') }}</button>
    </p>
  </template>
  <p v-else class="status">
    <RouterLink to="/galleries">{{ $t('gallery.back') }}</RouterLink>
  </p>
</template>

<style scoped>
.card {
  border-radius: 4px;
  overflow: hidden;
}
.link {
  position: relative;
  display: block;
  text-decoration: none;
}
.link:focus-visible {
  outline: 2px solid #fff;
}
.link img {
  width: 100%;
  height: auto;
  display: block;
  background: #222;
  transition: transform 0.3s;
}
.link:hover img {
  transform: scale(1.03);
}
.empty {
  aspect-ratio: 3 / 2;
  background: #222;
}
.tag {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgb(0 0 0 / 0.6);
  font-size: 12px;
}
.caption {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  padding: 24px 12px 10px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
}
.caption h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.count {
  margin: 0;
  white-space: nowrap;
  opacity: 0.8;
}
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
