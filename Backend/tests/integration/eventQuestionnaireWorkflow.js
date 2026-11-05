/* Intégration : parcours complet Panier Pro (événements, validation, questionnaires, 72 h, confidentialité) sur MongoDB en mémoire.
 * Run with: npm run test:integration */
const path = require('path');
const assert = require('assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server'); // devDependency

const local = (p) => require(path.join(__dirname, '..', '..', p));

const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message]); }
};

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.JWT_SECRET = 'e2e-secret';
  delete process.env.OPENROUTER_API_KEY;
  await mongoose.connect(mongod.getUri());

  const User = local('models/User');
  const Post = local('models/Post');
  const Category = local('models/Category');
  const Level = local('models/Level');
  const EventQuestionnaire = local('models/EventQuestionnaire');
  const ensureEventModeration = local('utils/ensureEventModeration');

  const app = express();
  app.use(express.json());
  app.use('/api/posts', local('routes/posts'));
  app.use('/api/events', local('routes/events'));
  app.use('/api/questionnaires', local('routes/questionnaire'));
  app.use('/api/event-questionnaires', local('routes/eventQuestionnaires'));
  app.use('/api/admin', local('routes/admin'));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const mk = async (username, role = 'user') => {
    const u = await User.create({ username, email: `${username}@e2e.tn`, password: 'Passw0rd!', role, questionnaireCompleted: true, isActive: true, isEmailVerified: true });
    return { u, token: jwt.sign({ id: u._id }, process.env.JWT_SECRET) };
  };
  const owner = await mk('owner');
  const participant = await mk('participant');
  const stranger = await mk('stranger');
  const moderator = await mk('moderator', 'moderator');
  const analyst = await mk('analyst', 'analyst');
  const cat = await Category.create({ title: 'Économie Bleue' });
  const lvl = await Level.create({ level: 1, name: 'Débutant' });

  const call = async (method, url, who, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${who.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data };
  };

  const day = 24 * 3600 * 1000;
  const start = new Date(Date.now() + 3 * day);
  const end = new Date(start.getTime() + 3 * 3600 * 1000);
  const eventBody = (title) => ({
    title, body: 'Une journée sur la pêche durable à Mahdia', category: cat._id, level: lvl._id,
    eventData: { startDate: start.toISOString(), endDate: end.toISOString(), location: 'Mahdia', capacity: 30, eventImage: 'https://example.com/a.jpg' },
  });

  let eventId; let questionnaireId; let qid;

  await check('création événement + questionnaire facultatif → en attente', async () => {
    const r = await call('POST', '/posts/event', owner, {
      ...eventBody('Atelier pêche durable'),
      status: 'published',
      questionnaire: { title: 'Votre avis', publishMode: 'before', responseWindowHours: 72, questions: [{ text: 'Note globale', type: 'rating', isRequired: true }, { text: 'Format', type: 'single_choice', options: ['Atelier', 'Visite'] }] },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    eventId = r.data.data._id;
    assert.equal(r.data.data.status, 'draft');
    assert.equal(r.data.data.moderation.status, 'pending');
    assert.equal(r.data.questionnaire.created, true);
    assert.equal(r.data.questionnaire.reviewStatus, 'pending');
  });

  await check('questionnaire invalide → aucun événement créé', async () => {
    const before = await Post.countDocuments({ type: 'event' });
    const r = await call('POST', '/posts/event', owner, { ...eventBody('Invalide'), questionnaire: { title: '', questions: [] } });
    assert.equal(r.status, 400);
    assert.equal(await Post.countDocuments({ type: 'event' }), before);
  });

  await check('participant non inscrit → 403 sur le questionnaire', async () => {
    const r = await call('GET', `/event-questionnaires/event/${eventId}`, participant);
    assert.equal(r.status, 403);
  });

  await check('modérateur publie l’événement → approuvé', async () => {
    const r = await call('PUT', `/admin/posts/${eventId}/approve`, moderator, {});
    assert.equal(r.status, 200);
    const p = await Post.findById(eventId);
    assert.equal(p.status, 'published');
    assert.equal(p.moderation.status, 'approved');
  });

  await check('un utilisateur simple ne peut pas valider', async () => {
    const r = await call('PUT', `/admin/posts/${eventId}/approve`, owner, {});
    assert.equal(r.status, 403);
    const r2 = await call('GET', '/event-questionnaires/admin/list', analyst);
    assert.equal(r2.status, 403);
  });

  await check('inscription participant', async () => {
    const r = await call('POST', `/posts/${eventId}/register`, participant, { phone: '22123456', address: 'Mahdia' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
  });

  await check('« Mes inscriptions » : événement listé, paginé, sans coordonnées des autres inscrits', async () => {
    const other = await mk('other_participant');
    const reg = await call('POST', `/posts/${eventId}/register`, other, { phone: '99000000', address: 'Sousse' });
    assert.equal(reg.status, 200);
    const r = await call('GET', '/events/user/registered?page=1&limit=5', participant);
    assert.equal(r.status, 200);
    assert.equal(r.data.total, 1);
    const item = r.data.data[0];
    assert.equal(String(item._id), String(eventId));
    assert.ok(item.registeredAt, 'date d’inscription de l’utilisateur');
    assert.equal(item.isPast, false);
    const raw = JSON.stringify(r.data);
    assert.ok(!raw.includes('99000000') && !raw.includes('22123456'), 'aucun téléphone exposé');
    assert.equal(item.eventData, undefined);
    const none = await call('GET', '/events/user/registered', stranger);
    assert.equal(none.data.total, 0);
  });

  await check('questionnaire non approuvé invisible pour le participant', async () => {
    const r = await call('GET', `/event-questionnaires/event/${eventId}`, participant);
    assert.equal(r.status, 404);
  });

  await check('modérateur liste et approuve le questionnaire', async () => {
    const list = await call('GET', '/event-questionnaires/admin/list?status=pending', moderator);
    assert.equal(list.status, 200);
    assert.equal(list.data.count, 1);
    questionnaireId = list.data.data[0]._id;
    const r = await call('PUT', `/event-questionnaires/admin/${questionnaireId}/approve`, moderator, {});
    assert.equal(r.status, 200);
    assert.equal(r.data.data.reviewStatus, 'approved');
  });

  await check('participant voit la version approuvée et répond une seule fois', async () => {
    const g = await call('GET', `/event-questionnaires/event/${eventId}`, participant);
    assert.equal(g.status, 200);
    assert.equal(g.data.role, 'participant');
    assert.equal(g.data.data.title, 'Votre avis');
    assert.equal(g.data.data.pendingVersion, undefined);
    assert.equal(g.data.data.availability, 'open', 'publié « avant l’événement » : ouvert dès la validation');
    assert.equal(new Date(g.data.data.closesAt).getTime(), end.getTime() + 72 * 3600 * 1000, 'limite = fin + 72 h');
    qid = g.data.data.questions[0]._id;
    const qid2 = g.data.data.questions[1]._id;
    const bad = await call('POST', `/event-questionnaires/event/${eventId}/responses`, participant, { answers: [{ questionId: qid2, value: 'Atelier' }] });
    assert.equal(bad.status, 400, 'question obligatoire manquante');
    const s = await call('POST', `/event-questionnaires/event/${eventId}/responses`, participant, { answers: [{ questionId: qid, value: 5 }, { questionId: qid2, value: 'Visite' }] });
    assert.equal(s.status, 201, JSON.stringify(s.data));
    assert.equal(s.data.data, undefined);
    const again = await call('POST', `/event-questionnaires/event/${eventId}/responses`, participant, { answers: [{ questionId: qid, value: 4 }] });
    assert.equal(again.status, 400);
    const part = await call('GET', '/event-questionnaires/participating', participant);
    assert.equal(part.data.data[0].hasResponded, true);
  });

  await check('non-inscrit ne peut pas répondre', async () => {
    const r = await call('POST', `/event-questionnaires/event/${eventId}/responses`, stranger, { answers: [{ questionId: qid, value: 3 }] });
    assert.equal(r.status, 403);
  });

  await check('« Voir mes réponses » : le participant lit sa seule réponse, sans possibilité de la modifier', async () => {
    const mine = await call('GET', `/event-questionnaires/event/${eventId}/my-response`, participant);
    assert.equal(mine.status, 200, JSON.stringify(mine.data));
    assert.equal(mine.data.data.answers.length, 2);
    assert.equal(mine.data.data.answers.find((a) => String(a.questionId) === String(qid)).value, 5);
    assert.ok(mine.data.data.answers[0].questionText, 'libellé de la question renvoyé');
    assert.equal(mine.data.data.user, undefined);
    assert.equal(mine.data.data.canEdit, undefined, 'aucune modification proposée');
    assert.equal((await call('GET', `/event-questionnaires/event/${eventId}/my-response`, stranger)).status, 404);
    assert.equal((await call('GET', `/event-questionnaires/event/${eventId}/my-response`)).status, 401);
    // La route de modification n’existe plus : même le participant ne peut pas changer sa réponse
    const upd = await call('PUT', `/event-questionnaires/event/${eventId}/responses`, participant, { answers: [{ questionId: qid, value: 3 }] });
    assert.equal(upd.status, 404, JSON.stringify(upd.data));
    const after = await call('GET', `/event-questionnaires/event/${eventId}/my-response`, participant);
    assert.equal(after.data.data.answers.find((a) => String(a.questionId) === String(qid)).value, 5, 'réponse inchangée');
    assert.equal(after.data.data.editedAt, null);
  });

  await check('confidentialité : réponses réservées au créateur et aux admins', async () => {
    assert.equal((await call('GET', `/event-questionnaires/event/${eventId}/responses`, participant)).status, 403);
    assert.equal((await call('GET', `/event-questionnaires/event/${eventId}/responses`, stranger)).status, 403);
    assert.equal((await call('GET', `/event-questionnaires/event/${eventId}/responses`)).status, 401);
    for (const who of [owner, moderator, analyst]) {
      const r = await call('GET', `/event-questionnaires/event/${eventId}/responses`, who);
      assert.equal(r.status, 200);
      assert.equal(r.data.count, 1);
      assert.equal(r.data.data[0].answers[0].value, 5);
      assert.equal(r.data.data[0].user.phone, '22123456', 'téléphone d’inscription du participant');
      assert.equal(r.data.data[0].user.email, 'participant@e2e.tn');
    }
    const mine = await call('GET', '/event-questionnaires/mine', owner);
    assert.equal(mine.data.data[0].responseCount, 1);
  });

  await check('événement validé et publié : le créateur ne peut plus le modifier', async () => {
    for (const path of [`/posts/${eventId}`, `/events/${eventId}`]) {
      const r = await call('PUT', path, owner, { title: 'Atelier pêche durable — édition 2', eventData: { location: 'Sousse' } });
      assert.equal(r.status, 403, path);
      assert.equal(r.data.code, 'PUBLISHED_LOCKED');
    }
    const p = await Post.findById(eventId).select('+pendingRevision');
    assert.equal(p.title, 'Atelier pêche durable');
    assert.equal(p.eventData.location, 'Mahdia');
    assert.ok(!p.pendingRevision, 'aucune révision créée');
    assert.equal(p.status, 'published');
  });

  await check('questionnaire validé : le créateur ne peut plus le modifier', async () => {
    const r = await call('PUT', `/event-questionnaires/event/${eventId}`, owner, { title: 'Votre avis (v2)', questions: [{ _id: qid, text: 'Note globale', type: 'rating', isRequired: true }] });
    assert.equal(r.status, 403);
    assert.equal(r.data.code, 'PUBLISHED_LOCKED');
    const mine = await call('GET', '/event-questionnaires/mine', owner);
    const row = mine.data.data.find((x) => String(x.event) === String(eventId));
    assert.equal(row.locked, true);
    assert.equal(row.canSubmit, false);
    const g = await call('GET', `/event-questionnaires/event/${eventId}`, participant);
    assert.equal(g.data.data.title, 'Votre avis');
  });

  await check('le staff peut toujours corriger un événement publié', async () => {
    const r = await call('PUT', `/posts/${eventId}`, moderator, { title: 'Atelier pêche durable (corrigé)' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal((await Post.findById(eventId)).title, 'Atelier pêche durable (corrigé)');
  });

  await check('refus d’un nouvel événement avec motif, puis correction → de nouveau en attente', async () => {
    const c = await call('POST', '/posts/event', owner, eventBody('Événement à refuser'));
    const id = c.data.data._id;
    const r = await call('PUT', `/admin/posts/${id}/reject`, moderator, { reason: 'Description insuffisante' });
    assert.equal(r.status, 200);
    let p = await Post.findById(id);
    assert.equal(p.moderation.status, 'rejected');
    assert.equal(p.moderation.reason, 'Description insuffisante');
    assert.equal(p.status, 'draft');
    await call('PUT', `/posts/${id}`, owner, { body: 'Description détaillée et complète du programme' });
    p = await Post.findById(id);
    assert.equal(p.moderation.status, 'pending');
    assert.equal(p.moderation.reason, '');
  });

  await check('règle des 72 h appliquée par événement', async () => {
    const c1 = await call('POST', '/posts/event', owner, eventBody('Passé +73h'));
    const c2 = await call('POST', '/posts/event', owner, eventBody('Passé +71h'));
    const h = 3600 * 1000;
    await Post.updateOne({ _id: c1.data.data._id }, { $set: { 'eventData.startDate': new Date(Date.now() - 76 * h), 'eventData.endDate': new Date(Date.now() - 73 * h) } });
    await Post.updateOne({ _id: c2.data.data._id }, { $set: { 'eventData.startDate': new Date(Date.now() - 74 * h), 'eventData.endDate': new Date(Date.now() - 71 * h) } });
    const payload = { title: 'Bilan', questions: [{ text: 'Commentaire', type: 'text' }] };
    const late = await call('POST', `/event-questionnaires/event/${c1.data.data._id}`, owner, payload);
    assert.equal(late.status, 400);
    assert.match(late.data.message, /72 h/);
    const ok = await call('POST', `/event-questionnaires/event/${c2.data.data._id}`, owner, payload);
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
    const mine = await call('GET', '/event-questionnaires/mine', owner);
    const m1 = mine.data.data.find((x) => String(x.event) === c1.data.data._id);
    const m2 = mine.data.data.find((x) => String(x.event) === c2.data.data._id);
    assert.equal(m1.canSubmit, false);
    // Questionnaire créé pour un événement terminé : il est désormais figé
    assert.equal(m2.canSubmit, false);
    assert.equal(m2.ended, true);
  });

  // « Après la fin » : l'événement est créé d'abord, le questionnaire est créé ensuite depuis le panier
  const createEventThenQuestionnaire = async (title, questionnaire) => {
    const ev = await call('POST', '/posts/event', owner, eventBody(title));
    if (ev.status !== 201) return ev;
    return call('POST', `/event-questionnaires/event/${ev.data.data._id}`, owner, questionnaire);
  };

  await check('calendrier : « après la fin » fermé avant la fin, ouvert ensuite, clos après la limite choisie', async () => {
    const atCreation = await call('POST', '/posts/event', owner, {
      ...eventBody('Après la fin à la création'),
      questionnaire: { title: 'Avis', publishMode: 'after_end', questions: [{ text: 'y' }] },
    });
    assert.equal(atCreation.status, 400, '« après la fin » refusé à la création de l’événement');
    const c = await createEventThenQuestionnaire('Avis après coup', {
      title: 'Avis', publishMode: 'after_end', responseWindowHours: 24, questions: [{ text: 'Commentaire', type: 'text', isRequired: true }],
    });
    const longRefused = await call('POST', '/posts/event', owner, { ...eventBody('Réponse longue'), questionnaire: { title: 'x', questions: [{ text: 'y', type: 'long_text' }] } });
    assert.equal(longRefused.status, 400, 'type « Réponse longue » refusé');
    assert.equal(c.status, 201, JSON.stringify(c.data));
    const evId = c.data.data.event;
    assert.equal((await call('POST', '/posts/event', owner, { ...eventBody('Trop long'), questionnaire: { title: 'x', responseWindowHours: 96, questions: [{ text: 'y' }] } })).status, 400, 'durée > 72 h refusée');
    assert.equal((await call('PUT', `/admin/posts/${evId}/approve`, moderator, {})).status, 200);
    const eq = await EventQuestionnaire.findOne({ event: evId });
    assert.equal((await call('PUT', `/event-questionnaires/admin/${eq._id}/approve`, moderator, {})).status, 200);
    await Post.updateOne({ _id: evId }, { $push: { 'eventData.registeredUsers': participant.u._id, 'eventData.eventRegistrations': { user: participant.u._id, phone: '22123456' } } });
    // Avant l'ouverture : invisible pour l'inscrit (page de l'événement et Panier Pro)
    const g = await call('GET', `/event-questionnaires/event/${evId}`, participant);
    assert.equal(g.status, 404);
    assert.equal(g.data.data, undefined);
    const list = await call('GET', '/event-questionnaires/participating', participant);
    assert.ok(!list.data.data.some((x) => String(x.event) === String(evId)), 'absent de « Questionnaires de mes événements »');
    assert.ok(list.data.nextOpensAt, 'prochaine ouverture communiquée (sans contenu)');
    const q = (await EventQuestionnaire.findOne({ event: evId })).approvedVersion.questions[0]._id;
    const early = await call('POST', `/event-questionnaires/event/${evId}/responses`, participant, { answers: [{ questionId: q, value: 'Très bien' }] });
    assert.equal(early.status, 400);
    assert.equal(early.data.code, 'QUESTIONNAIRE_NOT_OPEN');
    // Fin il y a 30 h, durée choisie 24 h → clos
    await Post.updateOne({ _id: evId }, { $set: { 'eventData.startDate': new Date(Date.now() - 33 * 3600 * 1000), 'eventData.endDate': new Date(Date.now() - 30 * 3600 * 1000) } });
    const late = await call('POST', `/event-questionnaires/event/${evId}/responses`, participant, { answers: [{ questionId: q, value: 'Très bien' }] });
    assert.equal(late.data.code, 'QUESTIONNAIRE_CLOSED');
    // Ouverture choisie au-delà de 72 h après la fin → refusée à la création
    const tooLate = await createEventThenQuestionnaire('Ouverture trop tardive', { title: 'x', publishMode: 'after_end', opensAt: new Date(end.getTime() + 73 * 3600 * 1000).toISOString(), questions: [{ text: 'y' }] });
    assert.equal(tooLate.status, 400);
    const okOpen = await createEventThenQuestionnaire('Ouverture le lendemain', { title: 'x', publishMode: 'after_end', opensAt: new Date(end.getTime() + 15 * 3600 * 1000).toISOString(), questions: [{ text: 'y' }] });
    assert.equal(okOpen.status, 201, JSON.stringify(okOpen.data));
    // Fin il y a 2 h → ouvert et visible
    await Post.updateOne({ _id: evId }, { $set: { 'eventData.startDate': new Date(Date.now() - 5 * 3600 * 1000), 'eventData.endDate': new Date(Date.now() - 2 * 3600 * 1000) } });
    assert.equal((await call('GET', `/event-questionnaires/event/${evId}`, participant)).status, 200);
    const ok = await call('POST', `/event-questionnaires/event/${evId}/responses`, participant, { answers: [{ questionId: q, value: 'Très bien organisé. '.repeat(10) }] });
    assert.equal(ok.status, 201, JSON.stringify(ok.data));
  });

  await check('date d’ouverture choisie : enregistrée, conservée à la validation, respectée pour l’inscrit', async () => {
    const c = await createEventThenQuestionnaire('Ouverture programmée', {
      title: 'Bilan', publishMode: 'after_end', opensAt: new Date(end.getTime() + 15 * 3600 * 1000).toISOString(), responseWindowHours: 72, questions: [{ text: 'Avis', type: 'text' }],
    });
    assert.equal(c.status, 201, JSON.stringify(c.data));
    const evId = c.data.data.event;
    const saved = await EventQuestionnaire.findOne({ event: evId });
    assert.equal(saved.pendingVersion.opensAt.getTime(), end.getTime() + 15 * 3600 * 1000, 'date d’ouverture enregistrée');
    await call('PUT', `/admin/posts/${evId}/approve`, moderator, {});
    await call('PUT', `/event-questionnaires/admin/${saved._id}/approve`, moderator, {});
    const approved = await EventQuestionnaire.findOne({ event: evId });
    assert.equal(approved.approvedVersion.publishMode, 'after_end');
    assert.ok(approved.approvedVersion.opensAt, 'date d’ouverture conservée après validation');
    await Post.updateOne({ _id: evId }, { $push: { 'eventData.registeredUsers': participant.u._id } });
    const visible = async () => (await call('GET', `/event-questionnaires/event/${evId}`, participant)).status === 200;
    const inList = async () => (await call('GET', '/event-questionnaires/participating', participant)).data.data.some((x) => String(x.event) === String(evId));
    // Événement terminé il y a 2 h, ouverture prévue 15 h après la fin → toujours invisible
    await Post.updateOne({ _id: evId }, { $set: { 'eventData.startDate': new Date(Date.now() - 5 * 3600 * 1000), 'eventData.endDate': new Date(Date.now() - 2 * 3600 * 1000) } });
    await EventQuestionnaire.updateOne({ _id: saved._id }, { $set: { 'approvedVersion.opensAt': new Date(Date.now() + 13 * 3600 * 1000) } });
    assert.equal(await visible(), false, 'fin passée mais heure d’ouverture pas atteinte : invisible');
    assert.equal(await inList(), false);
    // Heure d’ouverture atteinte → visible
    await EventQuestionnaire.updateOne({ _id: saved._id }, { $set: { 'approvedVersion.opensAt': new Date(Date.now() - 60 * 1000) } });
    assert.equal(await visible(), true, 'visible dès l’heure d’ouverture');
    assert.equal(await inList(), true);
  });

  await check('événement terminé : ni l’événement ni le questionnaire ne sont modifiables', async () => {
    const c = await call('POST', '/posts/event', owner, eventBody('Terminé hier'));
    const evId = c.data.data._id;
    await Post.updateOne({ _id: evId }, { $set: { status: 'published', 'eventData.startDate': new Date(Date.now() - 30 * 3600 * 1000), 'eventData.endDate': new Date(Date.now() - 26 * 3600 * 1000) } });
    const editEvent = await call('PUT', `/posts/${evId}`, owner, { title: 'Nouveau titre' });
    assert.equal(editEvent.status, 403);
    assert.equal(editEvent.data.code, 'EVENT_ENDED');
    const editEvent2 = await call('PUT', `/events/${evId}`, owner, { title: 'Nouveau titre' });
    assert.equal(editEvent2.status, 403, 'même règle sur /api/events');
    const create = await call('POST', `/event-questionnaires/event/${evId}`, owner, { title: 'Bilan', questions: [{ text: 'Avis', type: 'text' }] });
    assert.equal(create.status, 201, 'création encore possible dans les 72 h');
    const editQ = await call('PUT', `/event-questionnaires/event/${evId}`, owner, { title: 'Bilan v2', questions: [{ text: 'Avis', type: 'text' }] });
    assert.equal(editQ.status, 403);
    assert.equal(editQ.data.code, 'EVENT_ENDED');
    const p = await Post.findById(evId);
    assert.notEqual(p.title, 'Nouveau titre');
  });

  await check('un autre utilisateur ne peut ni créer ni modifier le questionnaire', async () => {
    assert.equal((await call('POST', `/event-questionnaires/event/${eventId}`, stranger, { title: 'x', questions: [{ text: 'y' }] })).status, 403);
    assert.equal((await call('PUT', `/event-questionnaires/event/${eventId}`, stranger, { title: 'x', questions: [{ text: 'y' }] })).status, 403);
    assert.equal((await call('PUT', `/posts/${eventId}`, stranger, { title: 'pirate' })).status, 403);
  });

  await check('questionnaires administrateurs inchangés et isolés', async () => {
    const r = await call('GET', '/questionnaires');
    assert.equal(r.status, 200);
    assert.equal((r.data.data || []).length, 0, 'aucun questionnaire d’événement exposé dans /api/questionnaires');
    const pending = await call('GET', '/questionnaires/user/pending', participant);
    assert.equal(pending.status, 200);
  });

  await check('migration : événement historique sans moderation → approuvé', async () => {
    const legacy = await Post.collection.insertOne({ type: 'event', title: 'Ancien', body: 'x', status: 'published', author: owner.u._id, isDeleted: false, eventData: { startDate: new Date(), endDate: new Date() } });
    const legacyDraft = await Post.collection.insertOne({ type: 'event', title: 'Ancien brouillon', body: 'x', status: 'draft', author: owner.u._id, isDeleted: false });
    const out = await ensureEventModeration();
    assert.equal(out.approved, 1);
    assert.equal(out.pending, 1);
    assert.equal((await Post.findById(legacy.insertedId)).moderation.status, 'approved');
    assert.equal((await Post.findById(legacyDraft.insertedId)).moderation.status, 'pending');
    const again = await ensureEventModeration();
    assert.equal(again.approved + again.pending, 0, 'idempotente');
  });

  server.close();
  await mongoose.disconnect();
  await mongod.stop();

  for (const r of results) console.log(r.join(' | '));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} scénarios OK`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
