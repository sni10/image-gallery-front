<script setup lang="ts">
import { computed, onMounted, onServerPrefetch, onUnmounted, ref, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError,
  getPhoto,
  getSimilar,
  hasSession,
  isLocked,
  me,
  type Photo,
  type PhotoDetail,
} from '@/api'
import { errorMessage } from '@/i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import BreadCrumbs from '@/components/BreadCrumbs.vue'
import PhotoGrid from '@/components/PhotoGrid.vue'
import { useCollectionPicker } from '@/composables/useCollectionPicker'

// Own address of a photo (SEO, sharing). Description and tags go into <head> / microdata only.
const props = defineProps<{ id: string }>()
const { t } = useI18n()
const ssr = import.meta.env.SSR ? useSSRContext<{ status?: number }>() : undefined

const photo = useSsrState<PhotoDetail | null>(`photo:${props.id}`, () => null)
const failure = ref<unknown>(null)
async function load() {
  if (photo.value) return
  try {
    photo.value = await getPhoto(props.id)
  } catch (e) {
    failure.value = e
    // real 404 for crawlers; reissued links end up here too
    if (ssr && e instanceof ApiError && e.status === 404) ssr.status = 404
  }
}
onServerPrefetch(load)
// server rendered anonymously (no url for a locked photo): with a session, fetch again with the token
onMounted(() => (photo.value && hasSession() ? refresh() : load()))
function refresh() {
  getPhoto(props.id).then(
    (p) => (photo.value = p),
    () => {},
  )
}
// Similar photos under the main one: rendered on the server (internal links for crawlers).
// An error just hides the block. Signed in: fetched again with the token, like the photo itself
const similar = useSsrState<Photo[]>(`similar:${props.id}`, () => [])
const loadSimilar = () =>
  getSimilar(props.id).then(
    (r) => (similar.value = r.items),
    () => {},
  )
onServerPrefetch(loadSimilar)
onMounted(() => (!similar.value.length || hasSession()) && loadSimilar())

// the signed url expired while the page stayed open: one fresh fetch
let refreshed = false
function onImgError() {
  if (refreshed || !photo.value?.url) return
  refreshed = true
  refresh()
}

// the API decides (url: null + locked); legacy API without `locked`: every guest gets the blur
const pick = useCollectionPicker()
const locked = computed(() => !!photo.value && isLocked(photo.value, !me.value))
const route = useRoute()
const login = computed(() => ({ name: 'login', query: { next: route.fullPath } }))

// ←/→ = the arrow links; not while typing or with modifiers (browser shortcuts)
const router = useRouter()
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
  if (document.querySelector('.pswp')) return // the viewer of similar photos is open: its arrows
  const el = e.target
  if (el instanceof Element && el.closest('input, textarea, select, [contenteditable]')) return
  go({ ArrowLeft: photo.value?.prevId, ArrowRight: photo.value?.nextId }[e.key])
}
function go(id?: string | null) {
  if (id) router.push(`/photos/${id}`)
}

// frosted circle; on mouse devices it fades in only while the zone is hovered, touch keeps it visible
const arrow =
  'grid size-12 place-items-center rounded-full bg-black/30 text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md transition duration-200 group-hover:scale-110 group-hover:bg-black/55 group-focus-visible:opacity-100 group-focus-visible:ring-2 group-focus-visible:ring-white [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100'

// horizontal swipe on touch screens; mostly-vertical moves stay page scroll
const SWIPE = 50 // px
let touchX = 0
let touchY = 0
function onTouchStart(e: TouchEvent) {
  touchX = e.changedTouches[0]!.clientX
  touchY = e.changedTouches[0]!.clientY
}
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0]!.clientX - touchX
  const dy = e.changedTouches[0]!.clientY - touchY
  if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.5) return
  go(dx > 0 ? photo.value?.prevId : photo.value?.nextId)
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

usePageMeta(() => {
  const p = photo.value
  if (!p) return {}
  return {
    title: p.title,
    description:
      p.description || t('photo.description', { title: p.title, gallery: p.gallery.title }),
    image: p.thumbUrl ?? undefined, // never the signed url: it expires
  }
})

