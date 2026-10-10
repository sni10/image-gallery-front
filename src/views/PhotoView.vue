<script setup lang="ts">
import { computed, onMounted, onServerPrefetch, onUnmounted, ref, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, getPhoto, me, type PhotoDetail } from '@/api'
import { errorMessage } from '@/i18n'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSsrState } from '@/ssr'
import BreadCrumbs from '@/components/BreadCrumbs.vue'

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
onMounted(load)

// guests get the full-size blurred (the page can't tell if it's among a gallery's free first photos).
// me is null on the server and first client render: SSR blurs, signed-in users unblur after /me
const locked = computed(() => !me.value)
const route = useRoute()
const login = computed(() => ({ name: 'login', query: { next: route.fullPath } }))

// ←/→ = the arrow links; not while typing or with modifiers (browser shortcuts)
const router = useRouter()
function onKey(e: KeyboardEvent) {
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
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
    image: p.thumbUrl,
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
      <img
        :src="photo.url"
        :alt="photo.title"
        :width="photo.width"
        :height="photo.height"
        itemprop="contentUrl"
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
    <!-- ponytail: plain badges for now; will link to photos by tag once the API has that list -->
    <ul v-if="photo.tags.length" class="mt-4 flex flex-wrap gap-2" :aria-label="$t('photo.tags')">
      <li v-for="tag in photo.tags" :key="tag" class="badge badge-outline">#{{ tag }}</li>
    </ul>
    <meta itemprop="thumbnailUrl" :content="photo.thumbUrl" />
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
</template>
