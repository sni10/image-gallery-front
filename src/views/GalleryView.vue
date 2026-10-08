<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getPhotos, type Photo } from '@/api/photos'
import PhotoLightbox from '@/components/PhotoLightbox.vue'

const COL_MIN = 220 // px, min column width
const GAP = 8 // px, keep in sync with .grid / .col gap

const photos = ref<Photo[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref('')
const current = ref<number | null>(null)
const sentinel = ref<HTMLElement>()
const grid = ref<HTMLElement>()
const cols = ref(1)
let observer: IntersectionObserver | undefined
let resize: ResizeObserver | undefined

// masonry: each photo goes to the currently shortest column. Heights come from the
// API width/height ratio, so no waiting for images, and appending never moves placed photos.
const columns = computed(() => {
  const out = Array.from({ length: cols.value }, () => ({
    h: 0,
    items: [] as { p: Photo; i: number }[],
  }))
  photos.value.forEach((p, i) => {
    const col = out.reduce((a, b) => (b.h < a.h ? b : a))
    col.items.push({ p, i })
    col.h += p.height / p.width
  })
  return out
})

async function loadMore() {
  if (loading.value || (page.value > 0 && photos.value.length >= total.value)) return
  loading.value = true
  error.value = ''
  try {
    const res = await getPhotos(page.value + 1)
    // newest-first + page offsets: uploads during scroll shift pages, skip repeats
    const seen = new Set(photos.value.map((p) => p.id))
    photos.value.push(...res.items.filter((p) => !seen.has(p.id)))
    total.value = res.total
    page.value++
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
  // re-observe: fires again if the sentinel is still on screen (tall viewport)
  if (!error.value && sentinel.value) {
    observer?.unobserve(sentinel.value)
    observer?.observe(sentinel.value)
  }
}

onMounted(() => {
  // ponytail: native IntersectionObserver, no scroll listeners/libs
  observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
    rootMargin: '400px',
  })
  observer.observe(sentinel.value!)
  resize = new ResizeObserver(([e]) => {
    cols.value = Math.max(1, Math.floor((e!.contentRect.width + GAP) / (COL_MIN + GAP)))
  })
  resize.observe(grid.value!)
})
onUnmounted(() => {
  observer?.disconnect()
  resize?.disconnect()
})
</script>

<template>
  <h1>Галерея</h1>

  <div ref="grid" class="grid">
    <ul v-for="(col, c) in columns" :key="c" class="col">
      <li v-for="{ p, i } in col.items" :key="p.id">
        <button type="button" @click="current = i">
          <img
            :src="p.thumbUrl"
            :alt="p.title"
            loading="lazy"
            :width="p.width"
            :height="p.height"
          />
        </button>
      </li>
    </ul>
  </div>

  <div ref="sentinel" />
  <p v-if="loading" class="status">Загрузка…</p>
  <p v-if="error" class="status error">
    {{ error }} <button type="button" @click="loadMore">Повторить</button>
  </p>

  <PhotoLightbox v-model:index="current" :photos="photos" />
</template>

<style scoped>
.grid {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.col {
  flex: 1;
  min-width: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.col button {
  all: unset;
  cursor: pointer;
  display: block;
}
.col button:focus-visible {
  outline: 2px solid #fff;
}
.col img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 4px;
  background: #222;
}
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
