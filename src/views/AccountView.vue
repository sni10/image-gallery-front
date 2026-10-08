<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { changeEmail, changePassword, getMe, hasSession, logout, me } from '@/api'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSubmit } from '@/composables/useSubmit'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
usePageMeta(() => ({ title: t('account.title'), noindex: true }))

onMounted(async () => {
  if (!hasSession()) return router.replace({ name: 'login', query: { next: route.fullPath } })
  me.value ??= await getMe().catch(() => null)
})

const newEmail = ref('')
const emailPassword = ref('')
const emailSentTo = ref('')
const emailForm = useSubmit(async () => {
  await changeEmail(newEmail.value, emailPassword.value)
  emailSentTo.value = newEmail.value
  emailPassword.value = ''
})

const currentPassword = ref('')
const newPassword = ref('')
const passwordDone = ref(false)
const passwordForm = useSubmit(async () => {
  passwordDone.value = false
  await changePassword(currentPassword.value, newPassword.value)
  currentPassword.value = newPassword.value = ''
  passwordDone.value = true
})

async function signOut() {
  await logout()
  location.assign('/') // full load drops everything cached for this user
}
</script>

<template>
  <section class="form" aria-labelledby="account-title">
    <h1 id="account-title">{{ $t('account.title') }}</h1>
    <template v-if="me">
      <p>
        <strong>{{ me.email }}</strong>
        <br />
        {{ $t('account.joined', { date: new Date(me.dateJoined).toLocaleDateString(locale) }) }}
      </p>
      <p>
        <RouterLink to="/account/favorites">{{ $t('favorites.title') }}</RouterLink>
      </p>
      <button type="button" @click="signOut">{{ $t('account.logout') }}</button>
    </template>
    <p v-else role="status">{{ $t('common.loading') }}</p>

    <form @submit.prevent="emailForm.submit">
      <h2>{{ $t('account.changeEmail') }}</h2>
      <label>
        {{ $t('account.newEmail') }}
        <input v-model="newEmail" type="email" required autocomplete="email" />
      </label>
      <p v-if="emailForm.fields.value.newEmail" class="error">
        {{ emailForm.fields.value.newEmail }}
      </p>
      <label>
        {{ $t('auth.password') }}
        <input v-model="emailPassword" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="emailForm.fields.value.password" class="error">
        {{ emailForm.fields.value.password }}
      </p>
      <p v-if="emailForm.error.value" class="error" role="alert">{{ emailForm.error.value }}</p>
      <p v-if="emailSentTo" role="status">{{ $t('account.emailSent', { email: emailSentTo }) }}</p>
      <button :disabled="emailForm.busy.value">{{ $t('account.save') }}</button>
    </form>

    <form @submit.prevent="passwordForm.submit">
      <h2>{{ $t('account.changePassword') }}</h2>
      <label>
        {{ $t('account.currentPassword') }}
        <input v-model="currentPassword" type="password" required autocomplete="current-password" />
      </label>
      <p v-if="passwordForm.fields.value.currentPassword" class="error">
        {{ passwordForm.fields.value.currentPassword }}
      </p>
      <label>
        {{ $t('account.newPassword') }}
        <input v-model="newPassword" type="password" required autocomplete="new-password" />
      </label>
      <p v-if="passwordForm.fields.value.newPassword" class="error">
        {{ passwordForm.fields.value.newPassword }}
      </p>
      <p v-if="passwordForm.error.value" class="error" role="alert">
        {{ passwordForm.error.value }}
      </p>
      <p v-if="passwordDone" role="status">{{ $t('account.passwordChanged') }}</p>
      <button :disabled="passwordForm.busy.value">{{ $t('account.save') }}</button>
    </form>
  </section>
</template>
