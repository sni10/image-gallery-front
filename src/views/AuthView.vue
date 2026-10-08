<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, login, register, resendConfirmation } from '@/api'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSubmit } from '@/composables/useSubmit'

const props = defineProps<{ mode: 'login' | 'register' }>()
const { t } = useI18n()
const route = useRoute()
const title = computed(() => (props.mode === 'login' ? t('auth.login') : t('auth.register')))
usePageMeta(() => ({ title: title.value, noindex: true }))

const email = ref('')
const password = ref('')
const sent = ref(false) // confirmation email is on its way
const unconfirmed = ref(false)
// only local paths: ?next=//evil.com must not redirect off-site
const next = computed(() => {
  const n = route.query.next
  return typeof n === 'string' && /^\/(?!\/)/.test(n) ? n : '/'
})

const { busy, fields, error, submit } = useSubmit(async () => {
  unconfirmed.value = false
  if (props.mode === 'register') {
    await register(email.value, password.value)
    sent.value = true
    return
  }
  try {
    await login(email.value, password.value)
  } catch (e) {
    if (e instanceof ApiError && e.status === 403 && e.data.code === 'email_not_confirmed') {
      unconfirmed.value = true
      return
    }
    throw e
  }
  // full load: lists cached from the anonymous visit get re-fetched with isFavorite
  location.assign(next.value)
})

async function resend() {
  await resendConfirmation(email.value).catch(() => {}) // always 204
  unconfirmed.value = false
  sent.value = true
}
</script>

<template>
  <section class="form" aria-labelledby="auth-title">
    <h1 id="auth-title">{{ title }}</h1>

    <template v-if="sent">
      <p role="status">{{ $t('auth.sent', { email }) }}</p>
      <button type="button" @click="resend">{{ $t('auth.resend') }}</button>
    </template>

    <form v-else @submit.prevent="submit">
      <label>
        {{ $t('auth.email') }}
        <input v-model="email" type="email" required autocomplete="email" />
      </label>
      <p v-if="fields.email" class="error">{{ fields.email }}</p>
      <label>
        {{ $t('auth.password') }}
        <input
          v-model="password"
          type="password"
          required
          :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
        />
      </label>
      <p v-if="fields.password" class="error">{{ fields.password }}</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-if="unconfirmed" role="alert">
        {{ $t('auth.unconfirmed') }}
        <button type="button" @click="resend">{{ $t('auth.resend') }}</button>
      </p>
      <button :disabled="busy">{{ title }}</button>
    </form>

    <p v-if="mode === 'login'">
      <RouterLink :to="{ name: 'register', query: route.query }">{{
        $t('auth.noAccount')
      }}</RouterLink>
    </p>
    <p v-else>
      <RouterLink :to="{ name: 'login', query: route.query }">{{
        $t('auth.haveAccount')
      }}</RouterLink>
    </p>
  </section>
</template>
