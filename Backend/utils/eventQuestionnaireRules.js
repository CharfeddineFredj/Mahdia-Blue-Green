const mongoose = require('mongoose');

/**
 * Règles métier des questionnaires d'événements (Panier Pro).
 * Indépendant des questionnaires administrateurs (modèle Questionnaire) : aucune règle partagée.
 */

/** Délai après la fin de l'événement pendant lequel le créateur peut encore créer / modifier son questionnaire. */
const QUESTIONNAIRE_GRACE_HOURS = 72;
const QUESTIONNAIRE_GRACE_MS = QUESTIONNAIRE_GRACE_HOURS * 60 * 60 * 1000;

/** text = réponse courte, long_text = réponse longue ; « date » reste accepté pour les anciens questionnaires */
const QUESTION_TYPES = ['text', 'long_text', 'single_choice', 'multiple_choice', 'rating', 'boolean', 'date'];
/** Types refusés à la création / modification (« long_text » conservé uniquement pour lire les anciennes données) */
const REJECTED_QUESTION_TYPES = ['long_text'];
const CHOICE_TYPES = ['single_choice', 'multiple_choice'];

const LIMITS = {
  titleMax: 200,
  descriptionMax: 2000,
  questionsMin: 1,
  questionsMax: 50,
  questionTextMax: 500,
  optionsMin: 2,
  optionsMax: 20,
  optionMax: 200,
  shortAnswerMax: 500,
  textAnswerMax: 5000,
  reasonMax: 1000,
};

/** Publication du questionnaire : dès sa validation (« avant ») ou à la fin de l'événement. */
const PUBLISH_MODES = ['before', 'after_end'];
/** Durée de réponse après la fin de l'événement : choisie par le créateur, 72 h maximum. */
const RESPONSE_WINDOW_MAX_HOURS = 72;
const HOUR_MS = 60 * 60 * 1000;

/** Rôles pouvant valider / refuser événements et questionnaires d'événements. */
const EVENT_REVIEWER_ROLES = ['superadmin', 'moderator'];
/** Rôles administrateurs autorisés à consulter les réponses aux questionnaires d'événements. */
const EVENT_RESPONSE_VIEWER_ROLES = ['superadmin', 'moderator', 'analyst'];

function toId(v) {
  if (v == null) return '';
  if (typeof v === 'object' && v._id != null) return String(v._id);
  return String(v);
}

/**
 * Date limite de création du questionnaire : fin de l'événement (ou début si fin absente) + 72 h.
 * @returns {Date|null}
 */
function getQuestionnaireDeadline(eventData) {
  const ref = eventData?.endDate || eventData?.startDate;
  if (!ref) return null;
  const t = new Date(ref).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + QUESTIONNAIRE_GRACE_MS);
}

/**
 * @returns {{ ok: true, deadline: Date } | { ok: false, deadline: Date|null, message: string }}
 */
function checkQuestionnaireWindow(eventData, now = new Date()) {
  const deadline = getQuestionnaireDeadline(eventData);
  if (!deadline) {
    return { ok: false, deadline: null, message: "Les dates de l'événement sont invalides." };
  }
  if (new Date(now).getTime() > deadline.getTime()) {
    return {
      ok: false,
      deadline,
      message: `Le délai de création du questionnaire est dépassé (${QUESTIONNAIRE_GRACE_HOURS} h après la fin de l'événement).`,
    };
  }
  return { ok: true, deadline };
}

/** Fin effective de l'événement (fin, ou début si la fin manque) */
function getEventEnd(eventData) {
  const ref = eventData?.endDate || eventData?.startDate;
  if (!ref) return null;
  const d = new Date(ref);
  return Number.isNaN(d.getTime()) ? null : d;
}

function responseWindowHours(version) {
  const h = Number(version?.responseWindowHours);
  return Number.isInteger(h) && h >= 1 && h <= RESPONSE_WINDOW_MAX_HOURS ? h : RESPONSE_WINDOW_MAX_HOURS;
}

/**
 * Calendrier de réponse d'une version de questionnaire :
 * - ouverture : à la validation (publishMode « before ») ou, pour « after_end », à la date/heure choisie
 *   par l'organisateur — jamais avant la fin de l'événement ni plus de 72 h après (défaut : la fin) ;
 * - date limite : fin de l'événement + durée choisie (72 h maximum).
 * @returns {{ publishMode, hours, opensAt: Date|null, closesAt: Date } | null}
 */
