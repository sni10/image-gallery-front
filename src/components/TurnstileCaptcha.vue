<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Cloudflare Turnstile for forms that make the backend send an email; the backend checks the token
// (SPEC-complaint-captcha.md in the backend repo). v-model = token, '' until solved.
// No key in the build -> Cloudflare's always-pass test key (local dev).
const SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY || '1x00000000000000000000AA'
const token = defineModel<string>({ default: '' })
defineProps<{ error?: string }>()
const el = ref<HTMLElement>()
let widget: string | undefined

function render() {
  if (!el.value || !window.turnstile) return
  widget = window.turnstile.render(el.value, {
    sitekey: SITEKEY,
    callback: (t) => (token.value = t),
    'expired-callback': () => (token.value = ''),
  })
}

onMounted(() => {
  token.value = ''
  if (window.turnstile) return render()
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.onload = render
  document.head.append(s)
})
onBeforeUnmount(() => {
  if (widget) window.turnstile?.remove(widget)
})

// a token works once: call after every request that used it
defineExpose({
  reset() {
    token.value = ''
    if (widget) window.turnstile?.reset(widget)
  },
})
</script>

<template>
  <div ref="el" class="min-h-16" />
  <p v-if="error" class="label text-error">{{ error }}</p>
</template>
