import api from './api';

export const questionnaireService = {
  // Get all active questionnaires (option skipAuth pour l’écran d’inscription / visiteur)
  getAll: async (options = {}) => {
    return api.get('/questionnaires', options);
  },

  /** Liste publique sans envoyer de jeton (évite un token temporaire inadapté). */
  getAllPublic: async () => {
    return api.get('/questionnaires', { skipAuth: true });
  },

  /** Connecté : enquêtes ouvertes sans réponse (notifications). */
  getPending: async () => {
    return api.get('/questionnaires/user/pending');
  },

  // Get registration questionnaire (for new users)
  getRegistrationQuestionnaire: async () => {
    return api.get('/questionnaires/registration');
  },

  // Get single questionnaire by ID
  getById: async (id) => {
    return api.get(`/questionnaires/${id}`);
  },

  // Submit response to a questionnaire (requires auth)
  submitResponse: async (questionnaireId, answers) => {
    return api.post(`/questionnaires/${questionnaireId}/submit`, { answers });
  },

  // Get current user's questionnaire responses (requires auth)
  getMyResponses: async () => {
    return api.get('/questionnaires/user/responses');
  },

  // === Analyst Routes (requires analyst or superadmin role) ===
  
  // Create new questionnaire
  create: async (questionnaireData) => {
    return api.post('/questionnaires', questionnaireData);
  },

  // Update questionnaire
  update: async (id, questionnaireData) => {
    return api.put(`/questionnaires/${id}`, questionnaireData);
  },

  // Delete questionnaire
  delete: async (id) => {
    return api.delete(`/questionnaires/${id}`);
  },
};

export default questionnaireService;
