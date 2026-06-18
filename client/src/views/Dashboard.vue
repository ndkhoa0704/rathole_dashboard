<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api.js'

const router = useRouter()
const tunnels = ref([])
const loading = ref(true)
const error = ref('')

async function loadTunnels() {
  loading.value = true
  error.value = ''
  try {
    const { tunnels: t } = await api.tunnels.list()
    tunnels.value = t
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function startTunnel(id) {
  try {
    await api.tunnels.start(id)
    await loadTunnels()
  } catch (e) {
    error.value = e.message
  }
}

async function stopTunnel(id) {
  try {
    await api.tunnels.stop(id)
    await loadTunnels()
  } catch (e) {
    error.value = e.message
  }
}

async function deleteTunnel(id) {
  if (!confirm('Delete this tunnel?')) return
  try {
    await api.tunnels.delete(id)
    await loadTunnels()
  } catch (e) {
    error.value = e.message
  }
}

function statusBadge(status) {
  const map = {
    running: 'badge-success',
    stopped: 'badge-muted',
    error: 'badge-danger',
  }
  return map[status] || 'badge-muted'
}

onMounted(loadTunnels)
</script>

<template>
  <div>
    <div class="card-header">
      <h2>Tunnels</h2>
      <button class="btn btn-primary" @click="router.push('/tunnels/new')">+ New Tunnel</button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="loading" class="empty-state"><p>Loading...</p></div>

    <div v-else-if="tunnels.length === 0" class="card empty-state">
      <h3>No tunnels yet</h3>
      <p>Create your first tunnel to connect two servers via rathole.</p>
      <button class="btn btn-primary" @click="router.push('/tunnels/new')">+ New Tunnel</button>
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Client</th>
              <th>Server</th>
              <th>Local Port</th>
              <th>Remote Port</th>
              <th>Protocol</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tunnels" :key="t.id">
              <td><strong>{{ t.name }}</strong></td>
              <td>{{ t.client_server_name }}</td>
              <td>{{ t.server_server_name }}</td>
              <td><code>{{ t.local_port }}</code></td>
              <td><code>{{ t.remote_port }}</code></td>
              <td>{{ t.protocol || 'tcp' }}</td>
              <td><span :class="['badge', statusBadge(t.status)]">{{ t.status }}</span></td>
              <td>
                <div class="flex gap-8">
                  <template v-if="t.status === 'stopped' || t.status === 'error'">
                    <button class="btn btn-sm btn-success" @click="startTunnel(t.id)">Start</button>
                  </template>
                  <template v-else-if="t.status === 'running'">
                    <button class="btn btn-sm btn-warning" @click="stopTunnel(t.id)">Stop</button>
                  </template>
                  <button class="btn btn-sm btn-outline" @click="router.push(`/tunnels/${t.id}/edit`)">Edit</button>
                  <button class="btn btn-sm btn-danger" @click="deleteTunnel(t.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-warning {
  background: #fbbf24;
  color: #0f1117;
}
.btn-warning:hover:not(:disabled) {
  background: #fcc644;
}
code {
  background: #2d3143;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: #7c8aff;
}
</style>
