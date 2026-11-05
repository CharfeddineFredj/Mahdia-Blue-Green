/**
 * Trie les questions peuplées par `order` (puis par _id) pour coller à la base.
 */
function sortQuestionnaireQuestions(q) {
  if (!q || !Array.isArray(q.questions) || q.questions.length === 0) {
    return q;
  }
  q.questions.sort((a, b) => {
    const ao = Number(a.order) || 0;
    const bo = Number(b.order) || 0;
    if (ao !== bo) return ao - bo;
    const aid = a._id != null ? String(a._id) : '';
    const bid = b._id != null ? String(b._id) : '';
    return aid.localeCompare(bid);
  });
  return q;
}

/**
 * Ajoute scheduleStatus, scheduleLabel, canSubmit à un questionnaire (objet plain ou doc Mongoose).
 */
function appendScheduleMeta(q) {
  const obj = q && typeof q.toObject === 'function' ? q.toObject() : { ...q };
  const now = Date.now();

  if (obj.isRegistrationQuestionnaire) {
    obj.scheduleStatus = 'registration';
    obj.scheduleLabel = 'Inscription';
    obj.canSubmit = false;
    return obj;
  }

  if (!obj.isActive) {
    obj.scheduleStatus = 'inactive';
    obj.scheduleLabel = 'Désactivé';
    obj.canSubmit = false;
    return obj;
  }

  const opens = obj.opensAt ? new Date(obj.opensAt).getTime() : null;
  const closes = obj.closesAt ? new Date(obj.closesAt).getTime() : null;

  if (opens && now < opens) {
    obj.scheduleStatus = 'scheduled';
    obj.scheduleLabel = 'À venir';
    obj.canSubmit = false;
  } else if (closes && now > closes) {
    obj.scheduleStatus = 'ended';
    obj.scheduleLabel = 'Terminé';
    obj.canSubmit = false;
  } else {
    obj.scheduleStatus = 'open';
    obj.scheduleLabel = 'Ouvert';
    obj.canSubmit = true;
  }

  return obj;
}

module.exports = { appendScheduleMeta, sortQuestionnaireQuestions };
