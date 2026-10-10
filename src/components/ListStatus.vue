<script setup lang="ts">
// Footer of an infinite list: spinner, "nothing here" text, error with a retry button.
defineProps<{
  loading: boolean
  empty: boolean
  emptyText: string
  error: string
  canRetry: boolean
}>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="my-8 flex flex-col items-center gap-4">
    <!-- invisible, not v-if: the spinner keeps its height, so toggling it never shifts the page -->
    <span
      class="loading loading-spinner loading-lg"
      :class="{ invisible: !loading }"
      role="status"
      :aria-hidden="!loading"
    >
      <span v-if="loading" class="sr-only">{{ $t('common.loading') }}</span>
    </span>
    <p v-if="empty" class="text-base-content/60" role="status">{{ emptyText }}</p>
    <div v-if="error" class="alert alert-error w-auto" role="alert">
      <span>{{ error }}</span>
      <button v-if="canRetry" type="button" class="btn btn-sm" @click="$emit('retry')">
        {{ $t('common.retry') }}
      </button>
    </div>
  </div>
</template>
