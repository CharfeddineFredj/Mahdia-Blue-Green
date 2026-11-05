const mongoose = require('mongoose');
const { QUESTION_TYPES } = require('../utils/eventQuestionnaireRules');

/**
 * Questionnaire facultatif rattaché à un événement proposé depuis le Panier Pro.
 * Collection distincte des questionnaires administrateurs (Questionnaire / Question / Response).
 *
 * - approvedVersion : dernière version validée par un administrateur (seule visible des participants)
 * - pendingVersion  : version soumise (création ou modification) en attente / refusée
 */
const eventQuestionSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  type: { type: String, enum: QUESTION_TYPES, default: 'text' },
  options: [{ type: String, trim: true }],
  isRequired: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { _id: true });

const versionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  questions: { type: [eventQuestionSchema], default: [] },
  /** Publication : dès la validation (« before ») ou à la fin de l'événement (« after_end ») */
  publishMode: { type: String, enum: ['before', 'after_end'], default: 'after_end' },
  /** Durée pour répondre après la fin de l'événement (1 à 72 h) */
  responseWindowHours: { type: Number, min: 1, max: 72, default: 72 },
  /** Ouverture choisie pour « after_end » (entre la fin de l'événement et fin + 72 h). null = à la fin */
  opensAt: { type: Date, default: null },
  submittedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
}, { _id: false });

const eventQuestionnaireSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    unique: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedVersion: { type: versionSchema, default: null },
  pendingVersion: { type: versionSchema, default: null },
  /** Statut de la dernière soumission : pending (en attente), approved, rejected */
  reviewStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  rejectionReason: { type: String, trim: true, default: '' },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

eventQuestionnaireSchema.index({ author: 1 });
eventQuestionnaireSchema.index({ reviewStatus: 1 });

module.exports = mongoose.model('EventQuestionnaire', eventQuestionnaireSchema);
