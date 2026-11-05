const mongoose = require('mongoose');

/**
 * Réponse d'un participant inscrit au questionnaire d'un événement.
 * Le libellé et le type de chaque question sont copiés pour rester lisibles
 * si le créateur publie ensuite une nouvelle version du questionnaire.
 */
const eventAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionText: { type: String, default: '' },
  questionType: { type: String, default: 'text' },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const eventQuestionnaireResponseSchema = new mongoose.Schema({
  questionnaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EventQuestionnaire',
    required: true
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: { type: [eventAnswerSchema], default: [] },
  submittedAt: { type: Date, default: Date.now },
  /** Dernière modification par le participant (tant que le questionnaire est ouvert) */
  editedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Une seule réponse par participant et par questionnaire
eventQuestionnaireResponseSchema.index({ user: 1, questionnaire: 1 }, { unique: true });
eventQuestionnaireResponseSchema.index({ event: 1 });

module.exports = mongoose.model('EventQuestionnaireResponse', eventQuestionnaireResponseSchema);
