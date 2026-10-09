<script setup lang="ts">
import { computed, onMounted, onServerPrefetch, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, getGallery, getGalleryPhotos, type Gallery } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import PhotoGrid from '@/components/PhotoGrid.vue'
import BreadCrumbs from '@/components/BreadCrumbs.vue'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const ssr = import.meta.env.SSR ? useSSRContext<{ status?: number }>() : undefined

const gallery = useSsrState<Gallery | null>(`gallery:${props.id}`, () => null)
async function loadGallery() {
  if (gallery.value) return
  try {
    gallery.value = await getGallery(props.id)
  } catch (e) {
    // real 404 for crawlers; other errors: photos list shows the message, title stays empty
    if (ssr && e instanceof ApiError && e.status === 404) ssr.status = 404
  }
}
onServerPrefetch(loadGallery)
onMounted(loadGallery)

usePageMeta(() =>
  gallery.value
    ? {
        title: gallery.value.title,
        description: t(
          'gallery.description',
          { title: gallery.value.title, n: gallery.value.photosCount },
          gallery.value.photosCount,
        ),
        image: gallery.value.cover?.url,
      }
    : {},
)

const crumbs = computed(() => {
  const g = gallery.value
  return [
    { title: t('nav.galleries'), to: '/galleries' },
    ...(g
      ? [{ title: g.category.title, to: `/categories/${g.category.slug}` }, { title: g.title }]
      : []),
  ]
})

const { items, total, loading, error, canRetry, empty, loadMore } = useInfiniteList(
  `photos:${props.id}`,
  (page) => getGalleryPhotos(props.id, page),
)
</script>

<template>
  <BreadCrumbs :items="crumbs" />

  <article aria-labelledby="gallery-title" itemscope itemtype="https://schema.org/ImageGallery">
    <h1 id="gallery-title" itemprop="name">{{ gallery?.title ?? '…' }}</h1>

    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      :alt="(_, i) => $t('gallery.photoAlt', { gallery: gallery?.title ?? '', n: i + 1 })"
    />
  </article>

  <div ref="sentinel" />
  <p v-if="loading" class="status" role="status">{{ $t('common.loading') }}</p>
  <p v-if="empty" class="status" role="status">{{ $t('gallery.empty') }}</p>
  <p v-if="error" class="status error" role="alert">
    {{ error }}
    <button v-if="canRetry" type="button" @click="loadMore">{{ $t('common.retry') }}</button>
  </p>
</template>

<style scoped>
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
