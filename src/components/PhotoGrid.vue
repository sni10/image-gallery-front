<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { Photo } from '@/api'
import { useLightbox } from '@/composables/useLightbox'
import MasonryGrid from '@/components/MasonryGrid.vue'

// Masonry of photos + PhotoSwipe viewer. Each photo is schema.org ImageObject; the parent
// element should carry the itemscope (ImageGallery / CollectionPage) these belong to.
const props = defineProps<{
  items: Photo[]
  total: number
  loadMore: () => Promise<void>
  alt: (p: Photo, i: number) => string
}>()

const current = ref<number | null>(null)
useLightbox(current, toRef(props, 'items'), toRef(props, 'total'), props.loadMore)

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
  <MasonryGrid :items="items" :ratio="ratio">
    <template #default="{ item: p, index: i }">
      <figure class="photo" itemprop="image" itemscope itemtype="https://schema.org/ImageObject">
        <a :href="p.url" itemprop="contentUrl" @click="open($event, i)">
          <img
            :src="p.thumbUrl"
            :alt="alt(p, i)"
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
</template>

<style scoped>
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
</style>
