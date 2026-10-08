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

onMounted(() => {
  resize = new ResizeObserver(([e]) => {
    cols.value = Math.max(1, Math.floor((e!.contentRect.width + GAP) / (props.minWidth + GAP)))
  })
  resize.observe(grid.value!)
})
onUnmounted(() => resize?.disconnect())
</script>

<template>
  <div ref="grid" class="grid">
    <ul v-for="(col, c) in columns" :key="c" class="col">
      <li v-for="{ item, index } in col.items" :key="item.id">
        <slot :item="item" :index="index" />
      </li>
    </ul>
  </div>
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
</style>
