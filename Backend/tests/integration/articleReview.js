/* Intégration : validation administrative des articles (création, modification après publication) sur MongoDB en mémoire.
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

  const app = express();
  app.use(express.json());
  app.use('/api/posts', local('routes/posts'));
  app.use('/api/articles', local('routes/articles'));
  app.use('/api/admin', local('routes/admin'));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const mk = async (username, role = 'user') => {
    const u = await User.create({ username, email: `${username}@e2e.tn`, password: 'Passw0rd!', role, questionnaireCompleted: true, isActive: true, isEmailVerified: true });
    return { u, token: jwt.sign({ id: u._id }, process.env.JWT_SECRET) };
  };
  const author = await mk('author');
  const stranger = await mk('stranger');
  const moderator = await mk('moderator', 'moderator');

  const call = async (method, url, who, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${who.token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };

  let id; let slug;

  await check('création par un utilisateur : jamais publiée directement, en attente', async () => {
    const r = await call('POST', '/posts/article', author, {
      title: 'Aquaculture à Mahdia', body: '<p>Contenu initial</p>', status: 'published',
      articleData: { content: '<p>Contenu initial</p>', summary: 'Résumé initial' },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    id = r.data.data._id; slug = r.data.data.slug;
    assert.equal(r.data.data.status, 'draft');
    assert.equal(r.data.data.moderation.status, 'pending');
    const r2 = await call('POST', '/articles', author, { title: 'Autre', body: 'x', status: 'published' });
    assert.equal(r2.data.data.status, 'draft');
  });

  await check('refus d’un nouvel article avec motif, correction → de nouveau en attente', async () => {
    const r = await call('PUT', `/admin/posts/${id}/reject`, moderator, { reason: 'Sources manquantes' });
    assert.equal(r.status, 200);
    let p = await Post.findById(id);
    assert.equal(p.moderation.status, 'rejected');
    await call('PUT', `/articles/${id}`, author, { summary: 'Résumé avec sources', status: 'published' });
    p = await Post.findById(id);
    assert.equal(p.status, 'draft', 'l’auteur ne peut pas se publier');
    assert.equal(p.moderation.status, 'pending');
    assert.equal(p.articleData.summary, 'Résumé avec sources');
  });

  await check('publication par le modérateur → approuvé', async () => {
    const r = await call('PUT', `/admin/posts/${id}/approve`, moderator, {});
    assert.equal(r.status, 200);
    const p = await Post.findById(id);
    assert.equal(p.status, 'published');
    assert.equal(p.moderation.status, 'approved');
  });

  await check('article validé et publié : l’auteur ne peut plus le modifier', async () => {
    for (const path of [`/articles/${id}`, `/posts/${id}`]) {
      const r = await call('PUT', path, author, { title: 'Aquaculture à Mahdia (mise à jour)', content: '<p>Contenu v2</p>', body: '<p>Contenu v2</p>' });
      assert.equal(r.status, 403, path);
      assert.equal(r.data.code, 'PUBLISHED_LOCKED');
    }
    const p = await Post.findById(id).select('+pendingRevision');
    assert.equal(p.title, 'Aquaculture à Mahdia');
    assert.ok(!p.pendingRevision, 'aucune révision créée');
    assert.equal(p.status, 'published');
  });

  await check('un autre utilisateur ne peut pas modifier l’article', async () => {
    assert.equal((await call('PUT', `/articles/${id}`, stranger, { title: 'pirate' })).status, 403);
    assert.equal((await call('PUT', `/posts/${id}`, stranger, { title: 'pirate' })).status, 403);
  });

  server.close();
  await mongoose.disconnect();
  await mongod.stop();

  for (const r of results) console.log(r.join(' | '));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} scénarios OK`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
