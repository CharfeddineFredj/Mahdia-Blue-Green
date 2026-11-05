import api from './api';

export const teamService = {
  getAll: async () => api.get('/team'),
  create: async (body) => api.post('/team', body),
  update: async (id, body) => api.put(`/team/${id}`, body),
  remove: async (id) => api.delete(`/team/${id}`),
};

export default teamService;
