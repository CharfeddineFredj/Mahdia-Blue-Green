const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  logout, 
  getMe, 
  completeQuestionnaire,
  forgotPassword,
  resetPassword,
  changePassword,
  setPassword,
  sendVerificationEmail,
  verifyEmail,
  requestReactivation,
  requestReactivationOAuth,
  finalizeRegistrationIfNoQuestionnaire
} = require('../controllers/authController');
const { protect, protectTemp } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - Visitor access
// ============================================
router.post('/register', register);
router.post('/login', login);
router.post('/request-reactivation', requestReactivation);
router.post('/request-reactivation-oauth', requestReactivationOAuth);

// Password reset (Facebook-style code)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Email verification
router.post('/send-verification', sendVerificationEmail);
router.post('/verify-email', verifyEmail);

// ============================================
// TEMP TOKEN ROUTES - Completing registration
// ============================================
router.post('/complete-questionnaire', protectTemp, completeQuestionnaire);
router.post('/finalize-registration', protectTemp, finalizeRegistrationIfNoQuestionnaire);

// ============================================
// PROTECTED ROUTES - Authenticated user
// ============================================
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.post('/set-password', protect, setPassword);

module.exports = router;
