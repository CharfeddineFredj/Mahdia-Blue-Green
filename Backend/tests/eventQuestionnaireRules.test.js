const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const {
  QUESTIONNAIRE_GRACE_MS,
  getQuestionnaireDeadline,
  checkQuestionnaireWindow,
  isEventOwner,
  isEventReviewer,
  canViewEventResponses,
  normalizeQuestionnairePayload,
  validateEventAnswers,
} = require('../utils/eventQuestionnaireRules');

const HOUR = 60 * 60 * 1000;

describe('Règle des 72 heures', () => {
  const end = new Date('2026-06-10T18:00:00.000Z');
  const eventData = { startDate: new Date('2026-06-10T15:00:00.000Z'), endDate: end };

  test('la date limite est la fin de l’événement + 72 h', () => {
    assert.equal(getQuestionnaireDeadline(eventData).getTime(), end.getTime() + 72 * HOUR);
    assert.equal(QUESTIONNAIRE_GRACE_MS, 72 * HOUR);
  });

  test('autorisé avant l’événement, pendant et jusqu’à 72 h après la fin', () => {
    assert.equal(checkQuestionnaireWindow(eventData, new Date('2026-06-01T00:00:00Z')).ok, true);
    assert.equal(checkQuestionnaireWindow(eventData, new Date(end.getTime() + 71 * HOUR)).ok, true);
    assert.equal(checkQuestionnaireWindow(eventData, new Date(end.getTime() + 72 * HOUR)).ok, true);
  });

  test('interdit au-delà de 72 h après la fin', () => {
    const r = checkQuestionnaireWindow(eventData, new Date(end.getTime() + 72 * HOUR + 1000));
    assert.equal(r.ok, false);
    assert.match(r.message, /72 h/);
  });

  test('règle appliquée individuellement à chaque événement', () => {
    const now = new Date(end.getTime() + 100 * HOUR);
    const later = { startDate: end, endDate: new Date(end.getTime() + 48 * HOUR) };
    assert.equal(checkQuestionnaireWindow(eventData, now).ok, false);
    assert.equal(checkQuestionnaireWindow(later, now).ok, true);
  });

  test('utilise la date de début si la fin est absente, refuse les dates invalides', () => {
    const start = new Date('2026-06-10T15:00:00.000Z');
    assert.equal(getQuestionnaireDeadline({ startDate: start }).getTime(), start.getTime() + 72 * HOUR);
    assert.equal(checkQuestionnaireWindow({}).ok, false);
    assert.equal(checkQuestionnaireWindow({ endDate: 'nope' }).ok, false);
  });
});

describe('Événement terminé', () => {
  const end = new Date('2026-06-10T18:00:00.000Z');
  const eventData = { startDate: new Date('2026-06-10T15:00:00.000Z'), endDate: end };
  const { isEventEnded, canOwnerSubmitQuestionnaire } = require('../utils/eventQuestionnaireRules');

  test('terminé après la fin, pas avant', () => {
    assert.equal(isEventEnded(eventData, new Date(end.getTime() - 1000)), false);
    assert.equal(isEventEnded(eventData, new Date(end.getTime() + 1000)), true);
    assert.equal(isEventEnded({}, new Date()), false);
  });

  test('questionnaire existant figé dès la fin ; création encore possible pendant 72 h', () => {
    const after = new Date(end.getTime() + 10 * HOUR);
    assert.equal(canOwnerSubmitQuestionnaire(eventData, true, after), false, 'modification refusée');
    assert.equal(canOwnerSubmitQuestionnaire(eventData, false, after), true, 'création encore permise');
    assert.equal(canOwnerSubmitQuestionnaire(eventData, false, new Date(end.getTime() + 73 * HOUR)), false);
    assert.equal(canOwnerSubmitQuestionnaire(eventData, true, new Date(end.getTime() - HOUR)), true, 'avant la fin');
  });
});

