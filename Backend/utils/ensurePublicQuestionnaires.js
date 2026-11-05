/**
 * Crée le questionnaire public par défaut s’il n’existe aucun enquête hors inscription.
 * Met à jour automatiquement l’ancienne version « Votre avis compte » (2 questions) en y ajoutant les 3 questions supplémentaires.
 */
const Question = require('../models/Question');
const Questionnaire = require('../models/Questionnaire');

const DEFAULT_TITLE = 'Votre avis compte';

const DEFAULT_DESCRIPTION =
  'Quelques questions pour mieux comprendre vos attentes et orienter nos contenus sur l’économie bleue, l’économie verte et l’entrepreneuriat durable à Mahdia.';

/** Définitions complètes (5 questions) — utilisé à la création et pour l’upgrade +3 */
const DEFAULT_PUBLIC_QUESTION_DEFS = [
  {
    text: 'Sur une échelle de 1 à 5, dans quelle mesure les thématiques économie bleue, économie verte et développement durable vous semblent-elles pertinentes pour l’avenir de la région de Mahdia ?',
    type: 'rating',
    order: 1,
    isRequired: true,
    category: 'general'
  },
  {
    text: 'Souhaitez-vous être informé(e) des prochains événements et rencontres organisés par la communauté Mahdia Blue & Green ?',
    type: 'boolean',
    order: 2,
    isRequired: false,
    category: 'preferences'
  },
  {
    text: 'Quel est votre principal centre d’intérêt sur la plateforme ?',
    type: 'single_choice',
    options: [
      'Économie bleue (mer, pêche, tourisme côtier, etc.)',
      'Économie verte (agriculture, énergies, biodiversité, etc.)',
      'Économie circulaire et réduction des déchets',
      'Accompagnement des entrepreneurs et porteurs de projets',
      'Veux principalement suivre l’actualité et les ressources'
    ],
    order: 3,
    isRequired: true,
    category: 'interests'
  },
  {
    text: 'Quels types de contenus ou d’actions souhaitez-vous voir renforcés ?',
    type: 'multiple_choice',
    options: [
      'Guides pratiques et fiches méthodologiques',
      'Analyses, études et données sur le territoire',
      'Témoignages d’acteurs locaux et retours d’expérience',
      'Actualités, événements et appels à participation',
      'Ressources documentaires et liens utiles',
      'Visibilité des initiatives bleues et vertes à Mahdia'
    ],
    order: 4,
    isRequired: false,
    category: 'preferences'
  },
  {
    text: 'Souhaitez-vous partager une suggestion, une attente ou une piste de partenariat pour le collectif Mahdia Blue & Green ? (facultatif)',
    type: 'text',
    order: 5,
    isRequired: false,
    category: 'general'
  }
];

/**
 * Ancienne fiche seed : 2 questions (rating + boolean). On ajoute les définitions 3–5 sans toucher aux 2 premières (réponses existantes).
 */
async function upgradeLegacyVotreAvisCompte() {
  const doc = await Questionnaire.findOne({
    title: DEFAULT_TITLE,
    isDeleted: false,
    isRegistrationQuestionnaire: { $ne: true }
  }).populate('questions');

  if (!doc?.questions?.length) {
    return { upgraded: false };
  }

  const sorted = [...doc.questions].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

  if (sorted.length >= DEFAULT_PUBLIC_QUESTION_DEFS.length) {
    return { upgraded: false };
  }

  if (sorted.length !== 2) {
    return { upgraded: false };
  }

  const typeCounts = sorted.reduce((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});
  if (typeCounts.rating !== 1 || typeCounts.boolean !== 1) {
    return { upgraded: false };
  }

  const extraDefs = DEFAULT_PUBLIC_QUESTION_DEFS.slice(2);
  const newOnes = await Question.insertMany(extraDefs);

  doc.questions = [...sorted.map((q) => q._id), ...newOnes.map((q) => q._id)];

  const d = (doc.description || '').trim();
  if (!d || d.includes('Cette enquête est proposée par défaut')) {
    doc.description = DEFAULT_DESCRIPTION;
  }

  await doc.save();
  console.log(
    '[ensurePublicQuestionnaires] Questionnaire « Votre avis compte » mis à jour : +3 questions (total 5).'
  );
  return { upgraded: true };
}

const ensurePublicQuestionnaires = async () => {
  const upgrade = await upgradeLegacyVotreAvisCompte();
  if (upgrade.upgraded) {
    return { created: false, upgraded: true };
  }

  const count = await Questionnaire.countDocuments({
    isRegistrationQuestionnaire: { $ne: true },
    isDeleted: false
  });

  if (count > 0) {
    return { created: false, upgraded: false };
  }

  const qs = await Question.insertMany(DEFAULT_PUBLIC_QUESTION_DEFS);

  await Questionnaire.create({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    questions: qs.map((q) => q._id),
    isActive: true,
    isDeleted: false,
    isRegistrationQuestionnaire: false
  });

  console.log('Default public questionnaire seeded (DB).');
  return { created: true, upgraded: false };
};

module.exports = ensurePublicQuestionnaires;