function getResponseSchedule(eventData, version) {
  const end = getEventEnd(eventData);
  if (!end || !version) return null;
  const hours = responseWindowHours(version);
  const publishMode = PUBLISH_MODES.includes(version.publishMode) ? version.publishMode : 'after_end';
  const closesAt = new Date(end.getTime() + hours * HOUR_MS);
  let opensAt = null;
  if (publishMode === 'after_end') {
    const wanted = version.opensAt ? new Date(version.opensAt).getTime() : NaN;
    const maxOpen = end.getTime() + RESPONSE_WINDOW_MAX_HOURS * HOUR_MS;
    // Bornage défensif (dates de l'événement modifiées après coup) : [fin, fin + 72 h]
    opensAt = Number.isNaN(wanted) ? end : new Date(Math.min(Math.max(wanted, end.getTime()), maxOpen));
  }
  return { publishMode, hours, opensAt, closesAt };
}

/**
 * Vérifie le calendrier choisi par l'organisateur pour un événement donné :
 * ouverture entre la fin de l'événement et fin + 72 h, avant la date limite, date limite non dépassée.
 */
function checkResponseSchedule(eventData, version, now = new Date()) {
  const end = getEventEnd(eventData);
  if (!end) return { ok: false, message: "Les dates de l'événement sont invalides." };
  const hours = responseWindowHours(version);
  const closesAt = new Date(end.getTime() + hours * HOUR_MS);
  if (version.publishMode === 'after_end' && version.opensAt) {
    const o = new Date(version.opensAt).getTime();
    if (o < end.getTime()) {
      return { ok: false, message: 'L’ouverture du questionnaire doit être postérieure à la fin de l’événement.' };
    }
    if (o > end.getTime() + RESPONSE_WINDOW_MAX_HOURS * HOUR_MS) {
      return { ok: false, message: `L’ouverture du questionnaire ne peut pas dépasser ${RESPONSE_WINDOW_MAX_HOURS} h après la fin de l’événement.` };
    }
    if (o >= closesAt.getTime()) {
      return { ok: false, message: 'La date limite de réponse doit être postérieure à l’ouverture du questionnaire : allongez la durée de réponse.' };
    }
  }
  if (closesAt.getTime() <= new Date(now).getTime()) {
    return { ok: false, message: 'La date limite de réponse serait déjà dépassée : choisissez une durée plus longue (72 h maximum).' };
  }
  return { ok: true, closesAt };
}

/** État pour les participants : upcoming (pas encore ouvert), open, closed (délai dépassé). */
function getResponseAvailability(eventData, version, now = new Date()) {
  const schedule = getResponseSchedule(eventData, version);
  if (!schedule) return { status: 'closed', opensAt: null, closesAt: null, hours: null, publishMode: null };
  const t = new Date(now).getTime();
  let status = 'open';
  if (schedule.opensAt && t < schedule.opensAt.getTime()) status = 'upcoming';
  else if (t > schedule.closesAt.getTime()) status = 'closed';
  return { status, ...schedule };
}

const EVENT_ENDED_MESSAGE = 'Cet événement est terminé : l’événement et son questionnaire ne peuvent plus être modifiés.';

/** Événement terminé : sa fin (ou son début si la fin manque) est passée. */
function isEventEnded(eventData, now = new Date()) {
  const ref = eventData?.endDate || eventData?.startDate;
  if (!ref) return false;
  const t = new Date(ref).getTime();
  return !Number.isNaN(t) && new Date(now).getTime() > t;
}

/**
 * Le créateur peut-il soumettre son questionnaire ?
 * - création : jusqu'à 72 h après la fin de l'événement ;
 * - modification d'un questionnaire existant : impossible une fois l'événement terminé.
 */
function canOwnerSubmitQuestionnaire(eventData, hasQuestionnaire, now = new Date()) {
  if (hasQuestionnaire && isEventEnded(eventData, now)) return false;
  return checkQuestionnaireWindow(eventData, now).ok;
}

function isEventOwner(user, event) {
  if (!user || !event) return false;
  return toId(event.author) === toId(user._id || user.id);
}

function isEventReviewer(user) {
  return !!user && EVENT_REVIEWER_ROLES.includes(user.role);
}

