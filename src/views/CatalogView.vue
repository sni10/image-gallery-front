<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { getGalleries, type Gallery } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import MasonryGrid from '@/components/MasonryGrid.vue'

const { t } = useI18n()
usePageMeta(() => ({ title: t('catalog.title'), description: t('catalog.description') }))

const { items, loading, error, canRetry, empty, loadMore } = useInfiniteList((page) =>
  getGalleries(page),
)
const ratio = (g: Gallery) => (g.cover ? g.cover.height / g.cover.width : 2 / 3)
</script>

<template>
  <!-- schema.org microdata: crawlers read galleries/images straight from the markup -->
  <section aria-labelledby="catalog-title" itemscope itemtype="https://schema.org/CollectionPage">
    <h1 id="catalog-title" itemprop="name">{{ $t('catalog.title') }}</h1>

    <MasonryGrid :items="items" :ratio="ratio" :min-width="280">
      <template #default="{ item: g }">
        <article
          class="card"
          itemprop="hasPart"
          itemscope
          itemtype="https://schema.org/ImageGallery"
        >
          <RouterLink :to="`/galleries/${g.id}`" class="link" itemprop="url">
            <img
              v-if="g.cover"
              :src="g.cover.thumbUrl"
              :alt="g.title"
              loading="lazy"
              decoding="async"
              :width="g.cover.width"
              :height="g.cover.height"
              itemprop="thumbnailUrl"
            />
            <div v-else class="empty" />
            <div class="caption">
              <h2 itemprop="name">{{ g.title }}</h2>
              <p class="count">{{ $t('catalog.photos', g.photosCount) }}</p>
            </div>
          </RouterLink>
        </article>
      </template>
    </MasonryGrid>
  </section>

  <div ref="sentinel" />
  <p v-if="loading" class="status" role="status">{{ $t('common.loading') }}</p>
  <p v-if="empty" class="status" role="status">{{ $t('catalog.empty') }}</p>
  <p v-if="error" class="status error" role="alert">
    {{ error }}
    <button v-if="canRetry" type="button" @click="loadMore">{{ $t('common.retry') }}</button>
  </p>
</template>

<style scoped>
.card {
  border-radius: 4px;
  overflow: hidden;
}
.link {
  position: relative;
  display: block;
  text-decoration: none;
}
.link:focus-visible {
  outline: 2px solid #fff;
}
.link img {
  width: 100%;
  height: auto;
  display: block;
  background: #222;
  transition: transform 0.3s;
}
.link:hover img {
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
  align-items: baseline;
  gap: 8px;
  padding: 24px 12px 10px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
}
.caption h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}
.count {
  margin: 0;
  white-space: nowrap;
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
