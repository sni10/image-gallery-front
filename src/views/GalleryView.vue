<script setup lang="ts">
import { computed, onMounted, onServerPrefetch, ref, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, getGallery, getGalleryPhotos, setGalleryCover, type Gallery } from '@/api'
import { errorMessage } from '@/i18n'
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
        image: gallery.value.cover?.thumbUrl ?? undefined, // url is signed and expires: bots need a stable one
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

const { items, total, loading, error, canRetry, empty, loadMore, remove } = useInfiniteList(
  `photos:${props.id}`,
  (page) => getGalleryPhotos(props.id, page),
)

// admin star on a photo: make it the cover, or drop the chosen one (random again). The answer is the gallery
const coverBusy = ref(false)
async function setCover(photoId: string | null) {
  coverBusy.value = true
  try {
    gallery.value = await setGalleryCover(props.id, photoId)
  } catch (e) {
    alert(errorMessage(t, e))
  } finally {
    coverBusy.value = false
  }
}
// a deleted cover: the backend drops it (SET_NULL), so the star goes out with the photo
function onDelete(id: string) {
  remove(id)
  if (gallery.value?.coverId === id) gallery.value.coverId = null
}
import ListStatus from '@/components/ListStatus.vue'
</script>

<template>
  <BreadCrumbs :items="crumbs" />

  <article aria-labelledby="gallery-title" itemscope itemtype="https://schema.org/ImageGallery">
    <h1 id="gallery-title" itemprop="name">{{ gallery?.title ?? '…' }}</h1>

    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      :guest-free="10"
      hide-gallery
      :cover-id="gallery?.coverId"
      :cover-busy="coverBusy"
      @delete="onDelete"
      @cover="setCover"
      :alt="(_, i) => $t('gallery.photoAlt', { gallery: gallery?.title ?? '', n: i + 1 })"
    />
  </article>

  <div ref="sentinel" />
  <ListStatus
    :loading="loading"
    :empty="empty"
    :empty-text="$t('gallery.empty')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
