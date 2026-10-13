<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getFeed } from '@/api'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ListStatus from '@/components/ListStatus.vue'

// /tags/:tag (newest first, indexed) and /search?q= (most popular first, noindex): the feed with a filter.
// A new tag or query = new URL = remount (App.vue key)
const props = defineProps<{ tag?: string }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const q = String(route.query.q ?? '').trim()
const searching = !props.tag
const ready = !searching || q.length >= 2 // shorter: the API answers 400, so no request at all

usePageMeta(() =>
  searching
    ? { title: q ? t('find.results', { q }) : t('find.title'), noindex: true }
    : {
        title: `#${props.tag}`,
        description: t('find.tagDescription', { tag: props.tag }),
      },
)

const { items, total, loading, error, canRetry, empty, loadMore, remove } = useInfiniteList(
  searching ? `search:${q}` : `tag:${props.tag}`,
  (page) =>
    ready
      ? getFeed(searching ? 'popular' : 'new', '', page, 20, searching ? { q } : { tag: props.tag })
      : Promise.resolve({ items: [], total: 0 }),
)

const text = ref(q)
const input = useTemplateRef<HTMLInputElement>('input')
onMounted(() => !q && input.value?.focus()) // came from the header icon: type right away
const submit = () => router.push({ name: 'search', query: { q: text.value.trim() } })
</script>

<template>
  <section aria-labelledby="find-title" itemscope itemtype="https://schema.org/CollectionPage">
    <h1 id="find-title" itemprop="name">
      {{ searching ? $t('find.title') : `#${tag}` }}
    </h1>
    <!-- a real GET form: works before hydration too -->
    <form
      v-if="searching"
      action="/search"
      role="search"
      class="join mb-6 w-full max-w-md"
      @submit.prevent="submit"
    >
      <input
        ref="input"
        v-model="text"
        name="q"
        type="search"
        required
        minlength="2"
        maxlength="100"
        class="input join-item flex-1"
        :placeholder="$t('find.placeholder')"
        :aria-label="$t('find.title')"
      />
      <button class="btn btn-primary join-item">{{ $t('find.go') }}</button>
    </form>
    <PhotoGrid
      v-if="ready"
      :items="items"
      :total="total"
      :load-more="loadMore"
      :guest-free="10"
      @delete="remove"
      :alt="(p) => p.title"
    />
  </section>

  <div ref="sentinel" />
  <ListStatus
    v-if="ready"
    :loading="loading"
    :empty="empty"
    :empty-text="$t('find.empty')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
