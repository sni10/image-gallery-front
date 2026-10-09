<script setup lang="ts">
// schema.org BreadcrumbList; the last item is the current page (no link)
defineProps<{ items: { title: string; to?: string }[] }>()
</script>

<template>
  <nav :aria-label="$t('gallery.breadcrumbs')" class="breadcrumbs mb-2 text-sm">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li
        v-for="(c, i) in items"
        :key="i"
        itemprop="itemListElement"
        itemscope
        itemtype="https://schema.org/ListItem"
        :aria-current="c.to ? undefined : 'page'"
      >
        <RouterLink v-if="c.to" :to="c.to" itemprop="item" class="text-base-content/70">
          <span itemprop="name">{{ c.title }}</span>
        </RouterLink>
        <span v-else itemprop="name">{{ c.title }}</span>
        <meta itemprop="position" :content="String(i + 1)" />
      </li>
    </ol>
  </nav>
</template>
