const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getAnalytics,
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  getAllPosts,
  approvePost,
  rejectPost,
  approveEventRevision,
  rejectEventRevision,
  deletePost,
  getAllResponses,
  getReactivationRequests,
  approveReactivationRequest,
  rejectReactivationRequest
} = require('../controllers/adminController');
const { protect, isAdmin, isSuperAdmin, isSuperAdminOrModerator, isModerator, isAnalyst } = require('../middleware/auth');

/**
 * ADMIN PANEL ROUTES
 * 
 * Roles:
 *   - superadmin: Accès complet (réactivations, équipe admin, rôles, etc.)
 *   - analyst: Questionnaires, réponses, tableau Analyse (statistiques)
 *   - moderator: Contenus + utilisateurs « classiques » (pas réactivations, pas équipe admin, pas questionnaires)
 * 
 * All routes require:
 *   1. `protect` middleware - Full token (completed questionnaire)
 *   2. Role-specific middleware
 */

// All admin routes require authentication
router.use(protect);

// ============================================
// SUPERADMIN ROUTES - Full access
// ============================================
router.get('/dashboard', isAdmin, getDashboard);              // Any admin: View dashboard
router.get('/analytics', isAnalyst, getAnalytics);            // Superadmin & analyst: stats agrégées

// User management — superadmin + modérateur (le modérateur ne gère pas l’équipe admin : voir contrôleur)
router.get('/users', isSuperAdminOrModerator, getAllUsers);
router.get('/users/:id', isSuperAdminOrModerator, getUserById);
router.put('/users/:id/role', isSuperAdminOrModerator, updateUserRole);
router.put('/users/:id/status', isSuperAdminOrModerator, updateUserStatus);
router.delete('/users/:id', isSuperAdminOrModerator, deleteUser);

router.get('/reactivation-requests', isSuperAdmin, getReactivationRequests);
router.put('/reactivation-requests/:id/approve', isSuperAdmin, approveReactivationRequest);
router.put('/reactivation-requests/:id/reject', isSuperAdmin, rejectReactivationRequest);

// ============================================
// MODERATOR ROUTES - Content supervision
// ============================================
router.get('/posts', isModerator, getAllPosts);               // Moderator: GET all posts (including drafts)
router.put('/posts/:id/approve', isModerator, approvePost);   // Moderator: Approve/reject posts
router.put('/posts/:id/reject', isModerator, rejectPost);     // Moderator: Reject a submitted post (with reason)
router.put('/posts/:id/revision/approve', isModerator, approveEventRevision); // Moderator: apply pending event modification
router.put('/posts/:id/revision/reject', isModerator, rejectEventRevision);   // Moderator: reject pending event modification
router.delete('/posts/:id', isModerator, deletePost);         // Moderator: Delete any post

// ============================================
// ANALYST ROUTES - Questionnaire management
// ============================================
router.get('/responses', isAnalyst, getAllResponses);         // Analyst: View questionnaire responses

module.exports = router;
