import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasSession } from '@/api'

// One "add to collection" dialog for the whole app (CollectionPicker in App.vue); any photo opens it.
export const pickerPhoto = ref<string | null>(null) // id of the photo being sorted into collections

export function useCollectionPicker() {
  const router = useRouter()
  const route = useRoute()
  // anonymous -> login page, like the heart
  return (photoId: string) =>
    hasSession()
      ? (pickerPhoto.value = photoId)
      : router.push({ name: 'login', query: { next: route.fullPath } })
}
