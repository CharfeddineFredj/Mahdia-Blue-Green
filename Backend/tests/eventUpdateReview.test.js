/**
 * Modification d'un événement par son créateur : soumission à validation administrative.
 */
const { test, describe, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

delete process.env.OPENROUTER_API_KEY; // modération locale uniquement (aucun appel réseau)

const Post = require('../models/Post');
const { updatePost } = require('../controllers/postController');

const oid = () => new mongoose.Types.ObjectId();
const ownerId = oid();
const owner = { _id: ownerId, id: String(ownerId), role: 'user' };
const stranger = { _id: oid(), id: 'someone', role: 'user' };

function chain(result) {
  const q = {
    select: () => q,
    populate: () => q,
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

let post;

function makePost(status) {
  return {
    _id: oid(),
    type: 'event',
    title: 'Atelier pêche durable',
    body: 'Programme de la journée',
    status,
    publishedOnce: status === 'published',
    author: ownerId,
    category: 'cat',
    level: 'lvl',
    moderation: { status: status === 'published' ? 'approved' : 'rejected', reason: 'Image floue' },
    pendingRevision: null,
    eventData: {
      startDate: new Date('2030-07-01T09:00:00Z'),
      endDate: new Date('2030-07-01T12:00:00Z'),
      location: 'Mahdia',
      capacity: 50,
      eventImage: 'https://img.example/a.jpg',
    },
    saved: 0,
    async save() { this.saved += 1; return this; },
  };
}

beforeEach(() => {
  post = makePost('published');
  mock.method(Post, 'findById', () => chain(post));
});
afterEach(() => mock.restoreAll());

async function update(user, body) {
  const res = mockRes();
  await updatePost({ user, params: { id: String(post._id) }, body }, res);
  return res;
}

describe('Modification d’un événement publié', () => {
  test('validé et publié par un admin : modification refusée, rien n’est enregistré', async () => {
    const res = await update(owner, { title: 'Atelier pêche durable — v2', eventData: { location: 'Sousse' } });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PUBLISHED_LOCKED');
    assert.equal(post.title, 'Atelier pêche durable');
    assert.equal(post.eventData.location, 'Mahdia');
    assert.equal(post.pendingRevision, null);
    assert.equal(post.saved, 0);
  });

  test('article validé et publié : modification refusée', async () => {
    post = { ...makePost('published'), type: 'article', articleData: { content: 'x' } };
    const { submitOwnArticleUpdate } = require('../controllers/postController');
    const res = mockRes();
    await submitOwnArticleUpdate({ user: owner }, res, post, { title: 'Nouveau' });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'PUBLISHED_LOCKED');
    assert.equal(post.saved, 0);
  });

  test('le créateur ne peut pas changer lui-même le statut de publication', async () => {
    post = makePost('draft');
    const res = await update(owner, { status: 'published', title: 'Nouveau titre' });
    assert.equal(res.statusCode, 200);
    assert.equal(post.status, 'draft');
    assert.equal(post.moderation.status, 'pending');
  });

  test('un autre utilisateur ne peut pas modifier l’événement', async () => {
    const res = await update(stranger, { title: 'Pirate' });
    assert.equal(res.statusCode, 403);
    assert.equal(post.saved, 0);
  });
});

describe('Modification d’un événement non publié (refusé)', () => {
  test('appliquée au brouillon, repasse en attente et efface le motif de refus', async () => {
    post = makePost('draft');
    const res = await update(owner, { body: 'Programme corrigé' });
    assert.equal(res.statusCode, 200);
    assert.equal(post.body, 'Programme corrigé');
    assert.equal(post.moderation.status, 'pending');
    assert.equal(post.moderation.reason, '');
    assert.equal(post.pendingRevision, null);
  });
});
