import api from './api';

export const eventsService = {
  // Get all events with optional filters
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/events${query ? `?${query}` : ''}`);
  },

  // Get upcoming events
  getUpcoming: async (limit = 5) => {
    return api.get(`/events/upcoming${limit ? `?limit=${limit}` : ''}`);
  },

  // Get single event by ID
  getById: async (id) => {
    return api.get(`/events/${id}`);
  },

  // Alias for getById (for compatibility)
  getBySlug: async (idOrSlug) => {
    return api.get(`/events/${idOrSlug}`);
  },

  // Get current user's events (requires auth)
  getMyEvents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/events/user/my-events${query ? `?${query}` : ''}`);
  },

  // Get events user registered for (requires auth)
  getRegisteredEvents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/events/user/registered${query ? `?${query}` : ''}`);
  },

  // Create new event (requires auth)
  create: async (eventData) => {
    return api.post('/events', eventData);
  },

  // Update event (owner only)
  update: async (id, eventData) => {
    return api.put(`/events/${id}`, eventData);
  },

  // Delete event (owner only)
  delete: async (id) => {
    return api.delete(`/events/${id}`);
  },

  // Register for event (requires auth)
  register: async (eventId, body = {}) => {
    return api.post(`/events/${eventId}/register`, body);
  },

  // Unregister from event (requires auth)
  unregister: async (eventId) => {
    return api.delete(`/events/${eventId}/register`);
  },

  // Get event attendees (owner only)
  getAttendees: async (eventId) => {
    return api.get(`/events/${eventId}/attendees`);
  },

  // Export event to iCal format
  exportToICal: async (eventId) => {
    return api.get(`/events/${eventId}/ical`);
  },

  // Get Google Calendar URL for event
  getGoogleCalendarUrl: async (eventId) => {
    return api.get(`/events/${eventId}/google-calendar`);
  },
};

export default eventsService;
