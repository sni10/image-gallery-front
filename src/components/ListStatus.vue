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
    <span v-if="loading" class="loading loading-spinner loading-lg" role="status">
      <span class="sr-only">{{ $t('common.loading') }}</span>
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