describe('Permissions', () => {
  const ownerId = new mongoose.Types.ObjectId();
  const event = { author: ownerId };

  test('créateur identifié par id (populé ou non)', () => {
    assert.equal(isEventOwner({ _id: ownerId, role: 'user' }, event), true);
    assert.equal(isEventOwner({ id: String(ownerId), role: 'user' }, { author: { _id: ownerId } }), true);
    assert.equal(isEventOwner({ _id: new mongoose.Types.ObjectId(), role: 'user' }, event), false);
  });

  test('réponses visibles uniquement du créateur et des administrateurs autorisés', () => {
    const other = new mongoose.Types.ObjectId();
    assert.equal(canViewEventResponses({ _id: ownerId, role: 'user' }, event), true);
    assert.equal(canViewEventResponses({ _id: other, role: 'superadmin' }, event), true);
    assert.equal(canViewEventResponses({ _id: other, role: 'moderator' }, event), true);
    assert.equal(canViewEventResponses({ _id: other, role: 'analyst' }, event), true);
    assert.equal(canViewEventResponses({ _id: other, role: 'user' }, event), false);
    assert.equal(canViewEventResponses(null, event), false);
  });

  test('seuls superadmin et modérateur valident', () => {
    assert.equal(isEventReviewer({ role: 'superadmin' }), true);
    assert.equal(isEventReviewer({ role: 'moderator' }), true);
    assert.equal(isEventReviewer({ role: 'analyst' }), false);
    assert.equal(isEventReviewer({ role: 'user' }), false);
  });
});

describe('normalizeQuestionnairePayload', () => {
  const valid = {
    title: '  Satisfaction  ',
    description: 'Votre avis',
    questions: [
      { text: 'Note globale', type: 'rating', isRequired: true },
      { text: 'Format', type: 'single_choice', options: ['Atelier', 'Conférence', ''] },
    ],
  };

  test('accepte et normalise un questionnaire valide', () => {
    const r = normalizeQuestionnairePayload(valid);
    assert.equal(r.ok, true);
    assert.equal(r.value.title, 'Satisfaction');
    assert.equal(r.value.questions.length, 2);
    assert.deepEqual(r.value.questions[1].options, ['Atelier', 'Conférence']);
    assert.equal(r.value.questions[0].order, 1);
    assert.equal(r.value.questions[0].isRequired, true);
  });

  test('refuse titre manquant, aucune question, type inconnu, options insuffisantes ou en double', () => {
    assert.equal(normalizeQuestionnairePayload({ ...valid, title: ' ' }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...valid, questions: [] }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...valid, questions: [{ text: 'x', type: 'file' }] }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...valid, questions: [{ text: 'x', type: 'multiple_choice', options: ['a'] }] }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...valid, questions: [{ text: 'x', type: 'single_choice', options: ['a', 'a'] }] }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...valid, questions: [{ text: '', type: 'text' }] }).ok, false);
    assert.equal(normalizeQuestionnairePayload(null).ok, false);
  });

  test('conserve les identifiants de questions connus et ignore les identifiants étrangers', () => {
    const known = new mongoose.Types.ObjectId();
    const foreign = new mongoose.Types.ObjectId();
    const r = normalizeQuestionnairePayload(
      { title: 'T', questions: [{ _id: known, text: 'a' }, { _id: foreign, text: 'b' }, { _id: known, text: 'c' }] },
      [known]
    );
    assert.equal(r.ok, true);
    assert.equal(String(r.value.questions[0]._id), String(known));
    assert.notEqual(String(r.value.questions[1]._id), String(foreign));
    assert.notEqual(String(r.value.questions[2]._id), String(known));
  });
});

