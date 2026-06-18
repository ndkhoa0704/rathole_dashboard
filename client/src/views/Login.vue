<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api.js'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = 'Username and password are required'
    return
  }
  loading.value = true
  try {
    const { token } = await api.auth.login(username.value, password.value)
    localStorage.setItem('token', token)
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1 class="login-title">🔌 Rathole Dashboard</h1>
      <p class="login-subtitle">Sign in to manage your tunnels</p>

      <div v-if="error" class="alert alert-error">{{ error }}</div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Username</label>
          <input
            v-model="username"
            type="text"
            class="form-input"
            placeholder="Enter username"
            autocomplete="username"
            autofocus
          />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input
            v-model="password"
            type="password"
            class="form-input"
            placeholder="Enter password"
            autocomplete="current-password"
          />
        </div>
        <button type="submit" class="btn btn-primary login-btn" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f1117;
  padding: 24px;
}

.login-card {
  background: #1a1d27;
  border: 1px solid #2d3143;
  border-radius: 12px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
  color: #e4e6eb;
  text-align: center;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #a0a4b8;
  text-align: center;
  margin-bottom: 32px;
}

.login-btn {
  width: 100%;
  padding: 10px;
  font-size: 15px;
  margin-top: 8px;
}
</style>
