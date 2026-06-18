<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api.js'

const router = useRouter()
const route = useRoute()

const servers = ref([])
const error = ref('')
const loading = ref(false)
const pageTitle = ref('New Tunnel')

const form = ref({
  name: '',
  client_server_id: '',
  server_server_id: '',
  local_port: '',
  remote_port: '',
  protocol: 'tcp',
})

onMounted(async () => {
  try {
    const { servers: s } = await api.servers.list()
    servers.value = s

    // If editing, load tunnel data
    if (route.params.id) {
      pageTitle.value = 'Edit Tunnel'
      const { tunnel } = await api.tunnels.get(route.params.id)
      form.value = {
        name: tunnel.name,
        client_server_id: tunnel.client_server_id,
        server_server_id: tunnel.server_server_id,
        local_port: tunnel.local_port,
        remote_port: tunnel.remote_port,
        protocol: tunnel.protocol || 'tcp',
      }
    }
  } catch (e) {
    error.value = e.message
  }
})

async function save() {
  error.value = ''
  loading.value = true
  try {
    if (route.params.id) {
      await api.tunnels.update(route.params.id, form.value)
    } else {
      await api.tunnels.create(form.value)
    }
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <div class="card-header">
      <h2>{{ pageTitle }}</h2>
      <button class="btn btn-outline" @click="router.push('/')">Back</button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="servers.length < 2" class="card empty-state">
      <h3>Need at least 2 servers</h3>
      <p>Add servers first before creating a tunnel.</p>
      <button class="btn btn-primary" @click="router.push('/servers')">Go to Servers</button>
    </div>

    <form v-else class="card" @submit.prevent="save">
      <div class="form-group">
        <label>Tunnel Name *</label>
        <input v-model="form.name" class="form-input" placeholder="e.g. web-proxy" required />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Client Server *</label>
          <select v-model.number="form.client_server_id" class="form-input" required>
            <option value="" disabled>Select client server...</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.host }})
            </option>
          </select>
          <small style="color: #a0a4b8; font-size: 12px;">
            This server runs rathole as <strong>client</strong> — it initiates the connection.
          </small>
        </div>
        <div class="form-group">
          <label>Server (Rathole Server) *</label>
          <select v-model.number="form.server_server_id" class="form-input" required>
            <option value="" disabled>Select rathole server...</option>
            <option v-for="s in servers" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.host }})
            </option>
          </select>
          <small style="color: #a0a4b8; font-size: 12px;">
            This server runs rathole as <strong>server</strong> — it listens for connections.
          </small>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Local Port *</label>
          <input v-model.number="form.local_port" type="number" class="form-input" placeholder="8080" required />
          <small style="color: #a0a4b8; font-size: 12px;">Port on the client server to forward</small>
        </div>
        <div class="form-group">
          <label>Remote Port *</label>
          <input v-model.number="form.remote_port" type="number" class="form-input" placeholder="8080" required />
          <small style="color: #a0a4b8; font-size: 12px;">Port on the rathole server to expose</small>
        </div>
      </div>

      <div class="form-group">
        <label>Protocol</label>
        <select v-model="form.protocol" class="form-input">
          <option value="tcp">TCP</option>
          <option value="udp">UDP</option>
        </select>
      </div>

      <div class="flex gap-8 mt-16">
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Saving...' : 'Save Tunnel' }}
        </button>
        <button type="button" class="btn btn-outline" @click="router.push('/')">Cancel</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
small {
  display: block;
  margin-top: 4px;
}
</style>
