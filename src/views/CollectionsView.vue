<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, createCollection, getCollections, hasSession, type CollectionCard } from '@/api'
import { errorMessage } from '@/i18n'
import { usePageMeta } from '@/composables/usePageMeta'

// My collections: cards with the last added photo as cover. Client-only: the server has no token
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
usePageMeta(() => ({ title: t('collections.title'), noindex: true }))

const list = ref<CollectionCard[] | null>(null) // null = loading
const error = ref('')
const say = (e: unknown) =>
  (error.value =
    e instanceof ApiError && e.data.code === 'limit' ? t('collections.limit') : errorMessage(t, e))

onMounted(async () => {
  if (!hasSession()) return router.replace({ name: 'login', query: { next: route.fullPath } })
  try {
    list.value = await getCollections()
  } catch (e) {
    say(e)
  }
})

const title = ref('')
const busy = ref(false)
async function create() {
  if (busy.value || !title.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    const c = await createCollection(title.value.trim())
    list.value = [c, ...(list.value ?? [])]
    title.value = ''
  } catch (e) {
    say(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section aria-labelledby="collections-title">
    <h1 id="collections-title">{{ $t('collections.title') }}</h1>

    <form class="join mb-6 w-full max-w-md" @submit.prevent="create">
      <input
        v-model="title"
        required
        maxlength="100"
        class="input join-item flex-1"
        :placeholder="$t('collections.newTitle')"
        :aria-label="$t('collections.newTitle')"
      />
      <button class="btn btn-primary join-item" :disabled="busy">
        {{ $t('collections.create') }}
      </button>
    </form>
    <div v-if="error" class="alert alert-error mb-4" role="alert">{{ error }}</div>

    <div v-if="!list && !error" class="flex justify-center py-8">
      <span class="loading loading-spinner loading-lg" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
      </span>
    </div>
    <p v-else-if="list && !list.length" class="text-base-content/60">
      {{ $t('collections.empty') }}
    </p>
    <ul v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="c in list" :key="c.id">
        <RouterLink
          :to="`/account/collections/${c.id}`"
          class="card overflow-hidden bg-base-200 transition hover:shadow-lg"
        >
          <figure class="aspect-square bg-base-300">
            <img
              v-if="c.cover?.thumbUrl"
              :src="c.cover.thumbUrl"
              alt=""
              loading="lazy"
              class="size-full object-cover"
            />
          </figure>
          <div class="card-body gap-0 p-3">
            <strong class="truncate">{{ c.title }}</strong>
            <span class="text-sm text-base-content/60">
              {{ $t('catalog.photos', { n: c.photosCount }, c.photosCount) }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
