/**
 * Tests du contrôleur des questionnaires d'événements avec modèles Mongoose bouchonnés (aucune base requise).
 */
const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Post = require('../models/Post');
const EventQuestionnaire = require('../models/EventQuestionnaire');
const EventQuestionnaireResponse = require('../models/EventQuestionnaireResponse');
const Questionnaire = require('../models/Questionnaire');
const ctrl = require('../controllers/eventQuestionnaireController');

const HOUR = 60 * 60 * 1000;
const oid = () => new mongoose.Types.ObjectId();

/** Imite une requête Mongoose chaînable et "await"-able */
function chain(result) {
  const q = {
    populate: () => q,
    sort: () => q,
    select: () => q,
    lean: () => q,
    limit: () => q,
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return q;
}

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(b) { this.body = b; return this; },
  };
}

const ownerId = oid();
const participantId = oid();
const strangerId = oid();
const owner = { _id: ownerId, id: String(ownerId), role: 'user' };
const participant = { _id: participantId, id: String(participantId), role: 'user' };
const stranger = { _id: strangerId, id: String(strangerId), role: 'user' };
const moderator = { _id: oid(), id: 'mod', role: 'moderator' };
const analyst = { _id: oid(), id: 'ana', role: 'analyst' };

let event;
let questionnaire;
let created;

function makeEvent(endOffsetMs = 24 * HOUR) {
  const end = new Date(Date.now() + endOffsetMs);
  return {
    _id: oid(),
    type: 'event',
    status: 'published',
    author: ownerId,
    eventData: {
      startDate: new Date(end.getTime() - 2 * HOUR),
      endDate: end,
      registeredUsers: [participantId],
      eventRegistrations: [{ user: participantId }],
    },
  };
}

function makeQuestionnaire(withApproved = true) {
  const qid = oid();
  const version = {
    title: 'Satisfaction',
    description: '',
    questions: [{ _id: qid, text: 'Note', type: 'rating', options: [], isRequired: true, order: 1 }],
    publishMode: 'before',
    responseWindowHours: 72,
  };
  return {
    _id: oid(),
    event: event._id,
    author: ownerId,
    approvedVersion: withApproved ? version : null,
    pendingVersion: withApproved ? null : version,
    reviewStatus: withApproved ? 'approved' : 'pending',
    rejectionReason: '',
    saved: 0,
    async save() { this.saved += 1; return this; },
  };
}

beforeEach(() => {
  event = makeEvent();
  questionnaire = makeQuestionnaire(true);
  created = [];
  mock.method(Post, 'findOne', () => chain(event));
  mock.method(EventQuestionnaire, 'findOne', () => chain(questionnaire));
  mock.method(EventQuestionnaire, 'create', async (doc) => { created.push(doc); return { _id: oid(), ...doc }; });
  mock.method(EventQuestionnaireResponse, 'findOne', () => chain(null));
  mock.method(EventQuestionnaireResponse, 'exists', async () => null);
  mock.method(EventQuestionnaireResponse, 'countDocuments', async () => 0);
  mock.method(EventQuestionnaireResponse, 'create', async (doc) => { created.push(doc); return doc; });
  mock.method(EventQuestionnaireResponse, 'find', () => chain([
    { _id: oid(), user: { _id: participantId, username: 'p', email: 'p@x.tn' }, answers: [{ value: 5 }], submittedAt: new Date() },
  ]));
});

afterEach(() => mock.restoreAll());

const call = async (handler, { user, params = {}, body = {}, query = {} }) => {
  const res = mockRes();
  await handler({ user, params: { eventId: String(event._id), ...params }, body, query }, res);
  return res;
};

const validPayload = { title: 'Retour', questions: [{ text: 'Avis ?', type: 'text' }] };

describe('Isolation des questionnaires administrateurs', () => {
  test('collection distincte de celle des questionnaires administrateurs', () => {
    assert.notEqual(EventQuestionnaire.collection.name, Questionnaire.collection.name);
  });
});

