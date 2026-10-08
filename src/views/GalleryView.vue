<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getPhotos, type Photo } from '@/api/photos'
import PhotoLightbox from '@/components/PhotoLightbox.vue'

const photos = ref<Photo[]>([])
const total = ref(0)
const page = ref(0)
const loading = ref(false)
const error = ref('')
const current = ref<number | null>(null)
const sentinel = ref<HTMLElement>()
let observer: IntersectionObserver | undefined

async function loadMore() {
  if (loading.value || (page.value > 0 && photos.value.length >= total.value)) return
  loading.value = true
  error.value = ''
  try {
    const res = await getPhotos(page.value + 1)
    photos.value.push(...res.items)
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
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <h1>Галерея</h1>

  <ul class="grid">
    <li v-for="(p, i) in photos" :key="p.id">
      <button type="button" @click="current = i">
        <img :src="p.thumbUrl" :alt="p.title" loading="lazy" :width="p.width" :height="p.height" />
      </button>
    </li>
  </ul>

  <div ref="sentinel" />
  <p v-if="loading" class="status">Загрузка…</p>
  <p v-if="error" class="status error">
    {{ error }} <button type="button" @click="loadMore">Повторить</button>
  </p>

  <PhotoLightbox v-model:index="current" :photos="photos" />
</template>

<style scoped>
.grid {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.grid button {
  all: unset;
  cursor: pointer;
  display: block;
}
.grid button:focus-visible {
  outline: 2px solid #fff;
}
.grid img {
  width: 100%;
  height: auto;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
  border-radius: 4px;
}
.status {
  text-align: center;
  margin: 24px 0;
}
.error {
  color: #f66;
}
</style>
