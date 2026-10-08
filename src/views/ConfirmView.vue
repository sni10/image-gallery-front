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
  <section class="form" aria-labelledby="confirm-title">
    <h1 id="confirm-title">{{ $t('confirm.title') }}</h1>
    <p :class="{ error: failed }" role="status">{{ message || $t('common.loading') }}</p>
  </section>
</template>
