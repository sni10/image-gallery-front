import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ApiError, fieldErrors } from '@/api'
import { errorMessage } from '@/i18n'

// Form submit state: busy flag, per-field errors (400) and one general message for the rest.
export function useSubmit(fn: () => Promise<unknown>) {
  const { t } = useI18n()
  const busy = ref(false)
  const failure = ref<unknown>(null)
  const fields = computed(() => fieldErrors(failure.value))
  const error = computed(() => {
    const e = failure.value
    if (!e || Object.keys(fields.value).length) return ''
    if (e instanceof ApiError && e.status === 401) return t('auth.invalid')
    return errorMessage(t, e)
  })

  async function submit() {
    if (busy.value) return
    busy.value = true
    failure.value = null
    try {
      await fn()
    } catch (e) {
      failure.value = e
    } finally {
      busy.value = false
    }
  }

  return { busy, fields, error, submit }
}
