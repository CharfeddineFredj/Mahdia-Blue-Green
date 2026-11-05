import api from './api';

const entrepreneurService = {
  getAll: async () => api.get('/entrepreneurs'),
  getById: async (id) => api.get(`/entrepreneurs/${id}`),
  create: async (body) => api.post('/entrepreneurs', body),
  update: async (id, body) => api.put(`/entrepreneurs/${id}`, body),
  remove: async (id) => api.delete(`/entrepreneurs/${id}`),
};

export default entrepreneurService;
