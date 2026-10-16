<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { requestPasswordReset, resetPassword } from '@/api'
import TurnstileCaptcha from '@/components/TurnstileCaptcha.vue'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSubmit } from '@/composables/useSubmit'

// /forgot-password: ask for the email. /reset-password?token=… (link from that email): set a new password
const { t } = useI18n()
const route = useRoute()
usePageMeta(() => ({ title: t('reset.title'), noindex: true }))

const token = typeof route.query.token === 'string' ? route.query.token : ''
const email = ref('')
const password = ref('')
const sent = ref(false)
const captchaToken = ref('') // only the email step sends mail, so only it has a captcha
const captcha = ref<InstanceType<typeof TurnstileCaptcha>>()

const { busy, fields, error, submit } = useSubmit(async () => {
  if (!token) {
    try {
      await requestPasswordReset(email.value, captchaToken.value)
      sent.value = true
    } finally {
      captcha.value?.reset()
    }
    return
  }
  await resetPassword(token, password.value)
  location.assign('/account') // full load, like after sign-in: lists re-fetch with the session
})
</script>

<template>
  <section class="card mx-auto my-8 max-w-md bg-base-200 shadow-xl" aria-labelledby="reset-title">
    <div class="card-body gap-4">
      <h1 id="reset-title" class="card-title mb-0 text-2xl">{{ $t('reset.title') }}</h1>

      <div v-if="sent" class="alert alert-success" role="status">
        {{ $t('reset.sent', { email }) }}
      </div>

      <form v-else class="flex flex-col gap-2" @submit.prevent="submit">
        <fieldset v-if="!token" class="fieldset">
          <label class="fieldset-legend" for="reset-email">{{ $t('auth.email') }}</label>
          <input
            id="reset-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="input w-full"
            :class="{ 'input-error': fields.email }"
          />
          <p v-if="fields.email" class="label text-error">{{ fields.email }}</p>
          <p class="label whitespace-normal">{{ $t('reset.hint') }}</p>
        </fieldset>
        <fieldset v-else class="fieldset">
          <label class="fieldset-legend" for="reset-password">{{
            $t('account.newPassword')
          }}</label>
          <input
            id="reset-password"
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            class="input w-full"
            :class="{ 'input-error': fields.password }"
          />
          <p v-if="fields.password" class="label text-error">{{ fields.password }}</p>
        </fieldset>
        <!-- a dead link: offer a fresh one -->
        <div v-if="fields.token" class="alert alert-error" role="alert">
          <span>{{ $t('confirm.invalid') }}</span>
          <RouterLink to="/forgot-password" class="btn btn-sm">{{ $t('reset.again') }}</RouterLink>
        </div>
        <TurnstileCaptcha
          v-if="!token"
          ref="captcha"
          v-model="captchaToken"
          :error="fields.captcha"
        />
        <div v-if="error" class="alert alert-error" role="alert">{{ error }}</div>
        <button class="btn btn-primary mt-2" :disabled="busy || (!token && !captchaToken)">
          <span v-if="busy" class="loading loading-spinner loading-sm" />
          {{ $t(token ? 'account.save' : 'reset.send') }}
        </button>
      </form>

      <p class="text-center text-sm">
        <RouterLink to="/login" class="link link-primary">{{ $t('auth.haveAccount') }}</RouterLink>
      </p>
    </div>
  </section>
</template>
