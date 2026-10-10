<script setup lang="ts">
import { computed, onMounted, onServerPrefetch, ref, useSSRContext } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, getPhoto, type PhotoDetail } from '@/api'
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
    <h1 class="mb-4" itemprop="name">{{ photo.title }}</h1>
    <img
      :src="photo.url"
      :alt="photo.title"
      :width="photo.width"
      :height="photo.height"
      itemprop="contentUrl"
      class="mx-auto block h-auto max-h-[85vh] w-auto max-w-full rounded-box bg-base-300"
    />
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
