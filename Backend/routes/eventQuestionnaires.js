const express = require('express');
const router = express.Router();
const {
  getMyEventQuestionnaires,
  getParticipatingQuestionnaires,
  getEventQuestionnaire,
  createEventQuestionnaire,
  updateEventQuestionnaire,
  submitEventQuestionnaireResponse,
  getEventQuestionnaireResponses,
  getMyEventQuestionnaireResponse,
  adminListEventQuestionnaires,
  adminApproveEventQuestionnaire,
  adminRejectEventQuestionnaire
} = require('../controllers/eventQuestionnaireController');
const { protect, isModerator } = require('../middleware/auth');

/**
 * QUESTIONNAIRES D'ÉVÉNEMENTS (Panier Pro)
 *
 * Distincts des questionnaires administrateurs (/api/questionnaires) : modèles, routes et permissions séparés.
 * Toutes les routes exigent une session complète.
 */
router.use(protect);

// Créateur : questionnaires de ses événements ; participant : questionnaires de ses inscriptions
router.get('/mine', getMyEventQuestionnaires);
router.get('/participating', getParticipatingQuestionnaires);

// Validation administrative (superadmin + modérateur, comme la publication des événements)
router.get('/admin/list', isModerator, adminListEventQuestionnaires);
router.put('/admin/:id/approve', isModerator, adminApproveEventQuestionnaire);
router.put('/admin/:id/reject', isModerator, adminRejectEventQuestionnaire);

// Par événement (permissions vérifiées dans le contrôleur : créateur / admin / participant inscrit)
router.get('/event/:eventId', getEventQuestionnaire);
router.post('/event/:eventId', createEventQuestionnaire);
router.put('/event/:eventId', updateEventQuestionnaire);
router.post('/event/:eventId/responses', submitEventQuestionnaireResponse);
router.get('/event/:eventId/responses', getEventQuestionnaireResponses);
router.get('/event/:eventId/my-response', getMyEventQuestionnaireResponse); // participant : sa propre réponse

module.exports = router;
