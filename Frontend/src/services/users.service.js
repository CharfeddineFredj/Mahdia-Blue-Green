import api from './api';

export const usersService = {
  // Get user by ID (requires auth)
  getById: async (id) => {
    return api.get(`/users/${id}`);
  },

  // Update user by ID (requires auth)
  update: async (id, userData) => {
    return api.put(`/users/${id}`, userData);
  },

  // Update current user's profile (requires auth)
  updateProfile: async (profileData) => {
    return api.put('/users/profile/update', profileData);
  },

  // Delete current user's profile (requires auth)
  deleteProfile: async () => {
    return api.delete('/users/profile');
  },

  // === Admin Only Routes ===
  
  // Get all users (admin only)
  getAll: async () => {
    return api.get('/users');
  },

  // Delete user (admin only)
  delete: async (id) => {
    return api.delete(`/users/${id}`);
  },
};

export default usersService;