describe('Création du questionnaire (créateur, 72 h)', () => {
  test('le créateur peut créer : statut en attente de validation', async () => {
    mock.method(EventQuestionnaire, 'findOne', async () => null);
    const res = await call(ctrl.createEventQuestionnaire, { user: owner, body: validPayload });
    assert.equal(res.statusCode, 201);
    assert.equal(created[0].reviewStatus, 'pending');
    assert.equal(created[0].pendingVersion.title, 'Retour');
    assert.equal(res.body.data.approvedVersion, null);
  });

  test('un autre utilisateur ne peut pas créer', async () => {
    const res = await call(ctrl.createEventQuestionnaire, { user: stranger, body: validPayload });
    assert.equal(res.statusCode, 403);
    assert.equal(created.length, 0);
  });

  test('création refusée plus de 72 h après la fin de l’événement', async () => {
    event = makeEvent(-73 * HOUR);
    mock.method(EventQuestionnaire, 'findOne', async () => null);
    const res = await call(ctrl.createEventQuestionnaire, { user: owner, body: validPayload });
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /72 h/);
    assert.equal(created.length, 0);
  });

  test('création autorisée 71 h après la fin', async () => {
    event = makeEvent(-71 * HOUR);
    mock.method(EventQuestionnaire, 'findOne', async () => null);
    const res = await call(ctrl.createEventQuestionnaire, { user: owner, body: validPayload });
    assert.equal(res.statusCode, 201);
  });

  test('modification refusée dès que l’événement est terminé (même dans les 72 h)', async () => {
    for (const hoursAgo of [1, 71, 80]) {
      event = makeEvent(-hoursAgo * HOUR);
      const res = await call(ctrl.updateEventQuestionnaire, { user: owner, body: validPayload });
      assert.equal(res.statusCode, 403, `${hoursAgo} h après la fin`);
      assert.equal(res.body.code, 'EVENT_ENDED');
    }
    assert.equal(questionnaire.saved, 0);
  });

  test('vue créateur : canSubmit faux pour un questionnaire existant d’un événement terminé', async () => {
    event = makeEvent(-2 * HOUR);
    const res = await call(ctrl.getEventQuestionnaire, { user: owner });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ended, true);
    assert.equal(res.body.canSubmit, false);
  });

  test('questionnaire validé et déjà répondu : modification refusée', async () => {
    mock.method(EventQuestionnaireResponse, 'countDocuments', async () => 3);
    const approvedTitle = questionnaire.approvedVersion.title;
    const res = await call(ctrl.updateEventQuestionnaire, { user: owner, body: { ...validPayload, title: 'V2' } });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PUBLISHED_LOCKED');
    assert.equal(questionnaire.approvedVersion.title, approvedTitle);
  });

  test('questionnaire validé mais sans aucune réponse : modification soumise à validation admin', async () => {
    const approvedTitle = questionnaire.approvedVersion.title;
    const res = await call(ctrl.updateEventQuestionnaire, { user: owner, body: { ...validPayload, title: 'V2' } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(questionnaire.pendingVersion.title, 'V2');
    assert.equal(questionnaire.reviewStatus, 'pending');
    assert.equal(questionnaire.approvedVersion.title, approvedTitle, 'version en ligne inchangée jusqu’à validation');
  });

  test('questionnaire encore en attente : le créateur peut le corriger', async () => {
    const saved = questionnaire;
    questionnaire = makeQuestionnaire(false);
    const res = await call(ctrl.updateEventQuestionnaire, { user: owner, body: { ...validPayload, title: 'V2' } });
    assert.equal(res.statusCode, 200, JSON.stringify(res.body));
    assert.equal(questionnaire.pendingVersion.title, 'V2');
    questionnaire = saved;
  });
});

