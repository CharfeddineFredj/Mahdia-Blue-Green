/* Intégration : connexion par e-mail OU nom d'utilisateur (/api/auth) sur MongoDB en mémoire.
 * Run with: npm run test:integration */
const path = require('path');
const assert = require('assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server'); // devDependency

const local = (p) => require(path.join(__dirname, '..', '..', p));

const express = require('express');
const mongoose = require('mongoose');

const results = [];
const check = async (name, fn) => {
  try { await fn(); results.push(['PASS', name]); }
  catch (e) { results.push(['FAIL', name, e.message]); }
};

(async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.JWT_SECRET = 'e2e-secret';
  await mongoose.connect(mongod.getUri());

  const User = local('models/User');
  await User.syncIndexes();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', local('routes/auth'));
  app.use('/api/users', local('routes/users'));
  const server = app.listen(0);
  const root = `http://127.0.0.1:${server.address().port}/api`;
  const base = `${root}/auth`;

  const post = async (url, body) => {
    const res = await fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  const put = async (url, token, body) => {
    const res = await fetch(root + url, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  const PWD = 'Secret#2026';
  const mk = (username, email, extra = {}) => User.create({
    username, email, password: PWD, isEmailVerified: true, questionnaireCompleted: true, isActive: true, ...extra,
  });
  await mk('Ali_Dev', 'ali@e2e.tn');
  await mk('inactive_user', 'inactive@e2e.tn', { isActive: false });
  await mk('unverified', 'unverified@e2e.tn', { isEmailVerified: false });
  await mk('Sam', 'sam1@e2e.tn');
  await mk('sam', 'sam2@e2e.tn'); // ancien doublon de casse

  await check('connexion par e-mail (casse et espaces ignorés)', async () => {
    const r = await post('/login', { identifier: '  ALI@E2E.TN ', password: PWD });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.ok(r.data.token);
    assert.equal(r.data.data.username, 'Ali_Dev');
  });

  await check('connexion par nom d’utilisateur exact', async () => {
    const r = await post('/login', { identifier: 'Ali_Dev', password: PWD });
    assert.equal(r.status, 200);
    assert.ok(r.data.token);
  });

  await check('connexion par nom d’utilisateur sans tenir compte de la casse', async () => {
    const r = await post('/login', { identifier: 'ali_dev', password: PWD });
    assert.equal(r.status, 200);
  });

  await check('ancien champ « email » toujours accepté (compatibilité)', async () => {
    const r = await post('/login', { email: 'ali@e2e.tn', password: PWD });
    assert.equal(r.status, 200);
  });

  await check('mauvais mot de passe et compte inconnu : même réponse', async () => {
    const wrong = await post('/login', { identifier: 'Ali_Dev', password: 'Wrong#2026' });
    const unknown = await post('/login', { identifier: 'personne', password: PWD });
    assert.equal(wrong.status, 401);
    assert.equal(unknown.status, 401);
    assert.equal(wrong.data.message, unknown.data.message);
  });

  await check('compte désactivé : rien révélé sans le bon mot de passe', async () => {
    const wrong = await post('/login', { identifier: 'inactive_user', password: 'Wrong#2026' });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.data.email, undefined);
    const ok = await post('/login', { identifier: 'inactive_user', password: PWD });
    assert.equal(ok.status, 403);
    assert.equal(ok.data.code, 'ACCOUNT_DEACTIVATED');
    assert.equal(ok.data.email, 'inactive@e2e.tn');
  });

  await check('e-mail non vérifié via nom d’utilisateur : renvoie l’e-mail réel après mot de passe', async () => {
    const wrong = await post('/login', { identifier: 'unverified', password: 'Wrong#2026' });
    assert.equal(wrong.status, 401);
    const ok = await post('/login', { identifier: 'unverified', password: PWD });
    assert.equal(ok.status, 403);
    assert.equal(ok.data.requiresEmailVerification, true);
    assert.equal(ok.data.email, 'unverified@e2e.tn');
  });

  await check('doublon de casse historique : correspondance exacte seulement', async () => {
    assert.equal((await post('/login', { identifier: 'Sam', password: PWD })).data.data.email, 'sam1@e2e.tn');
    assert.equal((await post('/login', { identifier: 'sam', password: PWD })).data.data.email, 'sam2@e2e.tn');
    assert.equal((await post('/login', { identifier: 'SAM', password: PWD })).status, 401);
  });

  await check('identifiant non textuel ou vide refusé', async () => {
    assert.equal((await post('/login', { identifier: { $ne: null }, password: PWD })).status, 400);
    assert.equal((await post('/login', { identifier: '   ', password: PWD })).status, 400);
    assert.equal((await post('/login', { identifier: 'Ali_Dev' })).status, 400);
  });

  await check('inscription : nom avec « @ » ou espace refusé', async () => {
    assert.equal((await post('/register', { username: 'ali@x', email: 'n1@e2e.tn', password: PWD })).status, 400);
    assert.equal((await post('/register', { username: 'ali x', email: 'n2@e2e.tn', password: PWD })).status, 400);
  });

  await check('inscription : nom déjà pris (autre casse) ou e-mail déjà pris refusé', async () => {
    const r1 = await post('/register', { username: 'ALI_DEV', email: 'n3@e2e.tn', password: PWD });
    assert.equal(r1.status, 400);
    assert.match(r1.data.message, /nom d’utilisateur/);
    const r2 = await post('/register', { username: 'nouveau', email: 'ALI@e2e.tn', password: PWD });
    assert.equal(r2.status, 400);
    assert.match(r2.data.message, /e-mail/);
  });

  await check('profil : le nom d’utilisateur et l’e-mail ne sont pas modifiables par l’utilisateur', async () => {
    const login = await post('/login', { identifier: 'Ali_Dev', password: PWD });
    const { token, data: { id } } = login.data;
    const direct = await put(`/users/${id}`, token, { username: 'pirate', email: 'pirate@e2e.tn' });
    assert.equal(direct.status, 403);
    const profile = await put('/users/profile/update', token, { username: 'pirate', email: 'pirate@e2e.tn', firstName: 'Ali' });
    assert.equal(profile.status, 200, JSON.stringify(profile.data));
    const u = await User.findById(id);
    assert.equal(u.username, 'Ali_Dev');
    assert.equal(u.email, 'ali@e2e.tn');
    assert.equal(u.firstName, 'Ali');
  });

  server.close();
  await mongoose.disconnect();
  await mongod.stop();

  for (const r of results) console.log(r.join(' | '));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} scénarios OK`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
