import api from './api';

export const resourcesService = {
  getAll: async () => api.get('/resources'),
  getById: async (id) => api.get(`/resources/${id}`),
  create: async (payload) => api.post('/resources', payload),
  update: async (id, payload) => api.put(`/resources/${id}`, payload),
  delete: async (id) => api.delete(`/resources/${id}`),
  // Public : compte un téléchargement / une ouverture et renvoie le nouveau total
  recordClick: async (id) => api.post(`/resources/${id}/click`, {}, { skipAuth: true }),
};

export default resourcesService;
