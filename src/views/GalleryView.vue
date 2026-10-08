<script setup lang="ts">
import { ref } from 'vue'
import { getGallery, getGalleryPhotos, type Gallery, type Photo } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { useLightbox } from '@/composables/useLightbox'
import MasonryGrid from '@/components/MasonryGrid.vue'

const props = defineProps<{ id: string }>()

const gallery = ref<Gallery>()
getGallery(props.id).then(
  (g) => (gallery.value = g),
  () => {}, // ponytail: photos list shows the error; title just stays empty
)

const { items, total, loading, error, canRetry, empty, loadMore } = useInfiniteList((page) =>
  getGalleryPhotos(props.id, page),
)
const current = ref<number | null>(null)
useLightbox(current, items, total, loadMore)

const ratio = (p: Photo) => p.height / p.width
</script>

<template>
  <RouterLink to="/galleries" class="back">{{ $t('gallery.back') }}</RouterLink>
  <h1>{{ gallery?.title ?? '…' }}</h1>

  <MasonryGrid :items="items" :ratio="ratio">
    <template #default="{ item: p, index: i }">
      <button type="button" class="thumb" @click="current = i">
        <img
          :src="p.thumbUrl"
          :alt="p.title"
          loading="lazy"
          :width="p.width"
          :height="p.height"
          :data-pswp-index="i"
        />
      </button>
    </template>
  </MasonryGrid>

  <div ref="sentinel" />
  <p v-if="loading" class="status">{{ $t('common.loading') }}</p>
  <p v-if="empty" class="status">{{ $t('gallery.empty') }}</p>
  <p v-if="error" class="status error">
    {{ error }}
    <button v-if="canRetry" type="button" @click="loadMore">{{ $t('common.retry') }}</button>
  </p>
</template>

<style scoped>
.back {
  opacity: 0.7;
  text-decoration: none;
}
.thumb {
  all: unset;
  cursor: pointer;
  display: block;
}
.thumb:focus-visible {
  outline: 2px solid #fff;
}
.thumb img {
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
