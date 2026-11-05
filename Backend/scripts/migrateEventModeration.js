/**
 * Migration : validation administrative des événements + questionnaires d'événements.
 *
 * - Renseigne `moderation.status` sur les événements et articles existants (publié → approved, sinon pending)
 * - Crée les index des collections eventquestionnaires / eventquestionnaireresponses
 *
 * Idempotent. Run with: npm run migrate:event-moderation
 */

const mongoose = require('mongoose');
require('dotenv').config();

const ensureEventModeration = require('../utils/ensureEventModeration');
const EventQuestionnaire = require('../models/EventQuestionnaire');
const EventQuestionnaireResponse = require('../models/EventQuestionnaireResponse');

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set');
  }
  await mongoose.connect(process.env.MONGODB_URI);

  const { approved, pending } = await ensureEventModeration();
  console.log(`Événements et articles marqués approuvés : ${approved}`);
  console.log(`Événements et articles marqués en attente : ${pending}`);

  await EventQuestionnaire.syncIndexes();
  await EventQuestionnaireResponse.syncIndexes();
  console.log('Index des questionnaires d’événements synchronisés.');
}

run()
  .catch((err) => {
    console.error('Migration échouée :', err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
