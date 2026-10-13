import { createRouter as createVueRouter, createMemoryHistory, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { hasSession } from '@/api'

const AuthView = () => import('@/views/AuthView.vue')
const ConfirmView = () => import('@/views/ConfirmView.vue')

export function createRouter() {
  const router = createVueRouter({
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
        path: '/categories/:slug',
        name: 'category',
        component: () => import('@/views/CatalogView.vue'),
        props: true,
      },
      {
        path: '/galleries/:id',
        name: 'gallery',
        component: () => import('@/views/GalleryView.vue'),
        props: true,
      },
      {
        path: '/photos/:id',
        name: 'photo',
        component: () => import('@/views/PhotoView.vue'),
        props: true,
      },
      { path: '/terms', name: 'terms', component: () => import('@/views/TermsView.vue') },
      {
        path: '/complaint',
        name: 'complaint',
        component: () => import('@/views/ComplaintView.vue'),
      },
      // account pages: noindex, data loaded on the client only (the server has no token)
      // guestOnly: a signed-in visitor is sent to the account page instead
      {
        path: '/login',
        name: 'login',
        component: AuthView,
        props: { mode: 'login' },
        meta: { guestOnly: true },
      },
      {
        path: '/register',
        name: 'register',
        component: AuthView,
        props: { mode: 'register' },
        meta: { guestOnly: true },
      },
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
  // The session lives in the browser (refresh token in localStorage), so only the client can check it.
  if (!import.meta.env.SSR)
    router.beforeEach((to) => (to.meta.guestOnly && hasSession() ? { name: 'account' } : true))
  return router
}
