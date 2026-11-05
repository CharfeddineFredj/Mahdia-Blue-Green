const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildArticleRevision, applyArticleRevision } = require('../utils/articleRevision');

function livePost() {
  return {
    title: 'Pêche durable',
    body: '<p>Texte</p>',
    category: { _id: 'cat1' },
    level: 'lvl1',
    status: 'published',
    viewCount: 42,
    articleData: {
      content: '<p>Texte</p>',
      summary: 'Résumé',
      readTime: 3,
      tags: ['mer'],
      featuredImage: 'https://img/a.jpg',
    },
  };
}

describe('buildArticleRevision / applyArticleRevision', () => {
  test('la révision fusionne les changements sans toucher la version en ligne', () => {
    const post = livePost();
    const { revision } = buildArticleRevision(post, { title: 'Pêche durable v2', articleData: { summary: 'Nouveau résumé' } });
    assert.equal(revision.title, 'Pêche durable v2');
    assert.equal(revision.category, 'cat1');
    assert.equal(revision.articleData.summary, 'Nouveau résumé');
    assert.equal(revision.articleData.content, '<p>Texte</p>');
    assert.deepEqual(revision.articleData.tags, ['mer']);
    assert.equal(post.title, 'Pêche durable');
    assert.equal(post.articleData.summary, 'Résumé');
  });

  test('l’image peut être retirée (chaîne vide)', () => {
    const { revision } = buildArticleRevision(livePost(), { articleData: { featuredImage: '' } });
    assert.equal(revision.articleData.featuredImage, '');
  });

  test('l’approbation applique la révision et conserve les statistiques', () => {
    const post = livePost();
    const { revision } = buildArticleRevision(post, { body: '<p>Nouveau</p>', articleData: { content: '<p>Nouveau</p>' } });
    applyArticleRevision(post, revision);
    assert.equal(post.body, '<p>Nouveau</p>');
    assert.equal(post.articleData.content, '<p>Nouveau</p>');
    assert.equal(post.viewCount, 42);
  });
});
