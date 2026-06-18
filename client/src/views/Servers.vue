<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const servers = ref([])
const loading = ref(true)
const error = ref('')
const showForm = ref(false)
const editingId = ref(null)

const form = ref({
  name: '',
  host: '',
  port: 22,
  username: 'root',
  password: '',
  private_key_path: '',
  description: '',
})

function resetForm() {
  form.value = { name: '', host: '', port: 22, username: 'root', password: '', private_key_path: '', description: '' }
  editingId.value = null
}

async function loadServers() {
  loading.value = true
  error.value = ''
  try {
    const { servers: s } = await api.servers.list()
    servers.value = s
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function editServer(s) {
  form.value = { ...s }
  editingId.value = s.id
  showForm.value = true
}

async function saveServer() {
  error.value = ''
  try {
    if (editingId.value) {
      await api.servers.update(editingId.value, form.value)
    } else {
      await api.servers.create(form.value)
    }
    showForm.value = false
    resetForm()
    await loadServers()
  } catch (e) {
    error.value = e.message
  }
}

async function deleteServer(id) {
  if (!confirm('Delete this server? This will also delete associated tunnels.')) return
  try {
    await api.servers.delete(id)
    await loadServers()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(loadServers)
</script>

<template>
  <div>
    <div class="card-header">
      <h2>Servers</h2>
      <button class="btn btn-primary" @click="resetForm(); showForm = true">+ Add Server</button>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Add/Edit Form -->
    <div v-if="showForm" class="card mb-16">
      <h3 style="margin-bottom: 16px;">{{ editingId ? 'Edit Server' : 'Add Server' }}</h3>
      <form @submit.prevent="saveServer">
        <div class="form-row">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="form.name" class="form-input" placeholder="My Server" required />
          </div>
          <div class="form-group">
            <label>Host *</label>
            <input v-model="form.host" class="form-input" placeholder="192.168.1.10 or example.com" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>SSH Port</label>
            <input v-model.number="form.port" type="number" class="form-input" placeholder="22" />
          </div>
          <div class="form-group">
            <label>SSH Username</label>
            <input v-model="form.username" class="form-input" placeholder="root" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Password</label>
            <input v-model="form.password" type="password" class="form-input" placeholder="Leave empty to use key" />
            <small style="color: #a0a4b8; font-size: 12px;">Use password auth instead of SSH key</small>
          </div>
          <div class="form-group">
            <label>Private Key Path</label>
            <input v-model="form.private_key_path" class="form-input" placeholder="~/.ssh/id_rsa" />
            <small style="color: #a0a4b8; font-size: 12px;">Ignored if password is set</small>
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" class="form-input" placeholder="Optional description" />
        </div>
        <div class="flex gap-8">
          <button type="submit" class="btn btn-primary">{{ editingId ? 'Update' : 'Add' }}</button>
          <button type="button" class="btn btn-outline" @click="showForm = false">Cancel</button>
        </div>
      </form>
    </div>

    <div v-if="loading" class="empty-state"><p>Loading...</p></div>

    <div v-else-if="servers.length === 0" class="card empty-state">
      <h3>No servers added</h3>
      <p>Add servers to create tunnels between them.</p>
      <button class="btn btn-primary" @click="resetForm(); showForm = true">+ Add Server</button>
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Host</th>
              <th>SSH Port</th>
              <th>Username</th>
              <th>Description</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in servers" :key="s.id">
              <td><strong>{{ s.name }}</strong></td>
              <td><code>{{ s.host }}</code></td>
              <td>{{ s.port }}</td>
              <td>{{ s.username }}</td>
              <td>{{ s.description || '-' }}</td>
              <td>
                <div class="flex gap-8">
                  <button class="btn btn-sm btn-outline" @click="editServer(s)">Edit</button>
                  <button class="btn btn-sm btn-danger" @click="deleteServer(s.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
