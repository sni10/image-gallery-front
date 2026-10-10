<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

// "Back to top", pinned to the viewport corner; shows up after scrolling past one screen
const shown = ref(false)
const onScroll = () => (shown.value = scrollY > innerHeight)
function top() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <button
    v-show="shown"
    type="button"
    class="btn btn-circle fixed right-4 bottom-4 z-50 shadow-lg"
    :title="$t('common.toTop')"
    :aria-label="$t('common.toTop')"
    @click="top"
  >
    <svg viewBox="0 0 24 24" class="size-5 fill-none stroke-current stroke-2" aria-hidden="true">
      <path d="M5 15l7-7 7 7" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
</template>
