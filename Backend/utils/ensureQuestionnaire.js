/**
 * Ensures the registration questionnaire exists in the DB on every server start.
 * If it already exists, does nothing. If not, seeds it automatically.
 */
const Question = require('../models/Question');
const Questionnaire = require('../models/Questionnaire');
const { DEFAULT_REGISTRATION_QUESTIONS } = require('../data/registrationQuestionnaireDefaults');

const ensureQuestionnaire = async () => {
  const existing = await Questionnaire.findOne({ isRegistrationQuestionnaire: true, isDeleted: false });
  if (existing) {
    console.log('Registration questionnaire already exists — skipping seed.');
    return { created: false };
  }

  const questions = await Question.insertMany(DEFAULT_REGISTRATION_QUESTIONS);
  await Questionnaire.create({
    title: 'Complétez votre profil',
    description: 'Ces informations nous aideront à personnaliser votre expérience sur Mahdia Blue & Green.',
    questions: questions.map(q => q._id),
    isActive: true,
    isDeleted: false,
    isRegistrationQuestionnaire: true
  });

  console.log('Registration questionnaire auto-seeded on startup.');
  return { created: true };
};

module.exports = ensureQuestionnaire;
