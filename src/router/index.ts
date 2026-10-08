import { createRouter as createVueRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

export function createRouter() {
  return createVueRouter({
    history: import.meta.env.SSR
      ? createMemoryHistory()
      : createWebHistory(import.meta.env.BASE_URL),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      {
        path: '/galleries',
        name: 'catalog',
        component: () => import('@/views/CatalogView.vue'),
      },
      {
        path: '/galleries/:id',
        name: 'gallery',
        component: () => import('@/views/GalleryView.vue'),
        props: true,
      },
      // server answers 404 for this route (entry-server.ts)
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: () => import('@/views/NotFoundView.vue'),
      },
    ],
  })
}
