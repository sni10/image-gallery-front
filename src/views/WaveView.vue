<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getFavorites, getWave, hasSession, type Page, type Photo } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ListStatus from '@/components/ListStatus.vue'

// "My wave": endless picks by the favorites (SPEC-wave.md). Client-only like favorites; the shown ids live
// only on this page, so a reload starts a new wave. Hearts are the usual setFavorite.
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
usePageMeta(() => ({ title: t('wave.title'), noindex: true }))

const coldStart = ref(false) // no favorites yet: the server sends popular photos
onMounted(() => {
  if (!hasSession()) return router.replace({ name: 'login', query: { next: route.fullPath } })
  getFavorites(1, 1)
    .then((r) => (coldStart.value = r.total === 0))
    .catch(() => {})
})

const { items, total, loading, error, canRetry, empty, loadMore, remove, reset } = useInfiniteList(
  'wave',
  (): Promise<Page<Photo>> => getWave(items.value.map((p: Photo) => p.id)),
  false,
)
// getWave's total is exact only once a batch came back empty
const ended = computed(() => total.value > 0 && items.value.length >= total.value)
</script>

<template>
  <section aria-labelledby="wave-title">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h1 id="wave-title">{{ $t('wave.title') }}</h1>
      <button type="button" class="btn btn-sm" :disabled="loading" @click="reset">
        {{ $t('wave.refresh') }}
      </button>
    </div>
    <p v-if="coldStart" class="mb-4 text-base-content/70">{{ $t('wave.hint') }}</p>
    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      @delete="remove"
      :alt="(_, i) => $t('wave.photoAlt', { n: i + 1 })"
    />
  </section>

  <div ref="sentinel" />
  <ListStatus
    :loading="loading"
    :empty="empty || ended"
    :empty-text="$t('wave.end')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
