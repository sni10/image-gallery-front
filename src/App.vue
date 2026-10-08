<script setup lang="ts">
import { LOCALES, setLocale } from '@/i18n'
</script>

<template>
  <header class="header">
    <nav class="nav">
      <RouterLink to="/" :class="{ active: $route.path === '/' }">{{ $t('nav.home') }}</RouterLink>
      <!-- routes aren't nested, so mark /galleries/:id active by prefix -->
      <RouterLink to="/galleries" :class="{ active: $route.path.startsWith('/galleries') }">
        {{ $t('nav.galleries') }}
      </RouterLink>
      <div class="lang" role="group" :aria-label="$t('nav.language')">
        <button
          v-for="l in LOCALES"
          :key="l"
          type="button"
          :aria-pressed="$i18n.locale === l"
          @click="setLocale(l)"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>
    </nav>
  </header>
  <main>
    <!-- key: /galleries/1 -> /galleries/2 remounts instead of reusing stale state -->
    <RouterView :key="$route.fullPath" />
  </main>
</template>

<style>
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #111;
  color: #eee;
}
a {
  color: inherit;
}
main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgb(17 17 17 / 0.9);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid #333;
}
.nav {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
  padding: 16px;
}
.nav a {
  text-decoration: none;
  opacity: 0.7;
}
.nav a:hover,
.nav a.active {
  opacity: 1;
}
.nav a.active {
  font-weight: 600;
}
.lang {
  margin-left: auto;
  display: flex;
  gap: 4px;
}
.lang button {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  color: inherit;
  font: inherit;
  font-size: 13px;
  padding: 2px 6px;
  cursor: pointer;
  opacity: 0.6;
}
.lang button[aria-pressed='true'] {
  opacity: 1;
  border-color: #555;
}
</style>
