import api from './api';

/**
 * Origine du backend pour l’OAuth uniquement (navigation pleine page).
 * Doit être la même base que GOOGLE_CALLBACK_URL côté serveur (sans /api/oauth/...).
 * Si VITE_API_URL est relatif (/api) ou passe par le proxy Vite (:5173), un redirect_uri
 * calculé sur ce host ne correspond pas toujours à l’URI enregistrée chez Google — d’où cette origine dédiée.
 */
function getOAuthBackendOrigin() {
  const explicit = (import.meta.env.VITE_OAUTH_BACKEND_ORIGIN || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim();
  if (apiUrl.startsWith('http://') || apiUrl.startsWith('https://')) {
    try {
      const u = new URL(apiUrl);
      // API via le dev server Vite (:5173) : OAuth doit viser Express (port 5000 par défaut), pas le proxy
      if (u.port === '5173') {
        const backendPort = (import.meta.env.VITE_OAUTH_BACKEND_PORT || '5000').toString();
        return `${u.protocol}//${u.hostname}:${backendPort}`;
      }
      return `${u.protocol}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:5000';
}

// OAuth login URLs (used for direct window navigation, not api wrapper)
export const getGoogleLoginUrl = () => `${getOAuthBackendOrigin()}/api/oauth/google`;

// 2FA Management - use relative paths since api wrapper adds base URL
export const enable2FA = async () => {
  const response = await api.post('/oauth/2fa/enable');
  return response;
};

export const verifySetup2FA = async (token) => {
  const response = await api.post('/oauth/2fa/verify-setup', { token });
  return response;
};

export const disable2FA = async (password, token) => {
  const response = await api.post('/oauth/2fa/disable', { password, token });
  return response;
};

export const verify2FA = async (email, token) => {
  const response = await api.post('/oauth/2fa/verify', { email, token });
  return response;
};

export const generateBackupCodes = async (password) => {
  const response = await api.post('/oauth/2fa/backup-codes', { password });
  return response;
};

export const useBackupCode = async (email, backupCode) => {
  const response = await api.post('/oauth/2fa/use-backup-code', { email, backupCode });
  return response;
};

export default {
  getGoogleLoginUrl,
  enable2FA,
  verifySetup2FA,
  disable2FA,
  verify2FA,
  generateBackupCodes,
  useBackupCode
};
