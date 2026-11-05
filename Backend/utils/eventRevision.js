/**
 * Validation administrative des événements proposés par les utilisateurs.
 *
 * - Un nouvel événement est créé en brouillon avec moderation.status = 'pending'.
 * - Une modification d'un événement déjà publié est stockée dans `pendingRevision` :
 *   la version publiée (dernière version approuvée) reste en ligne jusqu'à la décision.
 */

const REVISABLE_EVENT_DATA_FIELDS = [
  'startDate',
  'endDate',
  'location',
  'venue',
  'isOnline',
  'meetingLink',
  'capacity',
  'eventImage',
];

/** Statut de validation effectif (rétrocompatible avec les événements antérieurs à la fonctionnalité). */
function getEventReviewStatus(post) {
  const s = post?.moderation?.status;
  if (s === 'pending' || s === 'approved' || s === 'rejected') return s;
  return post?.status === 'published' ? 'approved' : 'pending';
}

function toTime(d) {
  if (d == null || d === '') return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

function idOf(v) {
  if (v == null) return v;
  return typeof v === 'object' && v._id != null ? v._id : v;
}

/**
 * Construit une version complète de l'événement en fusionnant les champs demandés
 * avec la version en ligne (seuls les champs fournis et non vides remplacent la valeur courante).
 */
function buildEventRevision(post, { title, body, category, level, eventData } = {}) {
  const live = post.eventData || {};
  const next = {
    title: title || post.title,
    body: body || post.body,
    category: category || idOf(post.category),
    level: level || idOf(post.level),
    eventData: {},
  };
  for (const f of REVISABLE_EVENT_DATA_FIELDS) next.eventData[f] = live[f];

  const ed = eventData || {};
  const startTouched = ed.startDate != null && ed.startDate !== '';
  const endTouched = ed.endDate != null && ed.endDate !== '';
  if (startTouched) next.eventData.startDate = new Date(ed.startDate);
  if (endTouched) next.eventData.endDate = new Date(ed.endDate);
  if (startTouched && !endTouched) {
    next.eventData.endDate = new Date(next.eventData.startDate.getTime() + 90 * 60 * 1000);
  }
  if (ed.location) next.eventData.location = ed.location;
  if (ed.venue) next.eventData.venue = ed.venue;
  if (typeof ed.isOnline === 'boolean') next.eventData.isOnline = ed.isOnline;
  if (ed.meetingLink) next.eventData.meetingLink = ed.meetingLink;
  if (ed.capacity) next.eventData.capacity = ed.capacity;
  if (ed.eventImage) next.eventData.eventImage = ed.eventImage;

  const datesChanged =
    toTime(next.eventData.startDate) !== toTime(live.startDate) ||
    toTime(next.eventData.endDate) !== toTime(live.endDate);

  return { revision: next, datesChanged };
}

/** Applique une révision approuvée à la version en ligne (inscriptions conservées). */
function applyEventRevision(post, revision) {
  if (!revision) return post;
  if (revision.title) post.title = revision.title;
  if (revision.body) post.body = revision.body;
  if (revision.category) post.category = revision.category;
  if (revision.level) post.level = revision.level;
  if (!post.eventData) post.eventData = {};
  const ed = revision.eventData || {};
  for (const f of REVISABLE_EVENT_DATA_FIELDS) {
    if (ed[f] !== undefined && ed[f] !== null) post.eventData[f] = ed[f];
  }
  return post;
}

module.exports = {
  REVISABLE_EVENT_DATA_FIELDS,
  getEventReviewStatus,
  buildEventRevision,
  applyEventRevision,
};
