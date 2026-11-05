import api from './api';

/**
 * Public chat proxy — no auth header so a failed chat request never clears the user session.
 */
const chatService = {
  async sendMessage({ messages, temperature = 0.7, max_tokens = 400 }) {
    try {
      const res = await api.post(
        '/chat',
        { messages, temperature, max_tokens },
        { skipAuth: true }
      );
      if (!res?.success) {
        throw new Error(res?.message || 'Chat request failed');
      }
      const reply = res.data?.reply;
      if (!reply || typeof reply !== 'string') {
        throw new Error(res?.message || 'No assistant reply');
      }
      return reply;
    } catch (err) {
      const msg = err?.message || '';
      if (
        err?.name === 'TypeError' ||
        /failed to fetch|networkerror|load failed/i.test(msg)
      ) {
        throw new Error(
          'Connexion au serveur impossible. Vérifiez que l’API est démarrée et que l’URL (VITE_API_URL / proxy) est correcte.'
        );
      }
      throw err;
    }
  },
};

export default chatService;
