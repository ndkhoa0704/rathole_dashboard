const BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export default {
  auth: {
    login(username, password) {
      return request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
    },
    me() {
      return request('/auth/me');
    },
    logout() {
      return request('/auth/logout', { method: 'POST' });
    },
  },
  servers: {
    list()       { return request('/servers'); },
    get(id)      { return request(`/servers/${id}`); },
    create(data) { return request('/servers', { method: 'POST', body: JSON.stringify(data) }); },
    update(id, data) { return request(`/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(id)   { return request(`/servers/${id}`, { method: 'DELETE' }); },
  },
  tunnels: {
    list()       { return request('/tunnels'); },
    get(id)      { return request(`/tunnels/${id}`); },
    create(data) { return request('/tunnels', { method: 'POST', body: JSON.stringify(data) }); },
    update(id, data) { return request(`/tunnels/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(id)   { return request(`/tunnels/${id}`, { method: 'DELETE' }); },
    start(id)    { return request(`/tunnels/${id}/start`, { method: 'POST' }); },
    stop(id)     { return request(`/tunnels/${id}/stop`, { method: 'POST' }); },
  },
};
