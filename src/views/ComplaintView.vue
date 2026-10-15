<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { sendComplaint } from '@/api'
import { usePageMeta } from '@/composables/usePageMeta'
import { useSubmit } from '@/composables/useSubmit'

// Complaint about content: the backend emails it to the admin; the address never reaches the browser.
const { t } = useI18n()
usePageMeta(() => ({ title: t('complaint.title'), noindex: true }))

const email = ref('')
const photoUrl = ref('')
const message = ref('')
const sent = ref(false)

// Cloudflare Turnstile against spam bots; the backend checks the token (SPEC-complaint-captcha.md in the
// backend repo). No key in the build -> Cloudflare's always-pass test key (local dev).
const SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY || '1x00000000000000000000AA'
const captchaEl = ref<HTMLElement>()
const token = ref('')
let widget: string | undefined

function renderCaptcha() {
  if (!captchaEl.value || !window.turnstile) return
  widget = window.turnstile.render(captchaEl.value, {
    sitekey: SITEKEY,
    callback: (t) => (token.value = t),
    'expired-callback': () => (token.value = ''),
  })
}

onMounted(() => {
  if (window.turnstile) return renderCaptcha()
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.onload = renderCaptcha
  document.head.append(s)
})
onBeforeUnmount(() => {
  if (widget) window.turnstile?.remove(widget)
})

const { busy, fields, error, submit } = useSubmit(async () => {
  try {
    await sendComplaint(email.value, photoUrl.value, message.value, token.value)
    sent.value = true
  } finally {
    // a token works once: after an error the user needs a new one
    if (!sent.value && widget) {
      token.value = ''
      window.turnstile?.reset(widget)
    }
  }
})
</script>

<template>
  <section
    class="card mx-auto my-8 max-w-xl bg-base-200 shadow-xl"
    aria-labelledby="complaint-title"
  >
    <div class="card-body gap-4">
      <h1 id="complaint-title" class="card-title mb-0 text-2xl">{{ $t('complaint.title') }}</h1>

      <div v-if="sent" class="alert alert-success" role="status">
        {{ $t('complaint.sent') }}
      </div>

      <form v-else class="flex flex-col gap-2" @submit.prevent="submit">
        <p class="text-sm text-base-content/70">{{ $t('complaint.intro') }}</p>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="complaint-email">{{ $t('complaint.email') }}</label>
          <input
            id="complaint-email"
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
          <label class="fieldset-legend" for="complaint-photo">{{
            $t('complaint.photoUrl')
          }}</label>
          <input
            id="complaint-photo"
            v-model="photoUrl"
            type="url"
            maxlength="500"
            placeholder="https://artai.win/photos/…"
            class="input w-full"
            :class="{ 'input-error': fields.photoUrl }"
          />
          <p v-if="fields.photoUrl" class="label text-error">{{ fields.photoUrl }}</p>
        </fieldset>
        <fieldset class="fieldset">
          <label class="fieldset-legend" for="complaint-message">{{
            $t('complaint.message')
          }}</label>
          <textarea
            id="complaint-message"
            v-model="message"
            required
            minlength="10"
            maxlength="5000"
            rows="6"
            class="textarea w-full"
            :class="{ 'textarea-error': fields.message }"
          />
          <p v-if="fields.message" class="label text-error">{{ fields.message }}</p>
        </fieldset>
        <div ref="captchaEl" class="min-h-16" />
        <p v-if="fields.captcha" class="label text-error">{{ fields.captcha }}</p>
        <div v-if="error" class="alert alert-error" role="alert">{{ error }}</div>
        <button class="btn btn-primary mt-2" :disabled="busy || !token">
          <span v-if="busy" class="loading loading-spinner loading-sm" />
          {{ $t('complaint.send') }}
        </button>
      </form>
    </div>
  </section>
</template>
