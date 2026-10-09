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
  <section class="form account" aria-labelledby="account-title">
    <h1 id="account-title">{{ $t('account.title') }}</h1>

    <div v-if="me" class="card profile">
      <span class="avatar" aria-hidden="true">{{ me.email[0]?.toUpperCase() }}</span>
      <div class="who">
        <strong>{{ me.email }}</strong>
        <span class="muted">
          {{ $t('account.joined', { date: new Date(me.dateJoined).toLocaleDateString(locale) }) }}
        </span>
      </div>
      <div class="actions">
        <RouterLink class="btn" to="/account/favorites">{{ $t('favorites.title') }}</RouterLink>
        <button type="button" class="btn danger" @click="signOut">
          {{ $t('account.logout') }}
        </button>
      </div>
    </div>
    <p v-else class="card" role="status">{{ $t('common.loading') }}</p>

    <form class="card" @submit.prevent="emailForm.submit">
      <h2>{{ $t('account.changeEmail') }}</h2>
      <label>
        {{ $t('account.newEmail') }}
        <input v-model="newEmail" type="email" required autocomplete="email" />
        <span v-if="emailForm.fields.value.newEmail" class="error">
          {{ emailForm.fields.value.newEmail }}
        </span>
      </label>
      <label>
        {{ $t('auth.password') }}
        <input v-model="emailPassword" type="password" required autocomplete="current-password" />
        <span v-if="emailForm.fields.value.password" class="error">
          {{ emailForm.fields.value.password }}
        </span>
      </label>
      <p v-if="emailForm.error.value" class="error" role="alert">{{ emailForm.error.value }}</p>
      <p v-if="emailSentTo" class="ok" role="status">
        {{ $t('account.emailSent', { email: emailSentTo }) }}
      </p>
      <button :disabled="emailForm.busy.value">{{ $t('account.save') }}</button>
    </form>

    <form class="card" @submit.prevent="passwordForm.submit">
      <h2>{{ $t('account.changePassword') }}</h2>
      <label>
        {{ $t('account.currentPassword') }}
        <input v-model="currentPassword" type="password" required autocomplete="current-password" />
        <span v-if="passwordForm.fields.value.currentPassword" class="error">
          {{ passwordForm.fields.value.currentPassword }}
        </span>
      </label>
      <label>
        {{ $t('account.newPassword') }}
        <input v-model="newPassword" type="password" required autocomplete="new-password" />
        <span v-if="passwordForm.fields.value.newPassword" class="error">
          {{ passwordForm.fields.value.newPassword }}
        </span>
      </label>
      <p v-if="passwordForm.error.value" class="error" role="alert">
        {{ passwordForm.error.value }}
      </p>
      <p v-if="passwordDone" class="ok" role="status">{{ $t('account.passwordChanged') }}</p>
      <button :disabled="passwordForm.busy.value">{{ $t('account.save') }}</button>
    </form>
  </section>
</template>

<style scoped>
.account {
  max-width: 480px;
  display: grid;
  gap: 16px;
}
.account h1 {
  margin: 0 0 4px;
}
.card {
  margin: 0;
  padding: 20px;
  border: 1px solid #2a2a2a;
  border-radius: 12px;
  background: #161616;
}
form.card {
  margin-bottom: 0;
  gap: 14px;
}
.card h2 {
  margin: 0;
  font-size: 18px;
}
.profile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.avatar {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #2a2a2a;
  font-size: 20px;
  font-weight: 600;
}
.who {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.who strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.muted {
  font-size: 14px;
  opacity: 0.6;
}
.actions {
  display: flex;
  gap: 8px;
  width: 100%;
}
.form .actions .btn {
  flex: 1;
  text-align: center;
  text-decoration: none;
  font-size: 14px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #444;
  background: #1c1c1c;
  color: inherit;
}
.form .actions .btn:hover {
  border-color: #777;
}
.form .actions .danger {
  color: #f88;
}
label .error {
  font-size: 13px;
}
.ok {
  color: #6c6;
}
</style>
