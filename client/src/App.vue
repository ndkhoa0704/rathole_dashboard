<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from './api.js'

const router = useRouter()
const route = useRoute()
const user = ref(null)

const isLoggedIn = computed(() => !!user.value)
const isLoginPage = computed(() => route.path === '/login')

onMounted(async () => {
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const { user: u } = await api.auth.me()
      user.value = u
    } catch {
      localStorage.removeItem('token')
    }
  }
})

async function logout() {
  await api.auth.logout()
  localStorage.removeItem('token')
  user.value = null
  router.push('/login')
}
</script>

<template>
  <div v-if="isLoginPage">
    <router-view />
  </div>
  <div v-else class="app-layout">
    <nav class="navbar">
      <div class="nav-left">
        <router-link to="/" class="nav-brand">🔌 Rathole Dashboard</router-link>
        <router-link to="/" class="nav-link">Tunnels</router-link>
        <router-link to="/servers" class="nav-link">Servers</router-link>
      </div>
      <div class="nav-right" v-if="user">
        <span class="nav-user">{{ user.display_name || user.username }}</span>
        <button class="btn btn-sm btn-outline" @click="logout">Logout</button>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f1117;
  color: #e4e6eb;
  min-height: 100vh;
}

.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: #1a1d27;
  border-bottom: 1px solid #2d3143;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-brand {
  font-size: 18px;
  font-weight: 700;
  color: #7c8aff;
  text-decoration: none;
}

.nav-link {
  color: #a0a4b8;
  text-decoration: none;
  font-size: 14px;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.15s;
}

.nav-link:hover {
  color: #e4e6eb;
  background: #2d3143;
}

.nav-link.router-link-active {
  color: #7c8aff;
  background: rgba(124, 138, 255, 0.1);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-user {
  font-size: 14px;
  color: #a0a4b8;
}

.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #7c8aff;
  color: #0f1117;
}

.btn-primary:hover:not(:disabled) {
  background: #95a1ff;
}

.btn-success {
  background: #34d399;
  color: #0f1117;
}

.btn-success:hover:not(:disabled) {
  background: #4edda6;
}

.btn-danger {
  background: #f87171;
  color: #0f1117;
}

.btn-danger:hover:not(:disabled) {
  background: #fa8a8a;
}

.btn-outline {
  background: transparent;
  color: #a0a4b8;
  border: 1px solid #2d3143;
}

.btn-outline:hover:not(:disabled) {
  color: #e4e6eb;
  border-color: #a0a4b8;
}

.btn-sm {
  padding: 4px 10px;
  font-size: 13px;
}

.btn-xs {
  padding: 2px 8px;
  font-size: 12px;
}

/* Forms */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #a0a4b8;
  margin-bottom: 6px;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  background: #1a1d27;
  border: 1px solid #2d3143;
  border-radius: 6px;
  color: #e4e6eb;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: #7c8aff;
}

.form-input::placeholder {
  color: #555;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Cards */
.card {
  background: #1a1d27;
  border: 1px solid #2d3143;
  border-radius: 8px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.card-header h2 {
  font-size: 18px;
  font-weight: 600;
}

/* Tables */
.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th {
  text-align: left;
  padding: 10px 12px;
  color: #a0a4b8;
  font-weight: 500;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #2d3143;
}

td {
  padding: 10px 12px;
  border-bottom: 1px solid #1f2230;
}

tr:hover td {
  background: rgba(124, 138, 255, 0.03);
}

/* Status badges */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}

.badge-danger {
  background: rgba(248, 113, 113, 0.15);
  color: #f87171;
}

.badge-warning {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}

.badge-muted {
  background: rgba(160, 164, 184, 0.15);
  color: #a0a4b8;
}

/* Empty state */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #a0a4b8;
}

.empty-state h3 {
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 16px;
}

/* Alerts */
.alert {
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: 16px;
}

.alert-error {
  background: rgba(248, 113, 113, 0.1);
  color: #f87171;
  border: 1px solid rgba(248, 113, 113, 0.3);
}

.alert-success {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

/* Utility */
.mt-16 { margin-top: 16px; }
.mb-16 { margin-bottom: 16px; }
.gap-8 { gap: 8px; }
.flex { display: flex; }
.items-center { align-items: center; }

select.form-input {
  cursor: pointer;
}
</style>
