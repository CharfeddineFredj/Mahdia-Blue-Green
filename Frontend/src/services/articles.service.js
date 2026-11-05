import api from './api';

export const articlesService = {
  // Get all articles with optional filters
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/articles${query ? `?${query}` : ''}`);
  },

  // Get featured/popular articles
  getFeatured: async () => {
    return api.get('/articles/featured');
  },

  // Get all tags with count
  getAllTags: async () => {
    return api.get('/articles/tags');
  },

  // Get articles by tag
  getByTag: async (tag) => {
    return api.get(`/articles/tag/${encodeURIComponent(tag)}`);
  },

  // Get single article by ID or slug
  getBySlug: async (idOrSlug) => {
    return api.get(`/articles/${idOrSlug}`);
  },

  // Get current user's articles (requires auth)
  getMyArticles: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/articles/user/my-articles${query ? `?${query}` : ''}`);
  },

  // Create new article (requires auth)
  create: async (articleData) => {
    return api.post('/articles', articleData);
  },

  // Update article (owner only)
  update: async (id, articleData) => {
    return api.put(`/articles/${id}`, articleData);
  },

  // Delete article (owner only)
  delete: async (id) => {
    return api.delete(`/articles/${id}`);
  },

  // Get articles by category (using query params)
  getByCategory: async (category, limit = 10) => {
    return api.get(`/articles?category=${category}&limit=${limit}`);
  },
};

export default articlesService;