const crumbs = computed(() => {
  const p = photo.value
  return [
    { title: t('nav.galleries'), to: '/galleries' },
    ...(p
      ? [
          { title: p.gallery.category.title, to: `/categories/${p.gallery.category.slug}` },
          { title: p.gallery.title, to: `/galleries/${p.gallery.id}` },
          { title: p.title },
        ]
      : []),
  ]
})
</script>

<template>
  <BreadCrumbs :items="crumbs" />

  <figure v-if="photo" itemscope itemtype="https://schema.org/ImageObject">
    <h1 class="sr-only" itemprop="name">{{ photo.title }}</h1>
    <div
      class="relative overflow-hidden rounded-box"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div
        v-if="!photo.url && !photo.thumbUrl"
        class="mx-auto max-h-[85vh] w-full max-w-full rounded-box bg-base-300"
        :style="{ aspectRatio: `${photo.width} / ${photo.height}` }"
      />
      <img
        v-else
        :src="(photo.url ?? photo.thumbUrl)!"
        :alt="photo.title"
        :width="photo.width"
        :height="photo.height"
        :itemprop="photo.url ? 'contentUrl' : undefined"
        @error="onImgError"
        class="mx-auto block h-auto max-h-[85vh] w-auto max-w-full rounded-box bg-base-300"
        :class="{ 'scale-110 blur-2xl': locked }"
      />
      <RouterLink
        v-if="locked"
        :to="login"
        class="absolute inset-0 grid place-items-center text-xl font-semibold text-white [text-shadow:0_1px_3px_#000]"
      >
        🔒 {{ $t('photo.locked') }}
      </RouterLink>
      <!-- click zones: a third of the width each, full height; the circle is only the visual cue -->
      <RouterLink
        v-if="photo.prevId"
        :to="`/photos/${photo.prevId}`"
        rel="prev"
        class="group absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-3 outline-none"
        :title="$t('photo.prev')"
        :aria-label="$t('photo.prev')"
      >
        <span :class="arrow" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            class="size-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </span>
      </RouterLink>
      <RouterLink
        v-if="photo.nextId"
        :to="`/photos/${photo.nextId}`"
        rel="next"
        class="group absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-3 outline-none"
        :title="$t('photo.next')"
        :aria-label="$t('photo.next')"
      >
        <span :class="arrow" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            class="size-6 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </RouterLink>
    </div>
    <div class="mt-4 flex flex-wrap items-start gap-2">
      <!-- ponytail: plain badges for now; will link to photos by tag once the API has that list -->
      <ul
        v-if="photo.tags.length"
        class="flex flex-1 flex-wrap gap-2"
        :aria-label="$t('photo.tags')"
      >
        <li v-for="tag in photo.tags" :key="tag" class="badge badge-outline">#{{ tag }}</li>
      </ul>
      <button type="button" class="btn btn-sm ml-auto" @click="pick(photo.id)">
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3h12v18l-6-4-6 4zM12 7v6M9 10h6" />
        </svg>
        {{ $t('collections.addTo') }}
      </button>
    </div>
    <meta v-if="photo.thumbUrl" itemprop="thumbnailUrl" :content="photo.thumbUrl" />
    <meta itemprop="width" :content="String(photo.width)" />
    <meta itemprop="height" :content="String(photo.height)" />
    <meta v-if="photo.description" itemprop="description" :content="photo.description" />
    <meta v-if="photo.tags.length" itemprop="keywords" :content="photo.tags.join(', ')" />
  </figure>
  <div v-else-if="failure" class="alert alert-error my-8 w-auto" role="alert">
    {{ errorMessage(t, failure) }}
  </div>
  <div v-else class="my-8 flex justify-center">
    <span class="loading loading-spinner loading-lg" role="status">
      <span class="sr-only">{{ $t('common.loading') }}</span>
    </span>
  </div>
  <section v-if="photo && similar.length" class="mt-10" aria-labelledby="similar-title">
    <h2 id="similar-title" class="mb-4">{{ $t('photo.similar') }}</h2>
    <PhotoGrid
      :items="similar"
      :total="similar.length"
      :load-more="async () => {}"
      :alt="(p) => p.title"
    />
  </section>
</template>
