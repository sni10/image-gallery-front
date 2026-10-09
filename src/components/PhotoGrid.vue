<script setup lang="ts">
import { ref, toRef } from 'vue'
import type { Photo } from '@/api'
import { useLightbox } from '@/composables/useLightbox'
import { useFavorite } from '@/composables/useFavorite'
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
const toggle = useFavorite()
useLightbox(current, toRef(props, 'items'), toRef(props, 'total'), props.loadMore, toggle)

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
      <figure
        class="group relative overflow-hidden rounded-box"
        itemprop="image"
        itemscope
        itemtype="https://schema.org/ImageObject"
      >
        <a
          :href="p.url"
          itemprop="contentUrl"
          class="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="open($event, i)"
        >
          <img
            :src="p.thumbUrl"
            :alt="alt(p, i)"
            loading="lazy"
            decoding="async"
            :width="p.width"
            :height="p.height"
            :data-pswp-index="i"
            itemprop="thumbnailUrl"
            class="block h-auto w-full bg-base-300 transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </a>
        <!-- hidden until hover on mouse devices; always visible on touch and when favorited -->
        <button
          type="button"
          class="btn btn-circle btn-sm absolute top-2 right-2 border-0 bg-black/45 text-lg text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 aria-pressed:text-error aria-pressed:opacity-100 [@media(hover:none)]:opacity-100"
          :aria-pressed="p.isFavorite"
          :title="$t(p.isFavorite ? 'favorites.remove' : 'favorites.add')"
          :aria-label="$t(p.isFavorite ? 'favorites.remove' : 'favorites.add')"
          @click="toggle(p)"
        >
          ♥
        </button>
        <meta itemprop="width" :content="String(p.width)" />
        <meta itemprop="height" :content="String(p.height)" />
      </figure>
    </template>
  </MasonryGrid>
</template>
