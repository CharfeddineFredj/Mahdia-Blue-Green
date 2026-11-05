/**
 * Verrouillage après validation : une fois qu'un administrateur a validé et publié
 * un article / un événement (ou approuvé un questionnaire), son auteur ne peut plus le modifier.
 * Seul le staff (superadmin / moderator) peut encore intervenir.
 */
const PUBLISHED_LOCK_CODE = 'PUBLISHED_LOCKED';

const LOCK_MESSAGES = {
  article: 'Cet article a été validé et publié par un administrateur : il ne peut plus être modifié.',
  event: 'Cet événement a été validé et publié par un administrateur : il ne peut plus être modifié.',
  questionnaire: 'Des participants ont déjà répondu à ce questionnaire : il ne peut plus être modifié.',
};

/** Article / événement déjà validé et publié (ou publié au moins une fois). */
function isPostLocked(post) {
  if (!post) return false;
  return post.status === 'published' || !!post.publishedOnce;
}

/**
 * Questionnaire d'événement figé : une version approuvée ET au moins une réponse reçue.
 * Sans réponse, le créateur peut encore le modifier ; la modification repart en validation administrateur.
 */
function isQuestionnaireLocked(doc, responseCount = 0) {
  return !!doc?.approvedVersion && responseCount > 0;
}

module.exports = { PUBLISHED_LOCK_CODE, LOCK_MESSAGES, isPostLocked, isQuestionnaireLocked };
