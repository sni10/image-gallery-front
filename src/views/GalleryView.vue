<script setup lang="ts">
import { ref, onMounted, onServerPrefetch, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, getGallery, getGalleryPhotos, type Gallery, type Photo } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { useLightbox } from '@/composables/useLightbox'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import MasonryGrid from '@/components/MasonryGrid.vue'

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
const current = ref<number | null>(null)
useLightbox(current, items, total, loadMore)

const ratio = (p: Photo) => p.height / p.width

// Thumbs are real links to the full image (crawlable, open-in-new-tab works);
// a plain left click opens the lightbox instead.
function open(e: MouseEvent, i: number) {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  current.value = i
}
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

    <MasonryGrid :items="items" :ratio="ratio">
      <template #default="{ item: p, index: i }">
        <figure class="photo" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
          <a :href="p.url" itemprop="contentUrl" @click="open($event, i)">
            <img
              :src="p.thumbUrl"
              :alt="$t('gallery.photoAlt', { gallery: gallery?.title ?? '', n: i + 1 })"
              loading="lazy"
              decoding="async"
              :width="p.width"
              :height="p.height"
              :data-pswp-index="i"
              itemprop="thumbnailUrl"
            />
          </a>
          <meta itemprop="width" :content="String(p.width)" />
          <meta itemprop="height" :content="String(p.height)" />
        </figure>
      </template>
    </MasonryGrid>
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
.photo {
  margin: 0;
}
.photo a {
  display: block;
  border-radius: 4px;
}
.photo a:focus-visible {
  outline: 2px solid #fff;
}
.photo img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
  background: #222;
}
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
