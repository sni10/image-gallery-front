<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, deletePhoto, isLocked, me, type Photo } from '@/api'
import { errorMessage } from '@/i18n'
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
  guestFree?: number // guests see this many first photos; the rest are blurred until sign-in. Default: all
}>()
const emit = defineEmits<{ delete: [id: string] }>() // parent drops it from the list

// Locked = API sent no url (guest). SSR is always anonymous: signed-in users get page 1 again with the token
// (useInfiniteList), so their blur goes away after hydration.
const locked = (i: number) => {
  const p = props.items[i]
  return !!p && isLocked(p, !me.value && i >= (props.guestFree ?? Infinity))
}

const current = ref<number | null>(null)
const toggle = useFavorite()
useLightbox(current, toRef(props, 'items'), toRef(props, 'total'), props.loadMore, toggle, locked)

const ratio = (p: Photo) => p.height / p.width

// Admin trash: confirm, then gone for good; 404 = someone already deleted it
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const deleting = ref(new Set<string>())
async function remove(p: Photo) {
  if (deleting.value.has(p.id) || !confirm(t('photo.deleteConfirm'))) return
  deleting.value.add(p.id)
  try {
    await deletePhoto(p.id)
    emit('delete', p.id)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) emit('delete', p.id)
    else if (e instanceof ApiError && e.status === 401)
      router.push({ name: 'login', query: { next: route.fullPath } }) // session died
    else alert(errorMessage(t, e))
  } finally {
    deleting.value.delete(p.id)
  }
}

// Thumbs are real links to the photo page (crawlable, open-in-new-tab works);
// a plain left click opens the lightbox instead (a locked photo: the login page).
function open(e: MouseEvent, i: number) {
  if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  if (locked(i)) router.push({ name: 'login', query: { next: route.fullPath } })
  else current.value = i
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
          :href="`/photos/${p.id}`"
          itemprop="url"
          class="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="open($event, i)"
        >
          <div
            v-if="!p.thumbUrl"
            class="w-full bg-base-300"
            :style="{ aspectRatio: `${p.width} / ${p.height}` }"
            :data-pswp-index="i"
          />
          <img
            v-else
            :src="p.thumbUrl"
            :alt="alt(p, i)"
            loading="lazy"
            decoding="async"
            :width="p.width"
            :height="p.height"
            :data-pswp-index="i"
            itemprop="thumbnailUrl"
            class="block h-auto w-full bg-base-300 transition-transform duration-300 group-hover:scale-[1.03]"
            :class="{ 'scale-110 blur-2xl group-hover:scale-110': locked(i) }"
          />
          <span
            v-if="locked(i)"
            class="pointer-events-none absolute inset-0 grid place-items-center p-2 text-center text-sm font-semibold text-white [text-shadow:0_1px_3px_#000]"
          >
            🔒 {{ $t('photo.locked') }}
          </span>
        </a>
        <meta v-if="p.url" itemprop="contentUrl" :content="p.url" />
        <!-- me is null on the server and first client render: no hydration mismatch -->
        <button
          v-if="me?.isAdmin"
          type="button"
          class="btn btn-circle btn-sm absolute top-2 right-12 border-0 bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-error focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
          :disabled="deleting.has(p.id)"
          :title="$t('photo.delete')"
          :aria-label="$t('photo.delete')"
          @click="remove(p)"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3" />
          </svg>
        </button>
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
