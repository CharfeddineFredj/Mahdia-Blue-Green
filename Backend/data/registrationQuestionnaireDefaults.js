/**
 * Jeu de questions par défaut pour le questionnaire d'inscription « Complétez votre profil ».
 * Utilisé au démarrage (ensureQuestionnaire), restauration admin et seed.
 *
 * Forme alignée sur les documents Mongo (ex. premier champ comme export BSON).
 */
const DEFAULT_REGISTRATION_QUESTIONS = [
  {
    text: 'Quel est votre prénom ?',
    type: 'text',
    options: [],
    order: 1,
    isRequired: true,
    category: 'personal',
    personalInfoField: 'firstName'
  },
  {
    text: 'Quel est votre nom ?',
    type: 'text',
    options: [],
    order: 2,
    isRequired: true,
    category: 'personal',
    personalInfoField: 'lastName'
  },
  {
    text: 'Quelle est votre date de naissance ?',
    type: 'date',
    options: [],
    order: 3,
    isRequired: false,
    category: 'personal',
    personalInfoField: 'dateOfBirth'
  },
  {
    text: 'Quel est votre genre ?',
    type: 'single_choice',
    options: ['Homme', 'Femme'],
    order: 4,
    isRequired: false,
    category: 'personal',
    personalInfoField: 'gender'
  },
  {
    text: 'Quel est votre statut professionnel ?',
    type: 'single_choice',
    order: 5,
    isRequired: true,
    category: 'profession',
    personalInfoField: 'profession',
    options: [
      'Étudiant(e)',
      'Enseignant(e) / Professeur',
      'Chercheur(euse)',
      'Entrepreneur(euse) / CEO',
      'Employé(e) / Salarié(e)',
      'Fonctionnaire',
      'Freelance / Indépendant',
      'Sans emploi / En recherche',
      'Retraité(e)',
      'Autre'
    ]
  },
  {
    text: 'Dans quel secteur travaillez-vous ou étudiez-vous ?',
    type: 'single_choice',
    order: 6,
    isRequired: true,
    category: 'profession',
    personalInfoField: 'sector',
    options: [
      'Environnement / Écologie',
      'Agriculture / Pêche',
      'Tourisme / Hôtellerie',
      'Informatique / Technologie',
      'Commerce / Marketing',
      'Santé / Médecine',
      'Éducation / Formation',
      'Ingénierie',
      'Arts / Culture',
      'Droit / Administration',
      'Autre'
    ]
  },
  {
    text: "Quel est votre niveau d'études ?",
    type: 'single_choice',
    order: 7,
    isRequired: true,
    category: 'education',
    personalInfoField: 'educationLevel',
    options: [
      'Baccalauréat ou moins',
      'Licence (Bac+3)',
      'Master (Bac+5)',
      'Doctorat',
      'Formation professionnelle',
      'Autodidacte'
    ]
  },
  {
    text: "Si vous êtes étudiant(e), quel est votre établissement ?",
    type: 'text',
    options: [],
    order: 8,
    isRequired: false,
    category: 'education',
    personalInfoField: 'institution'
  },
  {
    text: 'Dans quelle ville habitez-vous ?',
    type: 'text',
    options: [],
    order: 9,
    isRequired: true,
    category: 'location',
    personalInfoField: 'address.city'
  },
  {
    text: 'Dans quel pays habitez-vous ?',
    type: 'single_choice',
    options: ['Tunisie', 'France', 'Algérie', 'Maroc', 'Autre'],
    order: 10,
    isRequired: true,
    category: 'location',
    personalInfoField: 'address.country'
  },
  {
    text: 'Quel est votre numéro de téléphone ?',
    type: 'text',
    options: [],
    order: 11,
    isRequired: true,
    category: 'contact',
    personalInfoField: 'phone'
  },
  {
    text: 'Comment avez-vous découvert Mahdia Blue & Green ?',
    type: 'single_choice',
    options: ['Réseaux sociaux', 'Bouche à oreille', 'Recherche Google', 'Événement local', 'Université / École', 'Autre'],
    order: 13,
    isRequired: true,
    category: 'discovery'
  },
  {
    text: 'Quels sujets vous intéressent le plus ?',
    type: 'multiple_choice',
    options: [
      'Économie bleue',
      'Économie verte',
      'Économie circulaire',
      'Entrepreneuriat',
      'Événements locaux',
      'Tourisme durable',
      'Agriculture durable',
      'Innovation & Technologie'
    ],
    order: 14,
    isRequired: true,
    category: 'interests'
  },
  {
    text: 'Êtes-vous entrepreneur ou souhaitez-vous le devenir ?',
    type: 'single_choice',
    options: ['Oui, je suis entrepreneur', 'Oui, je souhaite le devenir', 'Non, pas pour le moment'],
    order: 15,
    isRequired: true,
    category: 'entrepreneurship'
  },
  {
    text: 'Souhaitez-vous recevoir notre newsletter ?',
    type: 'boolean',
    options: [],
    order: 16,
    isRequired: false,
    category: 'preferences',
    personalInfoField: 'preferences.newsletter'
  },
  {
    text: 'Parlez-nous un peu de vous (bio courte)',
    type: 'text',
    options: [],
    order: 17,
    isRequired: false,
    category: 'personal',
    personalInfoField: 'bio'
  }
];

module.exports = { DEFAULT_REGISTRATION_QUESTIONS };
