import api from './api';

/** Questionnaires d'événements (Panier Pro) — distincts des questionnaires administrateurs. */
export const eventQuestionnaireService = {
  // Créateur : état des questionnaires de tous ses événements
  getMine: async () => api.get('/event-questionnaires/mine'),

  // Participant : questionnaires approuvés des événements auxquels il est inscrit
  getParticipating: async () => api.get('/event-questionnaires/participating'),

  // Vue adaptée au rôle (créateur / admin / participant inscrit)
  getForEvent: async (eventId) => api.get(`/event-questionnaires/event/${eventId}`),

  create: async (eventId, data) => api.post(`/event-questionnaires/event/${eventId}`, data),

  update: async (eventId, data) => api.put(`/event-questionnaires/event/${eventId}`, data),

  submitResponse: async (eventId, answers) =>
    api.post(`/event-questionnaires/event/${eventId}/responses`, { answers }),

  // Participant : sa propre réponse uniquement
  getMyResponse: async (eventId) => api.get(`/event-questionnaires/event/${eventId}/my-response`),

  // Créateur de l'événement ou administrateur autorisé uniquement
  getResponses: async (eventId) => api.get(`/event-questionnaires/event/${eventId}/responses`),

  // === Validation administrative ===
  adminList: async (status) =>
    api.get(`/event-questionnaires/admin/list${status ? `?status=${encodeURIComponent(status)}` : ''}`),

  adminApprove: async (id) => api.put(`/event-questionnaires/admin/${id}/approve`, {}),

  adminReject: async (id, reason) => api.put(`/event-questionnaires/admin/${id}/reject`, { reason }),
};

export default eventQuestionnaireService;