describe('validateEventAnswers', () => {
  const q = (text, type, extra = {}) => ({ _id: new mongoose.Types.ObjectId(), text, type, options: [], ...extra });
  const questions = [
    q('Nom', 'text', { isRequired: true }),
    q('Format', 'single_choice', { options: ['A', 'B'] }),
    q('Thèmes', 'multiple_choice', { options: ['X', 'Y'] }),
    q('Note', 'rating'),
    q('Revenir ?', 'boolean'),
    q('Date', 'date'),
  ];
  const ans = (i, value) => ({ questionId: questions[i]._id, value });

  test('accepte des réponses valides et copie le libellé', () => {
    const r = validateEventAnswers(questions, [
      ans(0, ' Ali '), ans(1, 'B'), ans(2, ['X', 'Y', 'X']), ans(3, '4'), ans(4, false), ans(5, '2026-06-01'),
    ]);
    assert.equal(r.ok, true);
    assert.equal(r.value.length, 6);
    assert.equal(r.value[0].value, 'Ali');
    assert.equal(r.value[0].questionText, 'Nom');
    assert.deepEqual(r.value[2].value, ['X', 'Y']);
    assert.equal(r.value[3].value, 4);
  });

  test('question obligatoire manquante refusée, facultative ignorée', () => {
    assert.equal(validateEventAnswers(questions, [ans(1, 'A')]).ok, false);
    const r = validateEventAnswers(questions, [ans(0, 'ok')]);
    assert.equal(r.ok, true);
    assert.equal(r.value.length, 1);
  });

  test('refuse valeurs hors options, notes hors bornes, types incorrects et questions inconnues', () => {
    assert.equal(validateEventAnswers(questions, [ans(0, 'a'), ans(1, 'C')]).ok, false);
    assert.equal(validateEventAnswers(questions, [ans(0, 'a'), ans(2, ['Z'])]).ok, false);
    assert.equal(validateEventAnswers(questions, [ans(0, 'a'), ans(3, 6)]).ok, false);
    assert.equal(validateEventAnswers(questions, [ans(0, 'a'), ans(4, 'oui')]).ok, false);
    assert.equal(validateEventAnswers(questions, [ans(0, 'a'), ans(5, 'pas une date')]).ok, false);
    assert.equal(validateEventAnswers(questions, [ans(0, 12)]).ok, false);
    assert.equal(
      validateEventAnswers(questions, [ans(0, 'a'), { questionId: new mongoose.Types.ObjectId(), value: 'x' }]).ok,
      false
    );
  });
});

describe('Calendrier de réponse (publication avant / après, date limite 72 h max)', () => {
  const {
    getResponseSchedule,
    getResponseAvailability,
    RESPONSE_WINDOW_MAX_HOURS,
  } = require('../utils/eventQuestionnaireRules');
  // Exemple de la spécification : fin le 10 novembre à 18h00 → date limite le 13 novembre à 18h00
  const end = new Date('2026-11-10T18:00:00+01:00');
  const eventData = { startDate: new Date('2026-11-10T14:00:00+01:00'), endDate: end };

  test('fin le 10 nov. 18h00 → date limite le 13 nov. 18h00 (72 h par défaut)', () => {
    const s = getResponseSchedule(eventData, { publishMode: 'after_end' });
    assert.equal(RESPONSE_WINDOW_MAX_HOURS, 72);
    assert.equal(s.closesAt.toISOString(), new Date('2026-11-13T18:00:00+01:00').toISOString());
    assert.equal(s.opensAt.getTime(), end.getTime());
  });

  test('durée plus courte : 24 h → limite le 11 nov. 18h00', () => {
    const s = getResponseSchedule(eventData, { publishMode: 'after_end', responseWindowHours: 24 });
    assert.equal(s.closesAt.toISOString(), new Date('2026-11-11T18:00:00+01:00').toISOString());
  });

  test('publication « before » : ouvert avant l’événement, fermé après la limite', () => {
    const v = { publishMode: 'before', responseWindowHours: 72 };
    assert.equal(getResponseAvailability(eventData, v, new Date('2026-11-01T00:00:00Z')).status, 'open');
    assert.equal(getResponseAvailability(eventData, v, new Date('2026-11-13T18:01:00+01:00')).status, 'closed');
  });

  test('publication « after_end » : à venir avant la fin, ouvert ensuite', () => {
    const v = { publishMode: 'after_end', responseWindowHours: 72 };
    assert.equal(getResponseAvailability(eventData, v, new Date('2026-11-10T17:00:00+01:00')).status, 'upcoming');
    assert.equal(getResponseAvailability(eventData, v, new Date('2026-11-11T09:00:00+01:00')).status, 'open');
  });

  const base = { title: 'Avis', questions: [{ text: 'Commentaire', type: 'text' }] };

  test('type « Réponse longue » refusé à la création', () => {
    const r = normalizeQuestionnairePayload({ title: 'Avis', questions: [{ text: 'Commentaire', type: 'long_text' }] });
    assert.equal(r.ok, false);
    assert.match(r.message, /Réponse longue/);
  });

  test('durée supérieure à 72 h refusée, 1 à 72 h acceptée', () => {
    assert.equal(normalizeQuestionnairePayload({ ...base, responseWindowHours: 73 }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...base, responseWindowHours: 0 }).ok, false);
    const ok = normalizeQuestionnairePayload({ ...base, publishMode: 'before', responseWindowHours: 48 });
    assert.equal(ok.ok, true);
    assert.equal(ok.value.publishMode, 'before');
    assert.equal(ok.value.responseWindowHours, 48);
  });

  test('valeurs par défaut : après la fin, 72 h ; mode inconnu refusé', () => {
    const ok = normalizeQuestionnairePayload(base);
    assert.equal(ok.value.publishMode, 'after_end');
    assert.equal(ok.value.responseWindowHours, 72);
    assert.equal(normalizeQuestionnairePayload({ ...base, publishMode: 'jamais' }).ok, false);
  });

  test('réponse longue : 5000 caractères max, réponse courte : 500', () => {
    const qid = new mongoose.Types.ObjectId();
    const long = [{ _id: qid, text: 'Commentaire', type: 'long_text', isRequired: true }];
    const short = [{ _id: qid, text: 'Nom', type: 'text', isRequired: true }];
    assert.equal(validateEventAnswers(long, [{ questionId: qid, value: 'a'.repeat(2000) }]).ok, true);
    assert.equal(validateEventAnswers(long, [{ questionId: qid, value: 'a'.repeat(5001) }]).ok, false);
    assert.equal(validateEventAnswers(short, [{ questionId: qid, value: 'a'.repeat(501) }]).ok, false);
  });
});