describe('Accès participant', () => {
  test('un participant inscrit voit uniquement la version approuvée, sans réponses', async () => {
    questionnaire.pendingVersion = { title: 'Brouillon caché', questions: [] };
    const res = await call(ctrl.getEventQuestionnaire, { user: participant });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.role, 'participant');
    assert.equal(res.body.data.title, 'Satisfaction');
    assert.equal(res.body.data.pendingVersion, undefined);
    assert.equal(res.body.data.responses, undefined);
  });

  test('un non-inscrit ne peut pas accéder au questionnaire', async () => {
    const res = await call(ctrl.getEventQuestionnaire, { user: stranger });
    assert.equal(res.statusCode, 403);
  });

  test('questionnaire non approuvé invisible pour les participants', async () => {
    questionnaire = makeQuestionnaire(false);
    const res = await call(ctrl.getEventQuestionnaire, { user: participant });
    assert.equal(res.statusCode, 404);
  });

  test('soumission par un inscrit : enregistrée, aucune donnée de réponse renvoyée', async () => {
    const qid = questionnaire.approvedVersion.questions[0]._id;
    const res = await call(ctrl.submitEventQuestionnaireResponse, {
      user: participant,
      body: { answers: [{ questionId: qid, value: 4 }] },
    });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data, undefined);
    assert.equal(created[0].answers[0].value, 4);
    assert.equal(String(created[0].user), String(participantId));
  });

  test('fenêtre de réponse : questionnaire « après la fin » refusé avant la fin de l’événement', async () => {
    questionnaire.approvedVersion.publishMode = 'after_end';
    const qid = questionnaire.approvedVersion.questions[0]._id;
    const view = await call(ctrl.getEventQuestionnaire, { user: participant });
    assert.equal(view.statusCode, 404, 'invisible pour les inscrits avant l’ouverture');
    assert.equal(view.body.data, undefined);
    const res = await call(ctrl.submitEventQuestionnaireResponse, {
      user: participant,
      body: { answers: [{ questionId: qid, value: 4 }] },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'QUESTIONNAIRE_NOT_OPEN');
    questionnaire.approvedVersion.publishMode = 'before';
  });

  test('fenêtre de réponse : refus après la date limite (fin + durée choisie)', async () => {
    const saved = event;
    event = makeEvent(-5 * HOUR);
    questionnaire.event = event._id;
    questionnaire.approvedVersion.responseWindowHours = 4;
    const qid = questionnaire.approvedVersion.questions[0]._id;
    const res = await call(ctrl.submitEventQuestionnaireResponse, {
      user: participant,
      body: { answers: [{ questionId: qid, value: 4 }] },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'QUESTIONNAIRE_CLOSED');
    questionnaire.approvedVersion.responseWindowHours = 72;
    event = saved;
    questionnaire.event = event._id;
  });

  test('une réponse ne peut plus être modifiée (aucun contrôleur de modification)', () => {
    assert.equal(ctrl.updateMyEventQuestionnaireResponse, undefined);
  });

  test('soumission refusée pour un non-inscrit', async () => {
    const qid = questionnaire.approvedVersion.questions[0]._id;
    const res = await call(ctrl.submitEventQuestionnaireResponse, {
      user: stranger,
      body: { answers: [{ questionId: qid, value: 4 }] },
    });
    assert.equal(res.statusCode, 403);
    assert.equal(created.length, 0);
  });

  test('double soumission refusée', async () => {
    mock.method(EventQuestionnaireResponse, 'exists', async () => ({ _id: oid() }));
    const qid = questionnaire.approvedVersion.questions[0]._id;
    const res = await call(ctrl.submitEventQuestionnaireResponse, {
      user: participant,
      body: { answers: [{ questionId: qid, value: 4 }] },
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('Confidentialité des réponses', () => {
  test('un participant ne peut pas consulter les réponses', async () => {
    const res = await call(ctrl.getEventQuestionnaireResponses, { user: participant });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.data, undefined);
  });

  test('un utilisateur quelconque ne peut pas consulter les réponses', async () => {
    const res = await call(ctrl.getEventQuestionnaireResponses, { user: stranger });
    assert.equal(res.statusCode, 403);
  });

  test('le créateur et les administrateurs autorisés consultent les réponses', async () => {
    for (const u of [owner, moderator, analyst]) {
      const res = await call(ctrl.getEventQuestionnaireResponses, { user: u });
      assert.equal(res.statusCode, 200, u.role);
      assert.equal(res.body.count, 1);
    }
  });
});

describe('Validation administrative', () => {
  test('approbation : la version en attente devient la version publiée', async () => {
    questionnaire = makeQuestionnaire(false);
    const res = await call(ctrl.adminApproveEventQuestionnaire, { user: moderator, params: { id: String(questionnaire._id) } });
    assert.equal(res.statusCode, 200);
    assert.equal(questionnaire.reviewStatus, 'approved');
    assert.equal(questionnaire.pendingVersion, null);
    assert.equal(questionnaire.approvedVersion.title, 'Satisfaction');
    assert.ok(questionnaire.approvedVersion.approvedAt instanceof Date);
  });

  test('refus avec motif : version approuvée précédente conservée', async () => {
    questionnaire.pendingVersion = { title: 'V2', questions: [] };
    const res = await call(ctrl.adminRejectEventQuestionnaire, {
      user: moderator,
      params: { id: String(questionnaire._id) },
      body: { reason: '  Questions hors sujet  ' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(questionnaire.reviewStatus, 'rejected');
    assert.equal(questionnaire.rejectionReason, 'Questions hors sujet');
    assert.equal(questionnaire.approvedVersion.title, 'Satisfaction');
  });

  test('approbation impossible sans version en attente', async () => {
    const res = await call(ctrl.adminApproveEventQuestionnaire, { user: moderator, params: { id: String(questionnaire._id) } });
    assert.equal(res.statusCode, 400);
  });
});
