const express = require('express');
const router = express.Router();
const {
  getAllArticles,
  getArticleById,
  getMyArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getArticlesByTag,
  getFeaturedArticles,
  getAllTags
} = require('../controllers/articleController');
const { protect } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - Visitor (unauthenticated) access
// ============================================
router.get('/', getAllArticles);                    // Visitor: GET all published articles
router.get('/featured', getFeaturedArticles);       // Visitor: GET featured/popular articles
router.get('/tags', getAllTags);                    // Visitor: GET all tags with count
router.get('/tag/:tag', getArticlesByTag);          // Visitor: GET articles by tag

// ============================================
// PRIVATE ROUTES - User (authenticated) access
// Requires: Full token (questionnaireCompleted = true)
// ============================================
router.get('/user/my-articles', protect, getMyArticles);  // User: GET current user's articles
router.post('/', protect, createArticle);                 // User: CREATE article

// ============================================
// PARAMETERIZED ROUTES (must come after static routes)
// ============================================
router.get('/:idOrSlug', getArticleById);           // Visitor: GET single article by ID or slug
router.put('/:id', protect, updateArticle);               // User: UPDATE article (owner only)
router.delete('/:id', protect, deleteArticle);            // User: DELETE article (owner only)

module.exports = router;
