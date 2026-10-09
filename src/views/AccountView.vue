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
  <section class="mx-auto my-4 grid max-w-xl gap-4" aria-labelledby="account-title">
    <h1 id="account-title" class="mb-0">{{ $t('account.title') }}</h1>

    <div v-if="me" class="card bg-base-200">
      <div class="card-body flex-row flex-wrap items-center gap-4">
        <div class="avatar avatar-placeholder">
          <div class="w-12 rounded-full bg-primary text-primary-content">
            <span class="text-xl" aria-hidden="true">{{ me.email[0]?.toUpperCase() }}</span>
          </div>
        </div>
        <div class="grid min-w-0 flex-1 gap-0.5">
          <strong class="truncate">{{ me.email }}</strong>
          <span class="text-sm text-base-content/60">
            {{ $t('account.joined', { date: new Date(me.dateJoined).toLocaleDateString(locale) }) }}
          </span>
        </div>
        <div class="flex w-full gap-2">
          <RouterLink class="btn flex-1" to="/account/favorites">
            ♥ {{ $t('favorites.title') }}
          </RouterLink>
          <button type="button" class="btn btn-outline btn-error flex-1" @click="signOut">
            {{ $t('account.logout') }}
          </button>
        </div>
      </div>
    </div>
    <div v-else class="card bg-base-200" role="status">
      <div class="card-body items-center">
        <span class="loading loading-spinner" />
        <span class="sr-only">{{ $t('common.loading') }}</span>
      </div>
    </div>

    <form class="card bg-base-200" @submit.prevent="emailForm.submit">
      <div class="card-body gap-2">
        <h2 class="card-title">{{ $t('account.changeEmail') }}</h2>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="new-email">{{ $t('account.newEmail') }}</label>
          <input
            id="new-email"
            v-model="newEmail"
            type="email"
            required
            autocomplete="email"
            class="input w-full"
            :class="{ 'input-error': emailForm.fields.value.newEmail }"
          />
          <p v-if="emailForm.fields.value.newEmail" class="label text-error">
            {{ emailForm.fields.value.newEmail }}
          </p>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="email-password">{{ $t('auth.password') }}</label>
          <input
            id="email-password"
            v-model="emailPassword"
            type="password"
            required
            autocomplete="current-password"
            class="input w-full"
            :class="{ 'input-error': emailForm.fields.value.password }"
          />
          <p v-if="emailForm.fields.value.password" class="label text-error">
            {{ emailForm.fields.value.password }}
          </p>
        </fieldset>
        <div v-if="emailForm.error.value" class="alert alert-error" role="alert">
          {{ emailForm.error.value }}
        </div>
        <div v-if="emailSentTo" class="alert alert-success" role="status">
          {{ $t('account.emailSent', { email: emailSentTo }) }}
        </div>
        <div class="card-actions justify-end">
          <button class="btn btn-primary" :disabled="emailForm.busy.value">
            {{ $t('account.save') }}
          </button>
        </div>
      </div>
    </form>

    <form class="card bg-base-200" @submit.prevent="passwordForm.submit">
      <div class="card-body gap-2">
        <h2 class="card-title">{{ $t('account.changePassword') }}</h2>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="current-password">{{
            $t('account.currentPassword')
          }}</label>
          <input
            id="current-password"
            v-model="currentPassword"
            type="password"
            required
            autocomplete="current-password"
            class="input w-full"
            :class="{ 'input-error': passwordForm.fields.value.currentPassword }"
          />
          <p v-if="passwordForm.fields.value.currentPassword" class="label text-error">
            {{ passwordForm.fields.value.currentPassword }}
          </p>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="new-password">{{ $t('account.newPassword') }}</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            required
            autocomplete="new-password"
            class="input w-full"
            :class="{ 'input-error': passwordForm.fields.value.newPassword }"
          />
          <p v-if="passwordForm.fields.value.newPassword" class="label text-error">
            {{ passwordForm.fields.value.newPassword }}
          </p>
        </fieldset>
        <div v-if="passwordForm.error.value" class="alert alert-error" role="alert">
          {{ passwordForm.error.value }}
        </div>
        <div v-if="passwordDone" class="alert alert-success" role="status">
          {{ $t('account.passwordChanged') }}
        </div>
        <div class="card-actions justify-end">
          <button class="btn btn-primary" :disabled="passwordForm.busy.value">
            {{ $t('account.save') }}
          </button>
        </div>
      </div>
    </form>
  </section>
</template>
