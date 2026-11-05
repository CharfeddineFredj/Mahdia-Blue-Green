import api from './api';

export const postsService = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/posts${query ? `?${query}` : ''}`);
  },

  getByIdOrSlug: async (idOrSlug) => {
    return api.get(`/posts/${idOrSlug}`);
  },

  getComments: async (postId) => {
    return api.get(`/posts/${postId}/comments`);
  },

  getMyPosts: async () => {
    return api.get('/posts/user/my-posts');
  },

  createArticle: async (postData) => {
    return api.post('/posts/article', postData);
  },

  createEvent: async (postData) => {
    return api.post('/posts/event', postData);
  },

  update: async (id, postData) => {
    return api.put(`/posts/${id}`, postData);
  },

  delete: async (id) => {
    return api.delete(`/posts/${id}`);
  },

  addComment: async (postId, commentData) => {
    return api.post(`/posts/${postId}/comments`, commentData);
  },

  registerForEvent: async (postId, body = {}) => {
    return api.post(`/posts/${postId}/register`, body);
  },

  unregisterFromEvent: async (postId) => {
    return api.delete(`/posts/${postId}/register`);
  },

  ratePost: async (postId, value) => {
    return api.post(`/posts/${postId}/rate`, { value });
  },

  toggleFavorite: async (postId) => {
    return api.post(`/posts/${postId}/favorite`, {});
  },

  getFavorites: async () => {
    return api.get('/posts/user/favorites');
  },
};

export default postsService;