/** Seuls le créateur de l'événement et les administrateurs autorisés voient les réponses. */
function canViewEventResponses(user, event) {
  if (!user || !event) return false;
  if (isEventOwner(user, event)) return true;
  return EVENT_RESPONSE_VIEWER_ROLES.includes(user.role);
}

function cleanString(v) {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Valide et normalise le contenu d'un questionnaire soumis par un créateur.
 * Conserve les _id de questions existantes (stabilité des réponses entre versions).
 * @returns {{ ok: true, value: { title, description, questions } } | { ok: false, message: string }}
 */
function normalizeQuestionnairePayload(input, existingQuestionIds = []) {
  if (!input || typeof input !== 'object') {
    return { ok: false, message: 'Questionnaire invalide.' };
  }
  const title = cleanString(input.title);
  const description = cleanString(input.description);
  if (!title) return { ok: false, message: 'Le titre du questionnaire est obligatoire.' };
  if (title.length > LIMITS.titleMax) {
    return { ok: false, message: `Le titre ne peut pas dépasser ${LIMITS.titleMax} caractères.` };
  }
  if (description.length > LIMITS.descriptionMax) {
    return { ok: false, message: `La description ne peut pas dépasser ${LIMITS.descriptionMax} caractères.` };
  }

  const rawQuestions = Array.isArray(input.questions) ? input.questions : [];
  if (rawQuestions.length < LIMITS.questionsMin) {
    return { ok: false, message: 'Ajoutez au moins une question.' };
  }
  if (rawQuestions.length > LIMITS.questionsMax) {
    return { ok: false, message: `Un questionnaire ne peut pas contenir plus de ${LIMITS.questionsMax} questions.` };
  }

  const allowedIds = new Set(existingQuestionIds.map(String));
  const usedIds = new Set();
  const questions = [];

  for (let i = 0; i < rawQuestions.length; i += 1) {
    const q = rawQuestions[i] || {};
    const n = i + 1;
    const text = cleanString(q.text);
    const type = q.type || 'text';
    if (!text) return { ok: false, message: `Question ${n} : le libellé est obligatoire.` };
    if (text.length > LIMITS.questionTextMax) {
      return { ok: false, message: `Question ${n} : le libellé ne peut pas dépasser ${LIMITS.questionTextMax} caractères.` };
    }
    if (!QUESTION_TYPES.includes(type)) {
      return { ok: false, message: `Question ${n} : type de question invalide.` };
    }
    if (REJECTED_QUESTION_TYPES.includes(type)) {
      return { ok: false, message: `Question ${n} : le type « Réponse longue » n’est pas accepté. Utilisez « Texte ».` };
    }

    let options = [];
    if (CHOICE_TYPES.includes(type)) {
      options = (Array.isArray(q.options) ? q.options : []).map(cleanString).filter(Boolean);
      if (new Set(options).size !== options.length) {
        return { ok: false, message: `Question ${n} : les options doivent être distinctes.` };
      }
      if (options.length < LIMITS.optionsMin) {
        return { ok: false, message: `Question ${n} : au moins ${LIMITS.optionsMin} options sont requises.` };
      }
      if (options.length > LIMITS.optionsMax) {
        return { ok: false, message: `Question ${n} : ${LIMITS.optionsMax} options maximum.` };
      }
      if (options.some((o) => o.length > LIMITS.optionMax)) {
        return { ok: false, message: `Question ${n} : une option dépasse ${LIMITS.optionMax} caractères.` };
      }
    }

    const rawId = q._id != null ? String(q._id) : '';
    const keepId = rawId && allowedIds.has(rawId) && !usedIds.has(rawId);
    const _id = keepId ? new mongoose.Types.ObjectId(rawId) : new mongoose.Types.ObjectId();
    usedIds.add(String(_id));

    questions.push({ _id, text, type, options, isRequired: !!q.isRequired, order: n });
  }

  const publishMode = input.publishMode == null || input.publishMode === '' ? 'after_end' : input.publishMode;
  if (!PUBLISH_MODES.includes(publishMode)) {
    return { ok: false, message: 'Moment de publication du questionnaire invalide.' };
  }
  const rawHours = input.responseWindowHours == null || input.responseWindowHours === ''
    ? RESPONSE_WINDOW_MAX_HOURS
    : Number(input.responseWindowHours);
  if (!Number.isInteger(rawHours) || rawHours < 1 || rawHours > RESPONSE_WINDOW_MAX_HOURS) {
    return {
      ok: false,
      message: `La durée de réponse doit être comprise entre 1 et ${RESPONSE_WINDOW_MAX_HOURS} heures après la fin de l'événement.`,
    };
  }

  // Ouverture choisie (uniquement « après la fin ») : date valide, bornes vérifiées avec l'événement
  let opensAt = null;
  if (publishMode === 'after_end' && input.opensAt != null && input.opensAt !== '') {
    const d = new Date(input.opensAt);
    if (Number.isNaN(d.getTime())) {
      return { ok: false, message: 'Date d’ouverture du questionnaire invalide.' };
    }
    opensAt = d;
  }

  return { ok: true, value: { title, description, questions, publishMode, responseWindowHours: rawHours, opensAt } };
}

function isEmptyAnswer(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

/**
 * Valide les réponses d'un participant contre la version approuvée du questionnaire.
 * @param {Array} questions questions de la version publiée
 * @param {Array<{questionId, value}>} answers
 * @returns {{ ok: true, value: Array } | { ok: false, message: string }}
 */
function validateEventAnswers(questions, answers) {
  const list = Array.isArray(answers) ? answers : [];
  const byId = new Map();
  for (const a of list) {
    if (!a || a.questionId == null) continue;
    byId.set(String(a.questionId), a.value);
  }

  const known = new Set((questions || []).map((q) => String(q._id)));
  for (const id of byId.keys()) {
    if (!known.has(id)) return { ok: false, message: 'Réponse à une question inconnue.' };
  }

  const value = [];
  for (const q of questions || []) {
    const qid = String(q._id);
    let v = byId.get(qid);
    if (typeof v === 'string') v = v.trim();
    if (isEmptyAnswer(v)) {
      if (q.isRequired) return { ok: false, message: `La question « ${q.text} » est obligatoire.` };
      continue;
    }

    switch (q.type) {
      case 'text':
      case 'long_text': {
        if (typeof v !== 'string') return { ok: false, message: `Réponse invalide pour « ${q.text} ».` };
        const max = q.type === 'text' ? LIMITS.shortAnswerMax : LIMITS.textAnswerMax;
        if (v.length > max) {
          return { ok: false, message: `Réponse trop longue pour « ${q.text} » (${max} caractères maximum).` };
        }
        break;
      }
      case 'single_choice':
        if (!(q.options || []).includes(v)) return { ok: false, message: `Option invalide pour « ${q.text} ».` };
        break;
      case 'multiple_choice':
        if (!Array.isArray(v) || v.some((o) => !(q.options || []).includes(o))) {
          return { ok: false, message: `Options invalides pour « ${q.text} ».` };
        }
        v = [...new Set(v)];
        break;
      case 'rating': {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 5) {
          return { ok: false, message: `La note pour « ${q.text} » doit être comprise entre 1 et 5.` };
        }
        v = n;
        break;
      }
      case 'boolean':
        if (typeof v !== 'boolean') return { ok: false, message: `Réponse oui/non invalide pour « ${q.text} ».` };
        break;
      case 'date':
        if (typeof v !== 'string' || Number.isNaN(new Date(v).getTime())) {
          return { ok: false, message: `Date invalide pour « ${q.text} ».` };
        }
        break;
      default:
        return { ok: false, message: 'Type de question inconnu.' };
    }

    value.push({ questionId: q._id, questionText: q.text, questionType: q.type, value: v });
  }

  return { ok: true, value };
}

function normalizeReason(reason) {
  return cleanString(reason).slice(0, LIMITS.reasonMax);
}

module.exports = {
  QUESTIONNAIRE_GRACE_HOURS,
  QUESTIONNAIRE_GRACE_MS,
  QUESTION_TYPES,
  LIMITS,
  EVENT_REVIEWER_ROLES,
  EVENT_RESPONSE_VIEWER_ROLES,
  getQuestionnaireDeadline,
  checkQuestionnaireWindow,
  PUBLISH_MODES,
  RESPONSE_WINDOW_MAX_HOURS,
  getEventEnd,
  getResponseSchedule,
  getResponseAvailability,
  checkResponseSchedule,
  EVENT_ENDED_MESSAGE,
  isEventEnded,
  canOwnerSubmitQuestionnaire,
  isEventOwner,
  isEventReviewer,
  canViewEventResponses,
  normalizeQuestionnairePayload,
  validateEventAnswers,
  normalizeReason,
};
