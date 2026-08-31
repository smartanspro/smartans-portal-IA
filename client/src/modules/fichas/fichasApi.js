import { api } from '../../api/http.js';

export const fichasApi = {
  list: () => api.get('/api/fichas').then((r) => r.fichas),
  get: (id) => api.get(`/api/fichas/${id}`),
  create: (payload) => api.post('/api/fichas', payload),
  update: (id, payload) => api.put(`/api/fichas/${id}`, payload),
  remove: (id) => api.delete(`/api/fichas/${id}`),
};
