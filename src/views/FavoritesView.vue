<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getFavorites, getWave, hasSession, type Page, type Photo } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ListStatus from '@/components/ListStatus.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
usePageMeta(() => ({ title: t('favorites.title'), noindex: true }))

onMounted(() => {
  if (!hasSession()) router.replace({ name: 'login', query: { next: route.fullPath } })
})

// "My wave" (SPEC-wave.md): the grid stops loading favorites and goes on with picks by them. Hearts are the
// usual setFavorite; "stop" reloads the favorites, now with what was hearted in the wave.
// waveFrom = where the wave's photos start in the grid; null = no wave. Lives only on this page.
const waveFrom = ref<number | null>(null)

async function fetchPage(page: number): Promise<Page<Photo>> {
  if (waveFrom.value === null) return getFavorites(page)
  const { items: batch } = await getWave(items.value.slice(waveFrom.value).map((p: Photo) => p.id))
  // the wave has no total: one more than loaded keeps the list and the lightbox asking, exact at the end
  return { items: batch, total: items.value.length + batch.length + (batch.length ? 1 : 0) }
}

// client-only: the server has no token. Un-hearted photos stay until reload (undo by clicking again)
const { items, total, loading, error, canRetry, empty, loadMore, remove, reset, resume } =
  useInfiniteList('favorites', fetchPage, false)

function startWave() {
  waveFrom.value = items.value.length
  resume()
}
function stopWave() {
  waveFrom.value = null
  reset()
}
const waveEnded = computed(
  () => waveFrom.value !== null && !loading.value && items.value.length >= total.value,
)
</script>

<template>
  <section aria-labelledby="fav-title">
    <!-- sticky under the site header: "stop" must be at hand pages deep into the wave -->
    <div
      class="sticky top-16 z-[5] -mx-4 mb-2 flex flex-wrap items-center justify-between gap-2 bg-base-100/90 px-4 py-2 backdrop-blur"
    >
      <h1 id="fav-title" class="m-0">{{ $t('favorites.title') }}</h1>
      <button
        v-if="waveFrom === null"
        type="button"
        class="btn btn-sm btn-primary"
        :disabled="loading"
        @click="startWave"
      >
        {{ $t('wave.start') }}
      </button>
      <button v-else type="button" class="btn btn-sm" :disabled="loading" @click="stopWave">
        {{ $t('wave.stop') }}
      </button>
    </div>
    <p v-if="waveFrom === 0" class="mb-4 text-base-content/70">{{ $t('wave.hint') }}</p>
    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      @delete="remove"
      :alt="(_, i) => $t('favorites.photoAlt', { n: i + 1 })"
    />
  </section>

  <div ref="sentinel" />
  <ListStatus
    :loading="loading"
    :empty="waveFrom === null ? empty : waveEnded"
    :empty-text="$t(waveFrom === null ? 'favorites.empty' : 'wave.end')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
