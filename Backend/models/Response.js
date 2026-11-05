const mongoose = require('mongoose');

/**
 * Answer Schema (embedded in Response)
 * Stores individual question answers
 */
const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed, // Can be string, array, number, boolean, date
    required: true
  }
}, { _id: false });

/** Réponses détachées quand une question est retirée du questionnaire (conservées pour audit / conformité) */
const archivedAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  questionText: { type: String, default: '' },
  questionType: { type: String, default: 'text' },
  personalInfoField: { type: String, default: null },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  archivedAt: {
    type: Date,
    default: Date.now
  },
  reason: {
    type: String,
    default: 'question_removed'
  }
}, { _id: true });

/**
 * Response Schema
 * 
 * Stores user responses to questionnaires.
 * For registration questionnaires, responses are used to populate PersonalInfo.
 * 
 * Flow:
 * 1. User submits questionnaire response
 * 2. If isRegistrationQuestionnaire = true
 * 3. Answers are extracted and mapped to PersonalInfo fields
 * 4. PersonalInfo document is created/updated
 * 5. User.personalInfo is linked
 */
const responseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionnaire: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Questionnaire',
    required: true
  },
  answers: [answerSchema],
  archivedAnswers: {
    type: [archivedAnswerSchema],
    default: []
  },
  // Reference to PersonalInfo created from this response (if registration questionnaire)
  personalInfo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PersonalInfo'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries - one response per user per questionnaire
responseSchema.index({ user: 1, questionnaire: 1 }, { unique: true });

module.exports = mongoose.model('Response', responseSchema);
