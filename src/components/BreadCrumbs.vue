<script setup lang="ts">
// schema.org BreadcrumbList; the last item is the current page (no link)
defineProps<{ items: { title: string; to?: string }[] }>()
</script>

<template>
  <nav :aria-label="$t('gallery.breadcrumbs')" class="crumbs">
    <ol itemscope itemtype="https://schema.org/BreadcrumbList">
      <li
        v-for="(c, i) in items"
        :key="i"
        itemprop="itemListElement"
        itemscope
        itemtype="https://schema.org/ListItem"
        :aria-current="c.to ? undefined : 'page'"
      >
        <RouterLink v-if="c.to" :to="c.to" itemprop="item">
          <span itemprop="name">{{ c.title }}</span>
        </RouterLink>
        <span v-else itemprop="name">{{ c.title }}</span>
        <meta itemprop="position" :content="String(i + 1)" />
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.crumbs ol {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 14px;
}
.crumbs li + li::before {
  content: '/';
  margin-right: 8px;
  opacity: 0.5;
}
.crumbs a {
  opacity: 0.7;
  text-decoration: none;
}
.crumbs a:hover {
  opacity: 1;
}
</style>
