const express = require('express');
console.log('--- LOADING POST ROUTES ---');
const router = express.Router();
const {
  getAllPosts,
  getPostById,
  getMyPosts,
  createArticlePost,
  createEventPost,
  updatePost,
  deletePost,
  addComment,
  getPostComments,
  registerForEvent,
  unregisterFromEvent,
  toggleReaction,
  ratePost,
  toggleFavorite,
  getUserFavorites
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - Visitor (unauthenticated) access
// ============================================
router.get('/', getAllPosts);                          // Visitor: GET all published posts

// ============================================
// PRIVATE ROUTES - User (authenticated) access
// Requires: Full token (questionnaireCompleted = true)
// ============================================
router.get('/user/my-posts', protect, getMyPosts);     // User: GET current user's posts
router.get('/user/favorites', protect, getUserFavorites); // User: GET favorite posts

// Create posts
router.post('/article', protect, createArticlePost);   // User: CREATE article post
router.post('/event', protect, createEventPost);       // User: CREATE event post

// ============================================
// PARAMETERIZED ROUTES (must come after static routes)
// ============================================
router.get('/:idOrSlug', getPostById);                 // Visitor: GET single post by ID or slug
router.get('/:id/comments', getPostComments);          // Visitor: GET post comments (read only)

// Update & Delete
router.put('/:id', protect, updatePost);               // User: UPDATE post (owner only)
router.delete('/:id', protect, deletePost);            // User: DELETE post (owner only)

// Comments (User only - Visitor cannot comment)
router.post('/:id/comments', protect, addComment);     // User: ADD comment to post

// Event registration (User only)
router.post('/:id/register', protect, registerForEvent);    // User: Register for event
router.delete('/:id/register', protect, unregisterFromEvent); // User: Unregister from event

// Reactions (User only)
router.post('/:id/react', protect, toggleReaction);    // User: Toggle reaction

// Rating & Favorites
router.post('/:id/rate', protect, ratePost);           // User: Rate post (1-5)
router.post('/:id/favorite', protect, toggleFavorite); // User: Toggle favorite

module.exports = router;