describe('Ouverture choisie par l’organisateur (« après la fin », 72 h max)', () => {
  const { getResponseAvailability, checkResponseSchedule, getResponseSchedule } = require('../utils/eventQuestionnaireRules');
  const end = new Date('2026-11-10T18:00:00+01:00');
  const eventData = { startDate: new Date('2026-11-10T14:00:00+01:00'), endDate: end };
  const before = new Date('2026-11-01T00:00:00Z');

  test('ouverture le 11 nov. 9h : à venir avant, ouvert après', () => {
    const v = { publishMode: 'after_end', responseWindowHours: 72, opensAt: new Date('2026-11-11T09:00:00+01:00') };
    assert.equal(checkResponseSchedule(eventData, v, before).ok, true);
    assert.equal(getResponseAvailability(eventData, v, new Date('2026-11-10T20:00:00+01:00')).status, 'upcoming');
    assert.equal(getResponseAvailability(eventData, v, new Date('2026-11-11T09:30:00+01:00')).status, 'open');
  });

  test('ouverture avant la fin ou au-delà de 72 h refusée', () => {
    const early = { publishMode: 'after_end', responseWindowHours: 72, opensAt: new Date('2026-11-10T17:00:00+01:00') };
    const late = { publishMode: 'after_end', responseWindowHours: 72, opensAt: new Date('2026-11-13T18:01:00+01:00') };
    assert.equal(checkResponseSchedule(eventData, early, before).ok, false);
    assert.equal(checkResponseSchedule(eventData, late, before).ok, false);
  });

  test('ouverture après la date limite refusée (durée trop courte)', () => {
    const v = { publishMode: 'after_end', responseWindowHours: 12, opensAt: new Date('2026-11-12T09:00:00+01:00') };
    assert.equal(checkResponseSchedule(eventData, v, before).ok, false);
  });

  test('sans date choisie : ouverture à la fin ; date stockée hors bornes ramenée dans [fin, fin + 72 h]', () => {
    assert.equal(getResponseSchedule(eventData, { publishMode: 'after_end' }).opensAt.getTime(), end.getTime());
    const s = getResponseSchedule(eventData, { publishMode: 'after_end', opensAt: new Date('2026-11-01T00:00:00Z') });
    assert.equal(s.opensAt.getTime(), end.getTime());
  });

  test('normalisation : date d’ouverture invalide refusée, ignorée en mode « avant »', () => {
    const base = { title: 'Avis', questions: [{ text: 'Q', type: 'text' }] };
    assert.equal(normalizeQuestionnairePayload({ ...base, opensAt: 'pas une date' }).ok, false);
    assert.equal(normalizeQuestionnairePayload({ ...base, publishMode: 'before', opensAt: '2026-11-11T09:00' }).value.opensAt, null);
  });
});
