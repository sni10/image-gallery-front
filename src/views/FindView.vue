<script setup lang="ts">
import { onMounted, onServerPrefetch, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { getFeed, getTags } from '@/api'
import { useSsrState } from '@/ssr'
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

// tags met on the same photos, most shared first; rendered on the server; an error just hides the row
const related = useSsrState<{ tag: string; count: number }[]>(`related:${props.tag}`, () => [])
const loadRelated = () =>
  props.tag &&
  getTags(props.tag).then(
    (r) => (related.value = r.items),
    () => {},
  )
onServerPrefetch(loadRelated)
onMounted(() => !related.value.length && loadRelated())

const text = ref(q)
const input = useTemplateRef<HTMLInputElement>('input')
onMounted(() => !q && input.value?.focus()) // came from the header icon: type right away
const submit = () => router.push({ name: 'search', query: { q: text.value.trim() } })
</script>

<template>
  <section aria-labelledby="find-title" itemscope itemtype="https://schema.org/CollectionPage">
    <h1 v-if="searching" id="find-title" itemprop="name">{{ $t('find.title') }}</h1>
    <!-- the tag, then related tags in the same row (links: crawlers walk from tag to tag) -->
    <div v-else class="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-2">
      <h1 id="find-title" class="m-0" itemprop="name">#{{ tag }}</h1>
      <nav v-if="related.length" class="contents" :aria-label="$t('find.related')">
        <RouterLink
          v-for="r in related"
          :key="r.tag"
          :to="{ name: 'tag', params: { tag: r.tag } }"
          rel="tag"
          class="badge badge-outline hover:badge-primary"
        >
          #{{ r.tag }}
        </RouterLink>
      </nav>
    </div>
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
