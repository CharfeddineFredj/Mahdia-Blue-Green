const express = require('express');
const router = express.Router();
const {
  getQuestionnaires,
  getQuestionnaire,
  getRegistrationQuestionnaire,
  getQuestionnairesAdmin,
  getQuestionnaireAdminDetail,
  getQuestionnaireStatistics,
  createQuestionnaire,
  updateQuestionnaire,
  deleteQuestionnaire,
  syncQuestionnaireQuestions,
  restoreRegistrationQuestionDefaults,
  submitResponse,
  getMyResponses,
  getPendingQuestionnairesForUser
} = require('../controllers/questionnaireController');
const { protect, isAnalyst } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - Visitor (unauthenticated) access
// ============================================
router.get('/', getQuestionnaires);                           // Visitor: GET all active questionnaires
router.get('/registration', getRegistrationQuestionnaire);    // Visitor: GET registration questionnaire (preview)
router.get('/admin/list', protect, isAnalyst, getQuestionnairesAdmin); // Analyst: all questionnaires
router.get('/admin/:id/statistics', protect, isAnalyst, getQuestionnaireStatistics); // Analyst: stats + réponses paginées
router.get('/admin/:id', protect, isAnalyst, getQuestionnaireAdminDetail); // Analyst: one questionnaire + questions (DB)

// ============================================
// USER ROUTES - User (authenticated) access
// Requires: Full token (questionnaireCompleted = true)
// NOTE: Registration questionnaire is submitted via POST /api/auth/complete-questionnaire
// ============================================
router.get('/user/pending', protect, getPendingQuestionnairesForUser); // User: questionnaires sans réponse (rappels)
router.get('/user/responses', protect, getMyResponses);       // User: GET current user's responses

// ============================================
// ANALYST ROUTES - Questionnaire management
// Requires: Full token + role='analyst' or 'superadmin'
// ============================================
router.post('/', protect, isAnalyst, createQuestionnaire);     // Analyst: CREATE questionnaire

// ============================================
// PARAMETERIZED ROUTES (must come after static routes)
// ============================================
router.put('/:id/questions', protect, isAnalyst, syncQuestionnaireQuestions);
router.post('/:id/questions/restore-defaults', protect, isAnalyst, restoreRegistrationQuestionDefaults);
router.get('/:id', getQuestionnaire);                         // Visitor: GET single questionnaire
router.put('/:id', protect, isAnalyst, updateQuestionnaire);   // Analyst: UPDATE questionnaire
router.delete('/:id', protect, isAnalyst, deleteQuestionnaire); // Analyst: DELETE questionnaire
router.post('/:id/submit', protect, submitResponse);          // User: Submit response (non-registration only)

module.exports = router;
