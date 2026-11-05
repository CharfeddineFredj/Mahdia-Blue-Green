const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  getUser, 
  updateUser, 
  deleteUser,
  updateProfile,
  deleteProfile
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

/**
 * USER ROUTES
 * 
 * Access: Authenticated Users only (no Visitor/Guest access)
 * All routes require `protect` middleware (full token with completed questionnaire)
 * 
 * Flow: Visitor → Register → Complete Questionnaire → Authenticated User → Access these routes
 */

// Authenticated User routes - Requires full token (questionnaire completed)
router.get('/', protect, authorize('superadmin', 'moderator'), getUsers);
router.put('/profile/update', protect, updateProfile);
router.delete('/profile', protect, deleteProfile);
router.get('/:id', protect, getUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, authorize('superadmin'), deleteUser);

module.exports = router;
