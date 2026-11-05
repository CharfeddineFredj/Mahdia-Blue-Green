/**
 * Validation administrative des articles proposés par les utilisateurs (même principe que eventRevision.js).
 *
 * - Un nouvel article est créé en brouillon avec moderation.status = 'pending'.
 * - Une modification d'un article déjà publié est stockée dans `pendingRevision` :
 *   la version publiée (dernière version approuvée) reste en ligne jusqu'à la décision.
 */

const REVISABLE_ARTICLE_DATA_FIELDS = [
  'content',
  'summary',
  'readTime',
  'articleType',
  'tags',
  'featuredImage',
  'featuredVideo',
];

function idOf(v) {
  if (v == null) return v;
  return typeof v === 'object' && v._id != null ? v._id : v;
}

function plain(v) {
  return v && typeof v.toObject === 'function' ? v.toObject() : v;
}

/**
 * Version complète de l'article : champs fournis et non vides, sinon valeur en ligne.
 * `featuredImage` / `featuredVideo` acceptent la chaîne vide (suppression du média).
 */
function buildArticleRevision(post, { title, body, category, level, articleData } = {}) {
  const live = plain(post.articleData) || {};
  const next = {
    title: title || post.title,
    body: body || post.body,
    category: category || idOf(post.category),
    level: level || idOf(post.level),
    articleData: {},
  };
  for (const f of REVISABLE_ARTICLE_DATA_FIELDS) next.articleData[f] = live[f];

  const ad = articleData || {};
  if (ad.content) next.articleData.content = ad.content;
  if (ad.summary) next.articleData.summary = ad.summary;
  if (ad.readTime !== undefined && ad.readTime !== null && ad.readTime !== '') {
    next.articleData.readTime = Number(ad.readTime);
  }
  if (ad.articleType) next.articleData.articleType = ad.articleType;
  if (Array.isArray(ad.tags)) next.articleData.tags = ad.tags;
  if (ad.featuredImage !== undefined) next.articleData.featuredImage = ad.featuredImage;
  if (ad.featuredVideo !== undefined) next.articleData.featuredVideo = ad.featuredVideo;

  // Le corps sert de contenu si l'article n'a pas de contenu séparé
  if (!next.articleData.content && next.body) next.articleData.content = next.body;
  return { revision: next };
}

/** Applique une révision approuvée à la version en ligne (vues, réactions, notes conservées). */
function applyArticleRevision(post, revision) {
  if (!revision) return post;
  if (revision.title) post.title = revision.title;
  if (revision.body) post.body = revision.body;
  if (revision.category) post.category = revision.category;
  if (revision.level) post.level = revision.level;
  if (!post.articleData) post.articleData = {};
  const ad = revision.articleData || {};
  for (const f of REVISABLE_ARTICLE_DATA_FIELDS) {
    if (ad[f] !== undefined && ad[f] !== null) post.articleData[f] = ad[f];
  }
  return post;
}

module.exports = {
  REVISABLE_ARTICLE_DATA_FIELDS,
  buildArticleRevision,
  applyArticleRevision,
};
