<script setup lang="ts" generic="T extends { id: string }">
import { ref, computed, onMounted, onUnmounted, useTemplateRef } from 'vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    ratio: (item: T) => number // height / width
    minWidth?: number // px, min column width
  }>(),
  { minWidth: 220 },
)
defineSlots<{ default(p: { item: T; index: number }): unknown }>()

const GAP = 8 // px, keep in sync with .grid / .col gap
const grid = useTemplateRef<HTMLElement>('grid')
const cols = ref(1)
// server and first client render don't know the width: CSS columns until mounted
const measured = ref(false)
let resize: ResizeObserver | undefined

// masonry: each item goes to the currently shortest column. Heights come from the known
// ratio, so no waiting for images, and appending never moves placed items.
const columns = computed(() => {
  const out = Array.from({ length: cols.value }, () => ({
    h: 0,
    items: [] as { item: T; index: number }[],
  }))
  props.items.forEach((item, index) => {
    const col = out.reduce((a, b) => (b.h < a.h ? b : a))
    col.items.push({ item, index })
    col.h += props.ratio(item)
  })
  return out
})

// at least 2 columns: phones get two narrower columns instead of one wide
const fit = (width: number) => Math.max(2, Math.floor((width + GAP) / (props.minWidth + GAP)))

onMounted(() => {
  cols.value = fit(grid.value!.clientWidth)
  measured.value = true
  resize = new ResizeObserver(([e]) => (cols.value = fit(e!.contentRect.width)))
  resize.observe(grid.value!)
})
onUnmounted(() => resize?.disconnect())
</script>

<template>
  <div ref="grid">
    <!-- before mount: CSS columns; 50vw - 20px = half of the phone width minus main padding and GAP -->
    <!-- gap-2 = 8px = GAP -->
    <div v-if="measured" class="flex items-start gap-2">
      <ul v-for="(col, c) in columns" :key="c" class="flex min-w-0 flex-1 flex-col gap-2">
        <li v-for="{ item, index } in col.items" :key="item.id">
          <slot :item="item" :index="index" />
        </li>
      </ul>
    </div>
    <ul v-else class="gap-x-2" :style="{ columnWidth: `min(${minWidth}px, calc(50vw - 20px))` }">
      <li v-for="(item, index) in items" :key="item.id" class="mb-2 break-inside-avoid">
        <slot :item="item" :index="index" />
      </li>
    </ul>
  </div>
</template>
