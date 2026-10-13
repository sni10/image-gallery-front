<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  deleteCollection,
  getCollection,
  getCollectionPhotos,
  hasSession,
  renameCollection,
  type Collection,
} from '@/api'
import { errorMessage } from '@/i18n'
import { useInfiniteList } from '@/composables/useInfiniteList'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSubmit } from '@/composables/useSubmit'
import PhotoGrid from '@/components/PhotoGrid.vue'
import ListStatus from '@/components/ListStatus.vue'
import BreadCrumbs from '@/components/BreadCrumbs.vue'

// One collection: photos, rename, delete. Client-only (needs the token).
// ponytail: a photo unticked in the picker stays on this page until reload, like un-hearted favorites
const props = defineProps<{ id: string }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const collection = ref<Collection | null>(null)
const failure = ref<unknown>(null)
const crumbs = computed(() => [
  { title: t('account.title'), to: '/account' },
  { title: t('collections.title'), to: '/account/collections' },
  ...(collection.value ? [{ title: collection.value.title }] : []),
])
usePageMeta(() => ({ title: collection.value?.title ?? t('collections.title'), noindex: true }))

onMounted(async () => {
  if (!hasSession()) return router.replace({ name: 'login', query: { next: route.fullPath } })
  try {
    collection.value = await getCollection(props.id)
  } catch (e) {
    failure.value = e // 404: not mine or deleted
  }
})

const { items, total, loading, error, canRetry, empty, loadMore, remove } = useInfiniteList(
  `collection:${props.id}`,
  (page) => getCollectionPhotos(props.id, page),
  false,
)

const editing = ref(false)
const newTitle = ref('')
function startRename() {
  newTitle.value = collection.value!.title
  editing.value = true
}
const renameForm = useSubmit(async () => {
  collection.value = await renameCollection(props.id, newTitle.value.trim())
  editing.value = false
})

// two clicks instead of confirm(): no blocking browser dialog
const confirmDelete = ref(false)
const deleteForm = useSubmit(async () => {
  await deleteCollection(props.id)
  router.push('/account/collections')
})
</script>

<template>
  <BreadCrumbs :items="crumbs" />

  <div v-if="failure" class="alert alert-error my-8" role="alert">
    {{ errorMessage(t, failure) }}
  </div>
  <section v-else aria-labelledby="collection-title">
    <form v-if="editing" class="join mb-4 w-full max-w-md" @submit.prevent="renameForm.submit">
      <input
        v-model="newTitle"
        required
        maxlength="100"
        class="input join-item flex-1"
        :aria-label="$t('collections.rename')"
        :class="{ 'input-error': renameForm.fields.value.title }"
      />
      <button class="btn btn-primary join-item" :disabled="renameForm.busy.value">
        {{ $t('account.save') }}
      </button>
      <button type="button" class="btn join-item" @click="editing = false">
        {{ $t('lightbox.close') }}
      </button>
    </form>
    <div v-else class="mb-4 flex flex-wrap items-center gap-2">
      <h1 id="collection-title" class="m-0 flex-1">{{ collection?.title ?? '…' }}</h1>
      <template v-if="collection">
        <button type="button" class="btn btn-sm" @click="startRename">
          {{ $t('collections.rename') }}
        </button>
        <button
          v-if="!confirmDelete"
          type="button"
          class="btn btn-sm btn-outline btn-error"
          @click="confirmDelete = true"
        >
          {{ $t('collections.delete') }}
        </button>
        <button
          v-else
          type="button"
          class="btn btn-sm btn-error"
          :disabled="deleteForm.busy.value"
          @click="deleteForm.submit"
        >
          {{ $t('collections.deleteConfirm') }}
        </button>
      </template>
    </div>
    <p v-if="renameForm.fields.value.title" class="mb-2 text-sm text-error">
      {{ renameForm.fields.value.title }}
    </p>
    <div
      v-if="renameForm.error.value || deleteForm.error.value"
      class="alert alert-error mb-4"
      role="alert"
    >
      {{ renameForm.error.value || deleteForm.error.value }}
    </div>

    <PhotoGrid
      :items="items"
      :total="total"
      :load-more="loadMore"
      @delete="remove"
      :alt="(p) => p.title"
    />
  </section>

  <div ref="sentinel" />
  <ListStatus
    v-if="!failure"
    :loading="loading"
    :empty="empty"
    :empty-text="$t('collections.emptyOne')"
    :error="error"
    :can-retry="canRetry"
    @retry="loadMore"
  />
</template>
