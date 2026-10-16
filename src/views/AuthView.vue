<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ApiError, login, register, resendConfirmation } from '@/api'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSubmit } from '@/composables/useSubmit'
import TurnstileCaptcha from '@/components/TurnstileCaptcha.vue'

const props = defineProps<{ mode: 'login' | 'register' }>()
const { t } = useI18n()
const route = useRoute()
const title = computed(() => (props.mode === 'login' ? t('auth.login') : t('auth.register')))
usePageMeta(() => ({ title: title.value, noindex: true }))

const email = ref('')
const password = ref('')
const accepted = ref(false)
const sent = ref(false) // confirmation email is on its way
const unconfirmed = ref(false)
// captcha only where an email gets sent: sign-up and "resend"; at most one is on screen at a time
const token = ref('')
const captcha = ref<InstanceType<typeof TurnstileCaptcha>>()
// only local paths: ?next=//evil.com must not redirect off-site
const next = computed(() => {
  const n = route.query.next
  return typeof n === 'string' && /^\/(?!\/)/.test(n) ? n : '/'
})

const { busy, fields, error, submit } = useSubmit(async () => {
  unconfirmed.value = false
  if (props.mode === 'register') {
    try {
      await register(email.value, password.value, token.value)
      sent.value = true
    } finally {
      captcha.value?.reset()
    }
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
  await resendConfirmation(email.value, token.value).catch(() => {}) // always 204
  captcha.value?.reset()
  unconfirmed.value = false
  sent.value = true
}
</script>

<template>
  <section class="card mx-auto my-8 max-w-md bg-base-200 shadow-xl" aria-labelledby="auth-title">
    <div class="card-body gap-4">
      <h1 id="auth-title" class="card-title mb-0 text-2xl">{{ title }}</h1>

      <template v-if="sent">
        <div class="alert alert-success" role="status">{{ $t('auth.sent', { email }) }}</div>
        <TurnstileCaptcha ref="captcha" v-model="token" />
        <button type="button" class="btn btn-outline" :disabled="!token" @click="resend">
          {{ $t('auth.resend') }}
        </button>
      </template>

      <form v-else class="flex flex-col gap-2" @submit.prevent="submit">
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="auth-email">{{ $t('auth.email') }}</label>
          <input
            id="auth-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="input w-full"
            :class="{ 'input-error': fields.email }"
          />
          <p v-if="fields.email" class="label text-error">{{ fields.email }}</p>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="auth-password">{{ $t('auth.password') }}</label>
          <input
            id="auth-password"
            v-model="password"
            type="password"
            required
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            class="input w-full"
            :class="{ 'input-error': fields.password }"
          />
          <p v-if="fields.password" class="label text-error">{{ fields.password }}</p>
          <RouterLink v-if="mode === 'login'" to="/forgot-password" class="label link w-fit">
            {{ $t('reset.forgot') }}
          </RouterLink>
        </fieldset>
        <!-- required: the browser won't submit without it; the backend checks termsAccepted as well -->
        <fieldset v-if="mode === 'register'" class="fieldset">
          <label class="label cursor-pointer items-start gap-3 whitespace-normal text-base-content">
            <input
              v-model="accepted"
              type="checkbox"
              required
              class="checkbox checkbox-sm checkbox-primary mt-0.5"
              :class="{ 'checkbox-error': fields.termsAccepted }"
            />
            <i18n-t keypath="auth.agree" tag="span" scope="global">
              <template #terms>
                <!-- new tab: the filled-in form stays put -->
                <RouterLink to="/terms" target="_blank" class="link link-primary">
                  {{ $t('auth.termsLink') }}
                </RouterLink>
              </template>
            </i18n-t>
          </label>
          <p v-if="fields.termsAccepted" class="label text-error">{{ fields.termsAccepted }}</p>
          <!-- GDPR Art. 13: tell how the data is used where it is collected -->
          <i18n-t keypath="auth.privacyNote" tag="p" scope="global" class="label whitespace-normal">
            <template #privacy>
              <RouterLink to="/privacy" target="_blank" class="link">
                {{ $t('auth.privacyLink') }}
              </RouterLink>
            </template>
          </i18n-t>
        </fieldset>
        <TurnstileCaptcha
          v-if="mode === 'register'"
          ref="captcha"
          v-model="token"
          :error="fields.captcha"
        />
        <div v-if="error" class="alert alert-error" role="alert">{{ error }}</div>
        <template v-if="unconfirmed">
          <div class="alert alert-warning" role="alert">
            <span>{{ $t('auth.unconfirmed') }}</span>
            <button type="button" class="btn btn-sm" :disabled="!token" @click="resend">
              {{ $t('auth.resend') }}
            </button>
          </div>
          <TurnstileCaptcha ref="captcha" v-model="token" />
        </template>
        <button class="btn btn-primary mt-2" :disabled="busy || (mode === 'register' && !token)">
          <span v-if="busy" class="loading loading-spinner loading-sm" />
          {{ title }}
        </button>
      </form>

      <p class="text-center text-sm">
        <RouterLink
          v-if="mode === 'login'"
          :to="{ name: 'register', query: route.query }"
          class="link link-primary"
        >
          {{ $t('auth.noAccount') }}
        </RouterLink>
        <RouterLink v-else :to="{ name: 'login', query: route.query }" class="link link-primary">
          {{ $t('auth.haveAccount') }}
        </RouterLink>
      </p>
    </div>
  </section>
</template>
