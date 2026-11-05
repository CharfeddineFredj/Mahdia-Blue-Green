import api from './api';

const partnerService = {
  getAll: async () => api.get('/partners'),
  getById: async (id) => api.get(`/partners/${id}`),
  create: async (body) => api.post('/partners', body),
  update: async (id, body) => api.put(`/partners/${id}`, body),
  remove: async (id) => api.delete(`/partners/${id}`),
};

export default partnerService;
