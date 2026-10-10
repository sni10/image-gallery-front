<script setup lang="ts">
import { useSsrState } from '@/ssr'

// Age gate with disclaimer over the whole site. The page stays in the HTML underneath (crawlers read it);
// the answer is a cookie, so the server renders the gate only for visitors who haven't agreed yet.
const ok = useSsrState('ageOk', () => false)

function enter() {
  document.cookie = 'age_ok=1; path=/; max-age=31536000; samesite=lax'
  ok.value = true
}
const leave = () => location.assign('https://www.google.com/')
</script>

<template>
  <div
    v-if="!ok"
    class="fixed inset-0 z-[100] grid place-items-center bg-base-100/80 p-4 backdrop-blur-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="age-title"
    aria-describedby="age-text"
  >
    <div class="card max-w-lg bg-base-200 shadow-xl">
      <div class="card-body">
        <h2 id="age-title" class="card-title text-2xl">{{ $t('age.title') }}</h2>
        <p id="age-text">{{ $t('age.text') }}</p>
        <div class="card-actions mt-2 justify-end">
          <button type="button" class="btn btn-ghost" @click="leave">{{ $t('age.leave') }}</button>
          <button type="button" class="btn btn-primary" autofocus @click="enter">
            {{ $t('age.enter') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
