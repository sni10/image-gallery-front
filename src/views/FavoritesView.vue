<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getFavorites, hasSession } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import PhotoGrid from '@/components/PhotoGrid.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
usePageMeta(() => ({ title: t('favorites.title'), noindex: true }))

onMounted(() => {
  if (!hasSession()) router.replace({ name: 'login', query: { next: route.fullPath } })
})

// client-only: the server has no token. Un-hearted photos stay until reload (undo by clicking again)
const { items, total, loading, error, canRetry, empty, loadMore, remove } = useInfiniteList(
  'favorites',
  getFavorites,
  false,
)
import ListStatus from '@/components/ListStatus.vue'
</script>

<template>
  <section aria-labelledby="fav-title">
    <h1 id="fav-title">{{ $t('favorites.title') }}</h1>
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
    :empty="empty"
    :empty-text="$t('favorites.empty')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
