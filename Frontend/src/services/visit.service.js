import api from './api';

const visitService = {
    // Track a page visit
    trackVisit: async (page) => {
        try {
            // Get or create visitor ID from localStorage
            let visitorId = localStorage.getItem('mbg_visitor_id');

            const response = await api.post(
                '/visits/track',
                {
                    page,
                    visitorId,
                    referrer: document.referrer || ''
                },
                { skipAuth: true }
            );

            // api.post renvoie le corps JSON tel quel : { success, visitorId }
            if (response?.visitorId) {
                localStorage.setItem('mbg_visitor_id', response.visitorId);
            }

            return response;
        } catch (error) {
            // Silent fail - don't break the site for tracking
            console.error('Visit tracking failed:', error.message);
            return { success: true };
        }
    },

    // Get visitor stats (admin only) — même forme que l’API : { success, data }
    getStats: async () => {
        return api.get('/visits/stats');
    }
};

export default visitService;
