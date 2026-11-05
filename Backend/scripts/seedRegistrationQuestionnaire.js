/**
 * Seed Registration Questionnaire
 * 
 * Run this script to create a registration questionnaire in the database.
 * Usage: node scripts/seedRegistrationQuestionnaire.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const Question = require('../models/Question');
const Questionnaire = require('../models/Questionnaire');
const { DEFAULT_REGISTRATION_QUESTIONS } = require('../data/registrationQuestionnaireDefaults');

const connectDB = require('../config/database');

const seedRegistrationQuestionnaire = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    // Delete existing registration questionnaire
    await Questionnaire.deleteMany({ isRegistrationQuestionnaire: true });
    console.log('Cleared existing registration questionnaires');

    const questions = await Question.create(
      DEFAULT_REGISTRATION_QUESTIONS.map((q, i) => ({ ...q, order: i + 1 }))
    );

    console.log(`Created ${questions.length} questions`);

    // Create the registration questionnaire
    const questionnaire = await Questionnaire.create({
      title: 'Complétez votre profil',
      description: 'Ces informations nous aideront à personnaliser votre expérience sur Mahdia Blue & Green.',
      questions: questions.map(q => q._id),
      isActive: true,
      isDeleted: false,
      isRegistrationQuestionnaire: true
    });

    console.log('Registration questionnaire created successfully!');
    console.log(`Questionnaire ID: ${questionnaire._id}`);
    console.log(`Title: ${questionnaire.title}`);
    console.log(`Questions: ${questions.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding questionnaire:', error);
    process.exit(1);
  }
};

seedRegistrationQuestionnaire();
