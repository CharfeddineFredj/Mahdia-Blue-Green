const Post = require('../models/Post');

/**
 * Migration idempotente : renseigne `moderation` pour les événements et articles créés avant la validation administrative.
 * - publié          → approved
 * - brouillon/autre → pending
 * Exécutée au démarrage du serveur et disponible via `npm run migrate:event-moderation`.
 */
async function ensureEventModeration() {
  const base = { type: { $in: ['event', 'article'] }, 'moderation.status': { $exists: false } };

  const approved = await Post.updateMany(
    { ...base, status: 'published' },
    { $set: { moderation: { status: 'approved', reason: '' } } }
  );
  const pending = await Post.updateMany(
    { ...base, status: { $ne: 'published' } },
    { $set: { moderation: { status: 'pending', reason: '' } } }
  );

  return {
    approved: approved.modifiedCount || 0,
    pending: pending.modifiedCount || 0,
  };
}

module.exports = ensureEventModeration;
