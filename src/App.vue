<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { LOCALES, saveLocale, type Locale } from '@/i18n'
import { me } from '@/api'
import { useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useCategories } from '@/composables/useCategories'
import AgeGate from '@/components/AgeGate.vue'
import ScrollTop from '@/components/ScrollTop.vue'
import CookieBanner from '@/components/CookieBanner.vue'

const { categories } = useCategories()
// native <details> dropdowns (categories on desktop, the whole menu on phones): close after navigating
const menu = useTemplateRef<HTMLDetailsElement>('menu')
const mobileMenu = useTemplateRef<HTMLDetailsElement>('mobileMenu')
const route = useRoute()
watch(
  () => route.fullPath,
  () => [menu.value, mobileMenu.value].forEach((d) => d?.removeAttribute('open')),
)

const { locale } = useI18n()
function setLocale(l: Locale) {
  locale.value = l
  saveLocale(l)
}
</script>

<template>
  <header class="sticky top-0 z-10 border-b border-base-300 bg-base-100/90 backdrop-blur">
    <nav class="navbar mx-auto max-w-[120rem] gap-2 px-4">
      <!-- phones: everything behind a burger; md and up: the horizontal menu below -->
      <details ref="mobileMenu" class="dropdown md:hidden">
        <summary class="btn btn-ghost btn-square" :aria-label="$t('nav.menu')">
          <svg
            class="size-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </summary>
        <ul
          class="menu dropdown-content z-20 mt-2 max-h-[80vh] w-64 flex-nowrap overflow-y-auto rounded-box bg-base-200 shadow-lg"
        >
          <li>
            <RouterLink to="/" :class="{ 'menu-active': $route.path === '/' }">
              {{ $t('nav.home') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink
              to="/galleries"
              :class="{ 'menu-active': $route.path.startsWith('/galleries') }"
            >
              {{ $t('nav.galleries') }}
            </RouterLink>
          </li>
          <template v-if="categories?.length">
            <li class="menu-title">{{ $t('nav.categories') }}</li>
            <li v-for="c in categories" :key="c.id">
              <RouterLink
                :to="`/categories/${c.slug}`"
                class="justify-between"
                :class="{ 'menu-active': $route.path === `/categories/${c.slug}` }"
              >
                {{ c.title }}
                <span class="badge badge-sm badge-ghost">{{ c.galleriesCount }}</span>
              </RouterLink>
            </li>
          </template>
          <li class="mt-1 border-t border-base-300 pt-1">
            <RouterLink to="/terms" :class="{ 'menu-active': $route.path === '/terms' }">
              {{ $t('nav.terms') }}
            </RouterLink>
          </li>
        </ul>
      </details>
      <RouterLink to="/" class="btn btn-ghost px-2 text-lg font-bold max-sm:hidden">
        {{ $t('site.name') }}
      </RouterLink>
      <ul class="menu menu-horizontal hidden gap-1 px-0 md:flex">
        <li>
          <RouterLink to="/" :class="{ 'menu-active': $route.path === '/' }">
            {{ $t('nav.home') }}
          </RouterLink>
        </li>
        <li>
          <!-- routes aren't nested, so mark /galleries/:id active by prefix -->
          <RouterLink
            to="/galleries"
            :class="{ 'menu-active': $route.path.startsWith('/galleries') }"
          >
            {{ $t('nav.galleries') }}
          </RouterLink>
        </li>
        <li v-if="categories?.length">
          <details ref="menu">
            <summary :class="{ 'menu-active': $route.path.startsWith('/categories') }">
              {{ $t('nav.categories') }}
            </summary>
            <ul class="z-20 max-h-[70vh] w-60 overflow-y-auto bg-base-200 shadow-lg">
              <li v-for="c in categories" :key="c.id">
                <RouterLink
                  :to="`/categories/${c.slug}`"
                  class="justify-between"
                  :class="{ 'menu-active': $route.path === `/categories/${c.slug}` }"
                >
                  {{ c.title }}
                  <span class="badge badge-sm badge-ghost">{{ c.galleriesCount }}</span>
                </RouterLink>
              </li>
            </ul>
          </details>
        </li>
        <li>
          <RouterLink to="/terms" :class="{ 'menu-active': $route.path === '/terms' }">
            {{ $t('nav.terms') }}
          </RouterLink>
        </li>
      </ul>
      <div class="flex-1" />
      <!-- server and first client render are anonymous; the email appears once /me loads -->
      <RouterLink
        v-if="me"
        to="/account"
        class="btn btn-ghost btn-sm max-w-[40vw] normal-case"
        :class="{ 'btn-active': $route.path.startsWith('/account') }"
      >
        <span class="truncate">{{ me.email }}</span>
      </RouterLink>
      <RouterLink v-else to="/login" class="btn btn-primary btn-sm">
        {{ $t('nav.login') }}
      </RouterLink>
      <div class="join" role="group" :aria-label="$t('nav.language')">
        <button
          v-for="l in LOCALES"
          :key="l"
          type="button"
          class="btn join-item btn-xs"
          :class="{ 'btn-active': $i18n.locale === l }"
          :aria-pressed="$i18n.locale === l"
          @click="setLocale(l)"
        >
          {{ l.toUpperCase() }}
        </button>
      </div>
    </nav>
  </header>
  <main class="mx-auto max-w-[120rem] p-4">
    <!-- key: /galleries/1 -> /galleries/2 remounts instead of reusing stale state -->
    <RouterView :key="$route.fullPath" />
  </main>
  <ScrollTop />
  <CookieBanner />
  <AgeGate />
</template>
