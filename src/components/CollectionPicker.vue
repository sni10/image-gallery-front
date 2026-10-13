<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ApiError,
  createCollection,
  getCollections,
  setInCollection,
  type CollectionCard,
} from '@/api'
import { errorMessage } from '@/i18n'
import { pickerPhoto } from '@/composables/useCollectionPicker'

// Native <dialog>: focus trap, Esc and the backdrop come with the platform.
const { t } = useI18n()
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const list = ref<CollectionCard[] | null>(null) // null = loading
const title = ref('')
const error = ref('')
const busy = ref(false)

const say = (e: unknown) =>
  (error.value =
    e instanceof ApiError && e.data.code === 'limit' ? t('collections.limit') : errorMessage(t, e))

watch(pickerPhoto, async (id) => {
  if (!id) return
  list.value = null
  error.value = title.value = ''
  dialog.value?.showModal()
  try {
    list.value = await getCollections(id)
  } catch (e) {
    list.value = []
    say(e)
  }
})

// flips instantly, rolls back on failure
async function toggle(c: CollectionCard) {
  const on = (c.hasPhoto = !c.hasPhoto)
  error.value = ''
  try {
    await setInCollection(c.id, pickerPhoto.value!, on)
    c.photosCount += on ? 1 : -1
  } catch (e) {
    c.hasPhoto = !on
    say(e)
  }
}

// new collection with this photo already in it
async function create() {
  if (busy.value || !title.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    const c = await createCollection(title.value.trim())
    await setInCollection(c.id, pickerPhoto.value!, true)
    list.value = [{ ...c, hasPhoto: true, photosCount: c.photosCount + 1 }, ...(list.value ?? [])]
    title.value = ''
  } catch (e) {
    say(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <dialog ref="dialog" class="modal" aria-labelledby="picker-title" @close="pickerPhoto = null">
    <div class="modal-box flex max-w-sm flex-col gap-3">
      <h2 id="picker-title" class="m-0 text-lg font-semibold">{{ $t('collections.addTo') }}</h2>

      <div v-if="!list" class="flex justify-center py-4">
        <span class="loading loading-spinner" role="status">
          <span class="sr-only">{{ $t('common.loading') }}</span>
        </span>
      </div>
      <ul v-else-if="list.length" class="flex max-h-72 flex-col gap-1 overflow-y-auto">
        <li v-for="c in list" :key="c.id">
          <label
            class="label w-full cursor-pointer gap-3 rounded-box px-2 py-1.5 hover:bg-base-200"
          >
            <input
              type="checkbox"
              class="checkbox checkbox-sm checkbox-primary"
              :checked="c.hasPhoto"
              @change="toggle(c)"
            />
            <span class="flex-1 truncate text-base-content">{{ c.title }}</span>
            <span class="badge badge-sm badge-ghost">{{ c.photosCount }}</span>
          </label>
        </li>
      </ul>
      <p v-else class="text-sm text-base-content/60">{{ $t('collections.none') }}</p>

      <form class="join w-full" @submit.prevent="create">
        <input
          v-model="title"
          required
          maxlength="100"
          class="input join-item input-sm flex-1"
          :placeholder="$t('collections.newTitle')"
          :aria-label="$t('collections.newTitle')"
        />
        <button class="btn btn-primary join-item btn-sm" :disabled="busy">
          {{ $t('collections.create') }}
        </button>
      </form>
      <div v-if="error" class="alert alert-error py-2 text-sm" role="alert">{{ error }}</div>

      <div class="modal-action mt-0">
        <RouterLink to="/account/collections" class="btn btn-ghost btn-sm" @click="dialog?.close()">
          {{ $t('collections.title') }}
        </RouterLink>
        <button type="button" class="btn btn-sm" @click="dialog?.close()">
          {{ $t('lightbox.close') }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button :aria-label="$t('lightbox.close')">✕</button>
    </form>
  </dialog>
</template>
