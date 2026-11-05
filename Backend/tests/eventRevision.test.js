const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getEventReviewStatus, buildEventRevision, applyEventRevision } = require('../utils/eventRevision');

function livePost() {
  return {
    title: 'Atelier',
    body: 'Description',
    category: { _id: 'cat1', title: 'Bleue' },
    level: 'lvl1',
    status: 'published',
    eventData: {
      startDate: new Date('2026-07-01T09:00:00Z'),
      endDate: new Date('2026-07-01T12:00:00Z'),
      location: 'Mahdia',
      capacity: 50,
      eventImage: 'https://img/a.jpg',
      registeredUsers: ['u1', 'u2'],
    },
  };
}

describe('getEventReviewStatus', () => {
  test('utilise moderation.status quand présent', () => {
    assert.equal(getEventReviewStatus({ moderation: { status: 'rejected' }, status: 'draft' }), 'rejected');
  });
  test('rétrocompatibilité : publié → approuvé, sinon en attente', () => {
    assert.equal(getEventReviewStatus({ status: 'published' }), 'approved');
    assert.equal(getEventReviewStatus({ status: 'draft' }), 'pending');
  });
});

describe('buildEventRevision / applyEventRevision', () => {
  test('la révision fusionne les changements sans modifier la version en ligne', () => {
    const post = livePost();
    const { revision, datesChanged } = buildEventRevision(post, { title: 'Atelier v2', eventData: { location: 'Sousse' } });
    assert.equal(revision.title, 'Atelier v2');
    assert.equal(revision.body, 'Description');
    assert.equal(revision.category, 'cat1');
    assert.equal(revision.eventData.location, 'Sousse');
    assert.equal(revision.eventData.capacity, 50);
    assert.equal(datesChanged, false);
    // Dernière version approuvée intacte
    assert.equal(post.title, 'Atelier');
    assert.equal(post.eventData.location, 'Mahdia');
  });

  test('détecte un changement de dates (fin par défaut = début + 1 h 30)', () => {
    const post = livePost();
    const { revision, datesChanged } = buildEventRevision(post, { eventData: { startDate: '2026-07-02T09:00:00Z' } });
    assert.equal(datesChanged, true);
    assert.equal(revision.eventData.endDate.toISOString(), '2026-07-02T10:30:00.000Z');
  });

  test('mêmes dates renvoyées par le formulaire : pas de changement', () => {
    const post = livePost();
    const { datesChanged } = buildEventRevision(post, {
      eventData: { startDate: '2026-07-01T09:00:00.000Z', endDate: '2026-07-01T12:00:00.000Z' },
    });
    assert.equal(datesChanged, false);
  });

  test('l’approbation applique la révision et conserve les inscriptions', () => {
    const post = livePost();
    const { revision } = buildEventRevision(post, { title: 'Nouveau', eventData: { capacity: 80 } });
    applyEventRevision(post, revision);
    assert.equal(post.title, 'Nouveau');
    assert.equal(post.eventData.capacity, 80);
    assert.deepEqual(post.eventData.registeredUsers, ['u1', 'u2']);
  });
});
