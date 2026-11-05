// API base: explicit VITE_API_URL at build time, or same-origin /api (Vite proxy in dev, reverse proxy in prod)
export const getApiBaseUrl = () => {
  const env = import.meta.env.VITE_API_URL;
  if (typeof env === 'string' && env.trim() !== '') {
    return env.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost:5000/api';
};

// Get auth token from localStorage
const getToken = () => {
  const user = localStorage.getItem('mbg_user');
  if (user) {
    try {
      const parsed = JSON.parse(user);
      console.log('Getting token from localStorage:', parsed);
      // Token could be at different paths depending on response structure
      const token = parsed.token || parsed.data?.token;
      console.log('Extracted token:', token ? 'Token found' : 'No token found');
      return token;
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  }
  console.log('No user data in localStorage');
  return null;
};

// Get temp token for questionnaire completion
const getTempToken = () => {
  const tempData = localStorage.getItem('mbg_temp_user');
  if (tempData) {
    const parsed = JSON.parse(tempData);
    return parsed.tempToken;
  }
  return null;
};

const SESSION_END_CODES = new Set(['ACCOUNT_DEACTIVATED', 'USER_NOT_FOUND']);

function clearSessionAndRedirectIfNeeded(endpoint, status, data, hadAuthToken) {
  if (typeof window === 'undefined' || !hadAuthToken || status !== 401) return;

  const code = data.code;
  const msg = (data.message || '').toString();
  const shouldEndSession =
    SESSION_END_CODES.has(code) ||
    msg === 'User not found' ||
    msg === 'User account is deactivated';

  if (!shouldEndSession) return;

  const isAuthLogin = endpoint.startsWith('/auth/login');
  if (isAuthLogin) return;

  localStorage.removeItem('mbg_user');
  localStorage.removeItem('mbg_temp_user');
  const qs = code === 'USER_NOT_FOUND' ? '?reason=account_removed' : '?reason=account_deactivated';
  window.location.replace(`/auth${qs}`);
}

// Base fetch wrapper with error handling
const request = async (endpoint, options = {}) => {
  const skipAuth = options.skipAuth === true;
  const token = skipAuth
    ? null
    : options.useTempToken
      ? getTempToken()
      : getToken();
  const hadAuthToken = !!token;

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  // Remove custom properties not meant for fetch
  delete config.useTempToken;
  delete config.skipAuth;

  try {
    const response = await fetch(`${getApiBaseUrl()}${endpoint}`, config);
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      clearSessionAndRedirectIfNeeded(endpoint, response.status, data, hadAuthToken);

      const err = new Error(data.message || data.error || 'An error occurred');
      err.status = response.status;
      err.code = data.code;
      err.requiresEmailVerification = data.requiresEmailVerification || false;
      err.requiresQuestionnaire = data.requiresQuestionnaire === true;
      err.email = data.email;
      err.canRequestReactivation = data.canRequestReactivation;
      throw err;
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Upload file (FormData) — skips JSON Content-Type so the browser sets multipart boundary
const uploadFile = async (endpoint, formData) => {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: 'POST',
    headers: { ...(token && { Authorization: `Bearer ${token}` }) },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
};

// API methods
export const api = {
  get: (endpoint, options = {}) => request(endpoint, { method: 'GET', ...options }),
  
  post: (endpoint, body, options = {}) => request(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    ...options,
  }),
  
  put: (endpoint, body) => request(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  }),
  
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  upload: (file, folder) => {
    const fd = new FormData();
    fd.append('file', file);
    if (folder) fd.append('folder', folder);
    return uploadFile('/upload', fd);
  },
};

export { getTempToken };
export default api;
