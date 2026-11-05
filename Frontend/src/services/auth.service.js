import api from './api';

const STORAGE_KEY = 'mbg_user';
const TEMP_STORAGE_KEY = 'mbg_temp_user';

export const authService = {
  // Register new user - returns tempToken for questionnaire completion
  register: async (userData) => {
    const response = await api.post('/auth/register', userData, { skipAuth: true });
    if (response.success) {
      // Store temp token for questionnaire completion
      if (response.tempToken) {
        localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(response));
      } else {
        // Store the complete user data with token at root level
        const userDataToStore = {
          token: response.token,
          ...response.data
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userDataToStore));
      }
    }
    return response;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials, { skipAuth: true });
    if (response.success) {
      // Check if questionnaire needs to be completed
      if (response.tempToken) {
        localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(response));
      } else {
        // Store the complete user data with token at root level
        const userData = {
          token: response.token,
          ...response.data
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      }
    }
    return response;
  },

  // Complete questionnaire after registration
  finalizeRegistrationIfNoQuestionnaire: async () => {
    const response = await api.post('/auth/finalize-registration', {}, { useTempToken: true });
    if (response.success) {
      localStorage.removeItem(TEMP_STORAGE_KEY);
      const userData = {
        token: response.token,
        ...response.data
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    }
    return response;
  },

  completeQuestionnaire: async (answers) => {
    const response = await api.post('/auth/complete-questionnaire', { answers }, { useTempToken: true });
    if (response.success) {
      // Clear temp storage and save full user with token at root level
      localStorage.removeItem(TEMP_STORAGE_KEY);
      const userData = {
        token: response.token,
        ...response.data
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    }
    return response;
  },

  // Logout user
  logout: async () => {
    try {
      await api.get('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TEMP_STORAGE_KEY);
  },

  // Get current user from storage
  getCurrentUser: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Get temp user (for questionnaire completion)
  getTempUser: () => {
    const stored = localStorage.getItem(TEMP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  // Check if user needs to complete questionnaire
  needsQuestionnaireCompletion: () => {
    return !!localStorage.getItem(TEMP_STORAGE_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(STORAGE_KEY);
  },

  // Check if user is admin
  isAdmin: () => {
    const user = authService.getCurrentUser();
    const userRole = user?.user?.role || user?.data?.role || user?.role;
    return userRole === 'admin' || userRole === 'superadmin' || userRole === 'analyst' || userRole === 'moderator';
  },

  // Check user role
  hasRole: (role) => {
    const user = authService.getCurrentUser();
    const userRole = user?.user?.role || user?.data?.role || user?.role;
    return userRole === role;
  },

  // Get user profile (current authenticated user)
  getProfile: async () => {
    return api.get('/auth/me');
  },

  // Update user profile
  updateProfile: async (profileData) => {
    return api.put('/users/profile/update', profileData);
  },

  // Forgot password - send 6-digit code
  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email }, { skipAuth: true });
  },

  // Reset password with code
  resetPassword: async (email, code, newPassword) => {
    return api.post('/auth/reset-password', { email, code, newPassword }, { skipAuth: true });
  },

  // Send email verification code
  sendVerificationEmail: async (email) => {
    return api.post('/auth/send-verification', { email }, { skipAuth: true });
  },

  // Verify email with code
  verifyEmail: async (email, code) => {
    return api.post('/auth/verify-email', { email, code }, { skipAuth: true });
  },

  requestReactivation: async (email, password) => {
    return api.post('/auth/request-reactivation', { email, password }, { skipAuth: true });
  },

  requestReactivationOAuth: async (email) => {
    return api.post('/auth/request-reactivation-oauth', { email }, { skipAuth: true });
  },

  changePassword: async (currentPassword, newPassword) => {
    return api.put('/auth/change-password', { currentPassword, newPassword });
  },

  // Ajoute un mot de passe à un compte Google/Microsoft (même compte, connexion e-mail possible ensuite)
  setPassword: async (newPassword) => {
    return api.post('/auth/set-password', { newPassword });
  },
};

export default authService;
