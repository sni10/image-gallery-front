import { createRouter as createVueRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const AuthView = () => import('@/views/AuthView.vue')
const ConfirmView = () => import('@/views/ConfirmView.vue')

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
      // account pages: noindex, data loaded on the client only (the server has no token)
      { path: '/login', name: 'login', component: AuthView, props: { mode: 'login' } },
      { path: '/register', name: 'register', component: AuthView, props: { mode: 'register' } },
      { path: '/confirm-email', component: ConfirmView },
      { path: '/confirm-email-change', component: ConfirmView, props: { change: true } },
      { path: '/account', name: 'account', component: () => import('@/views/AccountView.vue') },
      {
        path: '/account/favorites',
        name: 'favorites',
        component: () => import('@/views/FavoritesView.vue'),
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
