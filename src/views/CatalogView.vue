<script setup lang="ts">
import { getGalleries, type Gallery } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import MasonryGrid from '@/components/MasonryGrid.vue'

const { items, loading, error, canRetry, empty, loadMore } = useInfiniteList((page) =>
  getGalleries(page),
)
const ratio = (g: Gallery) => (g.cover ? g.cover.height / g.cover.width : 2 / 3)
</script>

<template>
  <h1>{{ $t('catalog.title') }}</h1>

  <MasonryGrid :items="items" :ratio="ratio" :min-width="280">
    <template #default="{ item: g }">
      <RouterLink :to="`/galleries/${g.id}`" class="card">
        <img
          v-if="g.cover"
          :src="g.cover.thumbUrl"
          :alt="g.title"
          loading="lazy"
          :width="g.cover.width"
          :height="g.cover.height"
        />
        <div v-else class="empty" />
        <div class="caption">
          <span>{{ g.title }}</span>
          <span class="count">{{ $t('catalog.photos', g.photosCount) }}</span>
        </div>
      </RouterLink>
    </template>
  </MasonryGrid>

  <div ref="sentinel" />
  <p v-if="loading" class="status">{{ $t('common.loading') }}</p>
  <p v-if="empty" class="status">{{ $t('catalog.empty') }}</p>
  <p v-if="error" class="status error">
    {{ error }}
    <button v-if="canRetry" type="button" @click="loadMore">{{ $t('common.retry') }}</button>
  </p>
</template>

<style scoped>
.card {
  position: relative;
  display: block;
  border-radius: 4px;
  overflow: hidden;
  text-decoration: none;
}
.card:focus-visible {
  outline: 2px solid #fff;
}
.card img {
  width: 100%;
  height: auto;
  display: block;
  background: #222;
  transition: transform 0.3s;
}
.card:hover img {
  transform: scale(1.03);
}
.empty {
  aspect-ratio: 3 / 2;
  background: #222;
}
.caption {
  position: absolute;
  inset: auto 0 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 24px 12px 10px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
  font-weight: 600;
}
.count {
  font-weight: 400;
  opacity: 0.8;
}
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
