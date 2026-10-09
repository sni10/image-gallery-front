<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, confirmEmail, confirmEmailChange, me } from '@/api'
import { errorMessage } from '@/i18n'
import { usePageMeta } from '@/composables/usePageMeta'

// Landing for email links: /confirm-email?token=… (sign-up) and /confirm-email-change?token=…
const props = defineProps<{ change?: boolean }>()
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
usePageMeta(() => ({ title: t('confirm.title'), noindex: true }))

const message = ref('')
const failed = ref(false)

onMounted(async () => {
  const token = String(route.query.token ?? '')
  try {
    if (props.change) {
      const { email } = await confirmEmailChange(token)
      if (me.value) me.value.email = email
      message.value = t('confirm.emailChanged', { email })
    } else {
      await confirmEmail(token) // logs in
      router.replace({ name: 'account' })
    }
  } catch (e) {
    failed.value = true
    message.value =
      e instanceof ApiError && e.status === 400 ? t('confirm.invalid') : errorMessage(t, e)
  }
})
</script>

<template>
  <section class="card mx-auto my-8 max-w-md bg-base-200" aria-labelledby="confirm-title">
    <div class="card-body">
      <h1 id="confirm-title" class="card-title text-2xl">{{ $t('confirm.title') }}</h1>
      <div
        v-if="message"
        class="alert"
        :class="failed ? 'alert-error' : 'alert-success'"
        role="status"
      >
        {{ message }}
      </div>
      <span v-else class="loading loading-spinner" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
      </span>
    </div>
  </section>
</template>
