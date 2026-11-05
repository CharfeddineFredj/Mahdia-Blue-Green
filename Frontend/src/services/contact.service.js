import api from './api';

export const contactService = {
  /** Formulaire public /contact (sans token) */
  sendMessage: async (messageData) => {
    return api.post('/contact', messageData, { skipAuth: true });
  },

  getAll: async () => api.get('/contact'),

  createEntry: async (body) => api.post('/contact/entries', body),

  update: async (id, body) => api.put(`/contact/${id}`, body),

  remove: async (id) => api.delete(`/contact/${id}`),

  reply: async (id, message) => api.post(`/contact/${id}/reply`, { message }),
};

export default contactService;
