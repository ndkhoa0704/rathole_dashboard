import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import Servers from './views/Servers.vue'
import TunnelForm from './views/TunnelForm.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { guest: true } },
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/servers', name: 'Servers', component: Servers },
  { path: '/tunnels/new', name: 'TunnelNew', component: TunnelForm },
  { path: '/tunnels/:id/edit', name: 'TunnelEdit', component: TunnelForm, props: true },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.meta.guest) {
    // If logged in and trying to access login, redirect to dashboard
    if (token) return next('/');
    return next();
  }
  if (!token) return next('/login');
  next();
})

export default router
