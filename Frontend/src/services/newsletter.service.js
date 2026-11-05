import api from './api';

export const newsletterService = {
  subscribe: async (email, source = 'home') =>
    api.post('/newsletter/subscribe', { email, source }, { skipAuth: true }),
  getAll: async () => api.get('/newsletter'),
  update: async (id, body) => api.put(`/newsletter/${id}`, body),
  remove: async (id) => api.delete(`/newsletter/${id}`),
  /** Envoi groupé (admin) — même canal SMTP que les réponses contact */
  broadcast: async ({ subject, message }) => api.post('/newsletter/broadcast', { subject, message }),
};

export default newsletterService;
