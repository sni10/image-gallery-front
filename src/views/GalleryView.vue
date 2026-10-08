<script setup lang="ts">
import { onMounted, onServerPrefetch, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, getGallery, getGalleryPhotos, type Gallery } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import PhotoGrid from '@/components/PhotoGrid.vue'

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

const { items, total, loading, error, canRetry, empty, loadMore } = useInfiniteList(
  `photos:${props.id}`,
  (page) => getGalleryPhotos(props.id, page),
)
</script>

<template>
  <nav :aria-label="$t('gallery.breadcrumbs')" class="crumbs">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
        <RouterLink to="/galleries" itemprop="item">
          <span itemprop="name">{{ $t('nav.galleries') }}</span>
        </RouterLink>
        <meta itemprop="position" content="1" />
      </li>
      <li
        v-if="gallery"
        itemprop="itemListElement"
        itemscope
        itemtype="https://schema.org/ListItem"
        aria-current="page"
      >
        <span itemprop="name">{{ gallery.title }}</span>
        <meta itemprop="position" content="2" />
      </li>
    </ol>
  </nav>

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
.crumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 14px;
}
.crumbs li + li::before {
  content: '/';
  margin-right: 8px;
  opacity: 0.5;
}
.crumbs a {
  opacity: 0.7;
  text-decoration: none;
}
.crumbs a:hover {
  opacity: 1;
}
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
