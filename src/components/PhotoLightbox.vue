<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Photo } from '@/api/photos'

const props = defineProps<{ photos: Photo[] }>()
const index = defineModel<number | null>('index', { required: true })

const dialog = ref<HTMLDialogElement>()
const photo = computed(() => (index.value == null ? null : props.photos[index.value]))

watch(index, (i) => {
  if (i == null) dialog.value?.close()
  else if (!dialog.value?.open) dialog.value?.showModal()
})

function step(d: number) {
  if (index.value == null) return
  const n = props.photos.length
  index.value = (index.value + d + n) % n
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') step(-1)
  if (e.key === 'ArrowRight') step(1)
}
</script>

<template>
  <!-- native <dialog>: Esc, focus trap, backdrop for free -->
  <dialog ref="dialog" @close="index = null" @keydown="onKey" @click.self="index = null">
    <figure v-if="photo">
      <img :src="photo.url" :alt="photo.title" />
      <figcaption>{{ photo.title }}</figcaption>
    </figure>
    <button type="button" class="prev" aria-label="Предыдущее" @click="step(-1)">‹</button>
    <button type="button" class="next" aria-label="Следующее" @click="step(1)">›</button>
    <button type="button" class="close" aria-label="Закрыть" @click="index = null">×</button>
  </dialog>
</template>

<style scoped>
dialog {
  padding: 0;
  border: 0;
  background: transparent;
  max-width: 95vw;
  max-height: 95vh;
  overflow: visible;
}
dialog::backdrop {
  background: rgb(0 0 0 / 0.9);
}
figure {
  margin: 0;
  color: #eee;
  text-align: center;
}
img {
  max-width: 95vw;
  max-height: 85vh;
  display: block;
}
button {
  position: fixed;
  background: none;
  border: 0;
  color: #fff;
  font-size: 48px;
  cursor: pointer;
}
.prev {
  left: 8px;
  top: 50%;
}
.next {
  right: 8px;
  top: 50%;
}
.close {
  right: 16px;
  top: 8px;
}
</style>
