import api from './api';

export const adminService = {
  // Get admin dashboard data
  getDashboard: async () => {
    return api.get('/admin/dashboard');
  },

  /** Statistiques agrégées (tableau analyste) — query: days (7–365, défaut 30) */
  getAnalytics: async (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return api.get(`/admin/analytics${query ? `?${query}` : ''}`);
  },

  // === User Management (Superadmin only) ===
  
  // Get all users (supports page, limit, role, isActive, staffOnly)
  getAllUsers: async (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return api.get(`/admin/users${query ? `?${query}` : ''}`);
  },

  // Get single user by ID
  getUserById: async (id) => {
    return api.get(`/admin/users/${id}`);
  },

  // Update user role
  updateUserRole: async (id, role) => {
    return api.put(`/admin/users/${id}/role`, { role });
  },

  // Update user active status
  updateUserStatus: async (id, isActive) => {
    return api.put(`/admin/users/${id}/status`, { isActive });
  },

  // Delete user
  deleteUser: async (id) => {
    return api.delete(`/admin/users/${id}`);
  },

  getReactivationRequests: async () => {
    return api.get('/admin/reactivation-requests');
  },

  approveReactivationRequest: async (id) => {
    return api.put(`/admin/reactivation-requests/${id}/approve`, {});
  },

  rejectReactivationRequest: async (id) => {
    return api.put(`/admin/reactivation-requests/${id}/reject`, {});
  },

  // === Content Moderation (Moderator) ===
  
  // Get all posts (including drafts)
  getAllPosts: async (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return api.get(`/admin/posts${query ? `?${query}` : ''}`);
  },

  // Approve or reject post
  approvePost: async (id, approved) => {
    return api.put(`/admin/posts/${id}/approve`, { approved });
  },

  // Reject a submitted post with an optional reason shown to the author
  rejectPost: async (id, reason) => {
    return api.put(`/admin/posts/${id}/reject`, { reason });
  },

  // Pending modification of a published event (live version kept until decision)
  approveEventRevision: async (id) => {
    return api.put(`/admin/posts/${id}/revision/approve`, {});
  },

  rejectEventRevision: async (id, reason) => {
    return api.put(`/admin/posts/${id}/revision/reject`, { reason });
  },

  // Delete any post
  deletePost: async (id) => {
    return api.delete(`/admin/posts/${id}`);
  },

  // === Questionnaire Analysis (Analyst) ===
  
  // Get all questionnaire responses
  getAllResponses: async () => {
    return api.get('/admin/responses');
  },

  // === Questionnaire Management (Superadmin/Analyst) ===

  getQuestionnaires: async () => {
    return api.get('/questionnaires');
  },

  getQuestionnairesAdminList: async () => {
    return api.get('/questionnaires/admin/list');
  },

  getQuestionnaireAdminDetail: async (id) => {
    return api.get(`/questionnaires/admin/${id}`);
  },

  /** Statistiques par question + liste paginée des réponses (analyste) */
  getQuestionnaireStatistics: async (id, params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''))
    ).toString();
    return api.get(`/questionnaires/admin/${id}/statistics${query ? `?${query}` : ''}`);
  },

  getRegistrationQuestionnaire: async () => {
    return api.get('/questionnaires/registration');
  },

  createQuestionnaire: async (data) => {
    return api.post('/questionnaires', data);
  },

  updateQuestionnaire: async (id, data) => {
    return api.put(`/questionnaires/${id}`, data);
  },

  deleteQuestionnaire: async (id) => {
    return api.delete(`/questionnaires/${id}`);
  },

  syncQuestionnaireQuestions: async (id, questions) => {
    return api.put(`/questionnaires/${id}/questions`, { questions });
  },

  restoreRegistrationQuestionDefaults: async (id) => {
    return api.post(`/questionnaires/${id}/questions/restore-defaults`, {});
  },
};

export default adminService;
