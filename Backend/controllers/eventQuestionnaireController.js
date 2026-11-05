const mongoose = require('mongoose');
const Post = require('../models/Post');
const EventQuestionnaire = require('../models/EventQuestionnaire');
const EventQuestionnaireResponse = require('../models/EventQuestionnaireResponse');
require('../models/PersonalInfo'); // modèle requis pour peupler le téléphone du profil
const { isUserRegistered } = require('../utils/eventRegistration');
const {
  checkQuestionnaireWindow,
  getQuestionnaireDeadline,
  EVENT_ENDED_MESSAGE,
  isEventEnded,
  canOwnerSubmitQuestionnaire,
  getResponseAvailability,
  checkResponseSchedule,
  isEventOwner,
  isEventReviewer,
  canViewEventResponses,
  normalizeQuestionnairePayload,
  validateEventAnswers,
  normalizeReason,
} = require('../utils/eventQuestionnaireRules');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(String(id));

function findEvent(eventId) {
  if (!isObjectId(eventId)) return Promise.resolve(null);
  return Post.findOne({ _id: eventId, type: 'event', isDeleted: false });
}

function findQuestionnaireForEvent(eventId) {
  return EventQuestionnaire.findOne({ event: eventId, isDeleted: false });
}

function publicQuestions(version) {
  return (version?.questions || [])
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((q) => ({
      _id: q._id,
      text: q.text,
      type: q.type,
      options: q.options || [],
      isRequired: !!q.isRequired,
      order: q.order,
    }));
}

/** Vue complète réservée au créateur et aux administrateurs (jamais de réponses ici). */
function ownerView(doc, extra = {}) {
  const o = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    _id: o._id,
    event: o.event,
    reviewStatus: o.reviewStatus,
    rejectionReason: o.rejectionReason || '',
    reviewedAt: o.reviewedAt || null,
    approvedVersion: o.approvedVersion
      ? { ...o.approvedVersion, questions: publicQuestions(o.approvedVersion) }
      : null,
    pendingVersion: o.pendingVersion
      ? { ...o.pendingVersion, questions: publicQuestions(o.pendingVersion) }
      : null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    ...extra,
  };
}

/**
 * Vue participant : uniquement la dernière version approuvée, avec sa disponibilité
 * (à venir / ouverte / close) et la date limite de réponse.
 */
function participantView(doc, eventData, extra = {}) {
  const v = doc.approvedVersion;
  const availability = getResponseAvailability(eventData, v);
  return {
    _id: doc._id,
    event: doc.event,
    title: v.title,
    description: v.description || '',
    questions: publicQuestions(v),
    availability: availability.status,
    opensAt: availability.opensAt,
    closesAt: availability.closesAt,
    ...extra,
  };
}

const { PUBLISHED_LOCK_CODE, LOCK_MESSAGES, isQuestionnaireLocked } = require('../utils/publishedLock');

const formatFr = (d) => new Date(d).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Tunis' });

/**
 * Crée un questionnaire en attente de validation pour un événement (utilisé aussi à la création de l'événement).
 * @returns {Promise<{ ok: true, doc } | { ok: false, status: number, message: string }>}
 */
async function createPendingQuestionnaire(event, userId, payload, now = new Date()) {
  const windowCheck = checkQuestionnaireWindow(event.eventData, now);
  if (!windowCheck.ok) return { ok: false, status: 400, message: windowCheck.message };

  const normalized = normalizeQuestionnairePayload(payload);
  if (!normalized.ok) return { ok: false, status: 400, message: normalized.message };

  // Ouverture entre la fin et fin + 72 h, avant la date limite ; date limite non dépassée
  const scheduleCheck = checkResponseSchedule(event.eventData, normalized.value, now);
  if (!scheduleCheck.ok) return { ok: false, status: 400, message: scheduleCheck.message };

  const existing = await EventQuestionnaire.findOne({ event: event._id });
  if (existing && !existing.isDeleted) {
    return { ok: false, status: 409, message: 'Un questionnaire existe déjà pour cet événement.' };
  }

  const version = { ...normalized.value, submittedAt: now };
  if (existing) {
    existing.isDeleted = false;
    existing.author = userId;
    existing.approvedVersion = null;
    existing.pendingVersion = version;
    existing.reviewStatus = 'pending';
    existing.rejectionReason = '';
    existing.reviewedAt = undefined;
    existing.reviewedBy = undefined;
    await existing.save();
    return { ok: true, doc: existing };
  }

  const doc = await EventQuestionnaire.create({
    event: event._id,
    author: userId,
    pendingVersion: version,
    reviewStatus: 'pending',
  });
  return { ok: true, doc };
}

// @desc    Questionnaires des événements du créateur (Panier Pro)
// @route   GET /api/event-questionnaires/mine
// @access  Private (User)
exports.getMyEventQuestionnaires = async (req, res) => {
  try {
    const events = await Post.find({ author: req.user.id, type: 'event', isDeleted: false })
      .select('_id eventData.startDate eventData.endDate')
      .lean();
    const eventIds = events.map((e) => e._id);

    const [docs, counts] = await Promise.all([
      EventQuestionnaire.find({ event: { $in: eventIds }, isDeleted: false }),
      EventQuestionnaireResponse.aggregate([
        { $match: { event: { $in: eventIds } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
    ]);

    const countByEvent = new Map(counts.map((c) => [String(c._id), c.count]));
    const byEvent = new Map(docs.map((d) => [String(d.event), d]));

    const data = events.map((e) => {
      const doc = byEvent.get(String(e._id));
      const responseCount = countByEvent.get(String(e._id)) || 0;
      const locked = isQuestionnaireLocked(doc, responseCount);
      return {
        event: e._id,
        deadline: getQuestionnaireDeadline(e.eventData),
        ended: isEventEnded(e.eventData),
        locked,
        canSubmit: !locked && canOwnerSubmitQuestionnaire(e.eventData, !!doc),
        questionnaire: doc ? ownerView(doc) : null,
        responseCount,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event questionnaires',
      error: error.message,
    });
  }
};

// @desc    Questionnaires approuvés des événements auxquels l'utilisateur est inscrit
// @route   GET /api/event-questionnaires/participating
// @access  Private (User)
exports.getParticipatingQuestionnaires = async (req, res) => {
  try {
    const events = await Post.find({
      type: 'event',
      status: 'published',
      isDeleted: false,
      $or: [
        { 'eventData.registeredUsers': req.user.id },
        { 'eventData.eventRegistrations.user': req.user.id },
      ],
    })
      .select('_id title eventNumber slug eventData.startDate eventData.endDate')
      .lean();

    const eventIds = events.map((e) => e._id);
    const docs = await EventQuestionnaire.find({
      event: { $in: eventIds },
      isDeleted: false,
      approvedVersion: { $ne: null },
    });
    const responded = await EventQuestionnaireResponse.find({
      user: req.user.id,
      questionnaire: { $in: docs.map((d) => d._id) },
    }).select('questionnaire submittedAt').lean();
    const respondedMap = new Map(responded.map((r) => [String(r.questionnaire), r.submittedAt]));
    const eventMap = new Map(events.map((e) => [String(e._id), e]));

    // « Après la fin de l'événement » : invisible pour les inscrits tant qu'il n'est pas ouvert.
    // Seule la prochaine heure d'ouverture est renvoyée (sans contenu) pour allumer l'indicateur à temps.
    const now = Date.now();
    let nextOpensAt = null;
    const visibleDocs = docs.filter((d) => {
      const e = eventMap.get(String(d.event));
      const availability = getResponseAvailability(e.eventData, d.approvedVersion, now);
      if (availability.status !== 'upcoming') return true;
      if (!nextOpensAt || availability.opensAt < nextOpensAt) nextOpensAt = availability.opensAt;
      return false;
    });

    const data = visibleDocs.map((d) => {
      const e = eventMap.get(String(d.event));
      return participantView(d, e.eventData, {
        eventInfo: {
          _id: e._id,
          title: e.title,
          eventNumber: e.eventNumber,
          startDate: e.eventData?.startDate,
          endDate: e.eventData?.endDate,
        },
        hasResponded: respondedMap.has(String(d._id)),
        respondedAt: respondedMap.get(String(d._id)) || null,
      });
    });

    res.status(200).json({ success: true, data, nextOpensAt });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questionnaires',
      error: error.message,
    });
  }
};

// @desc    Questionnaire d'un événement (vue adaptée au rôle)
// @route   GET /api/event-questionnaires/event/:eventId
// @access  Private (créateur, administrateur, participant inscrit)
exports.getEventQuestionnaire = async (req, res) => {
  try {
    const event = await findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable' });
    }

    const doc = await findQuestionnaireForEvent(event._id);
    const owner = isEventOwner(req.user, event);

    if (owner || isEventReviewer(req.user)) {
      const responseCount = doc
        ? await EventQuestionnaireResponse.countDocuments({ questionnaire: doc._id })
        : 0;
      const locked = isQuestionnaireLocked(doc, responseCount);
      return res.status(200).json({
        success: true,
        role: owner ? 'owner' : 'admin',
        deadline: getQuestionnaireDeadline(event.eventData),
        ended: isEventEnded(event.eventData),
        locked,
        canSubmit: owner && !locked && canOwnerSubmitQuestionnaire(event.eventData, !!doc),
        data: doc ? ownerView(doc, { responseCount }) : null,
      });
    }

    if (event.status !== 'published' || !isUserRegistered(event.eventData, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les participants inscrits peuvent accéder au questionnaire de cet événement.',
      });
    }

    if (!doc || !doc.approvedVersion) {
      return res.status(404).json({ success: false, message: 'Aucun questionnaire disponible pour cet événement.' });
    }
    // Pas encore ouvert (après la fin de l'événement) : rien n'est révélé aux inscrits
    if (getResponseAvailability(event.eventData, doc.approvedVersion).status === 'upcoming') {
      return res.status(404).json({
        success: false,
        code: 'QUESTIONNAIRE_NOT_OPEN',
        message: 'Aucun questionnaire disponible pour cet événement.',
      });
    }

    const existing = await EventQuestionnaireResponse.findOne({ user: req.user.id, questionnaire: doc._id })
      .select('submittedAt')
      .lean();

    res.status(200).json({
      success: true,
      role: 'participant',
      data: participantView(doc, event.eventData, { hasResponded: !!existing, respondedAt: existing?.submittedAt || null }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event questionnaire',
      error: error.message,
    });
  }
};

// @desc    Créer le questionnaire d'un événement (soumis à validation)
// @route   POST /api/event-questionnaires/event/:eventId
// @access  Private (créateur de l'événement)
exports.createEventQuestionnaire = async (req, res) => {
  try {
    const event = await findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable' });
    }
    if (!isEventOwner(req.user, event)) {
      return res.status(403).json({ success: false, message: 'Seul le créateur de l’événement peut créer son questionnaire.' });
    }

    const result = await createPendingQuestionnaire(event, req.user.id, req.body);
    if (!result.ok) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    res.status(201).json({
      success: true,
      message: 'Questionnaire soumis. Il sera visible des participants après validation par un administrateur.',
      data: ownerView(result.doc, { responseCount: 0 }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating event questionnaire',
      error: error.message,
    });
  }
};

// @desc    Modifier le questionnaire (nouvelle version soumise à validation, la version approuvée reste en ligne)
// @route   PUT /api/event-questionnaires/event/:eventId
// @access  Private (créateur de l'événement)
exports.updateEventQuestionnaire = async (req, res) => {
  try {
    const event = await findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable' });
    }
    if (!isEventOwner(req.user, event)) {
      return res.status(403).json({ success: false, message: 'Seul le créateur de l’événement peut modifier son questionnaire.' });
    }

    // Événement terminé : le questionnaire existant est figé
    if (isEventEnded(event.eventData)) {
      return res.status(403).json({ success: false, code: 'EVENT_ENDED', message: EVENT_ENDED_MESSAGE });
    }

    const windowCheck = checkQuestionnaireWindow(event.eventData);
    if (!windowCheck.ok) {
      return res.status(400).json({ success: false, message: windowCheck.message });
    }

    const doc = await findQuestionnaireForEvent(event._id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Aucun questionnaire pour cet événement.' });
    }
    // Questionnaire figé seulement après réception de réponses ; sinon la modification passe par la validation admin
    const responseCount = await EventQuestionnaireResponse.countDocuments({ questionnaire: doc._id });
    if (isQuestionnaireLocked(doc, responseCount)) {
      return res.status(403).json({ success: false, code: PUBLISHED_LOCK_CODE, message: LOCK_MESSAGES.questionnaire });
    }

    const knownIds = [
      ...(doc.approvedVersion?.questions || []).map((q) => q._id),
      ...(doc.pendingVersion?.questions || []).map((q) => q._id),
    ];
    const normalized = normalizeQuestionnairePayload(req.body, knownIds);
    if (!normalized.ok) {
      return res.status(400).json({ success: false, message: normalized.message });
    }
    const scheduleCheck = checkResponseSchedule(event.eventData, normalized.value);
    if (!scheduleCheck.ok) {
      return res.status(400).json({ success: false, message: scheduleCheck.message });
    }

    doc.pendingVersion = { ...normalized.value, submittedAt: new Date() };
    doc.reviewStatus = 'pending';
    doc.rejectionReason = '';
    await doc.save();

    res.status(200).json({
      success: true,
      message: doc.approvedVersion
        ? 'Modification soumise. La version approuvée reste visible jusqu’à la validation.'
        : 'Questionnaire mis à jour et soumis à validation.',
      data: ownerView(doc, { responseCount }),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating event questionnaire',
      error: error.message,
    });
  }
};

/**
 * Contrôles communs à l'envoi et à la modification des réponses :
 * événement publié, participant inscrit, questionnaire approuvé et fenêtre de réponse ouverte.
 */
async function loadAnswerContext(req, res) {
  const event = await findEvent(req.params.eventId);
  if (!event || event.status !== 'published') {
    res.status(404).json({ success: false, message: 'Événement introuvable' });
    return null;
  }
  if (!isUserRegistered(event.eventData, req.user.id)) {
    res.status(403).json({
      success: false,
      message: 'Seuls les participants inscrits peuvent répondre à ce questionnaire.',
    });
    return null;
  }
  const doc = await findQuestionnaireForEvent(event._id);
  if (!doc || !doc.approvedVersion) {
    res.status(404).json({ success: false, message: 'Aucun questionnaire disponible pour cet événement.' });
    return null;
  }
  // Fenêtre de réponse : ouverture (validation ou date choisie après la fin) → date limite (fin + 72 h max)
  const availability = getResponseAvailability(event.eventData, doc.approvedVersion);
  if (availability.status === 'upcoming') {
    res.status(400).json({
      success: false,
      code: 'QUESTIONNAIRE_NOT_OPEN',
      message: `Ce questionnaire ouvrira le ${formatFr(availability.opensAt)}.`,
    });
    return null;
  }
  if (availability.status === 'closed') {
    res.status(400).json({
      success: false,
      code: 'QUESTIONNAIRE_CLOSED',
      message: `Le délai de réponse est dépassé (date limite : ${formatFr(availability.closesAt)}).`,
    });
    return null;
  }
  const checked = validateEventAnswers(doc.approvedVersion.questions, req.body?.answers);
  if (!checked.ok) {
    res.status(400).json({ success: false, message: checked.message });
    return null;
  }
  return { event, doc, answers: checked.value };
}

// @desc    Soumettre ses réponses (participant inscrit)
// @route   POST /api/event-questionnaires/event/:eventId/responses
// @access  Private (participant inscrit)
exports.submitEventQuestionnaireResponse = async (req, res) => {
  try {
    const ctx = await loadAnswerContext(req, res);
    if (!ctx) return undefined;

    const already = await EventQuestionnaireResponse.exists({ user: req.user.id, questionnaire: ctx.doc._id });
    if (already) {
      return res.status(400).json({
        success: false,
        code: 'ALREADY_ANSWERED',
        message: 'Vous avez déjà répondu à ce questionnaire : utilisez « Modifier mes réponses ».',
      });
    }

    await EventQuestionnaireResponse.create({
      questionnaire: ctx.doc._id,
      event: ctx.event._id,
      user: req.user.id,
      answers: ctx.answers,
    });

    // Volontairement aucune donnée de réponse renvoyée (confidentialité)
    return res.status(201).json({
      success: true,
      message: 'Merci ! Vos réponses ont été enregistrées. Elles ne peuvent plus être modifiées.',
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà répondu à ce questionnaire.' });
    }
    return res.status(500).json({
      success: false,
      message: 'Error submitting response',
      error: error.message,
    });
  }
};

// @desc    Mes propres réponses au questionnaire d'un événement (modifiables tant que le questionnaire est ouvert)
// @route   GET /api/event-questionnaires/event/:eventId/my-response
// @access  Private (le participant ne voit que SA réponse — jamais celles des autres)
exports.getMyEventQuestionnaireResponse = async (req, res) => {
  try {
    const event = await findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable' });
    }

    const doc = await findQuestionnaireForEvent(event._id);
    const response = doc
      ? await EventQuestionnaireResponse.findOne({ user: req.user.id, questionnaire: doc._id }).lean()
      : null;
    if (!response) {
      return res.status(404).json({ success: false, message: 'Vous n’avez pas encore répondu à ce questionnaire.' });
    }

    res.status(200).json({
      success: true,
      data: {
        title: doc.approvedVersion?.title || doc.pendingVersion?.title || '',
        submittedAt: response.submittedAt,
        editedAt: response.editedAt || null,
        // Libellés copiés lors de l'envoi : lisibles même si le questionnaire a changé depuis
        answers: (response.answers || []).map((a) => ({
          questionId: a.questionId,
          questionText: a.questionText,
          questionType: a.questionType,
          value: a.value,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your response',
      error: error.message,
    });
  }
};

// @desc    Réponses au questionnaire d'un événement
// @route   GET /api/event-questionnaires/event/:eventId/responses
// @access  Private (créateur de l'événement ou administrateur autorisé)
exports.getEventQuestionnaireResponses = async (req, res) => {
  try {
    const event = await findEvent(req.params.eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable' });
    }
    if (!canViewEventResponses(req.user, event)) {
      return res.status(403).json({
        success: false,
        message: 'Vous n’êtes pas autorisé à consulter les réponses de ce questionnaire.',
      });
    }

    const doc = await findQuestionnaireForEvent(event._id);
    if (!doc) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const responses = await EventQuestionnaireResponse.find({ questionnaire: doc._id })
      .populate({
        path: 'user',
        select: 'username email personalInfo',
        populate: { path: 'personalInfo', select: 'phone' },
      })
      .sort({ submittedAt: -1 })
      .lean();

    // Téléphone : celui donné à l'inscription à l'événement, sinon celui du profil
    const phoneByUser = new Map(
      (event.eventData?.eventRegistrations || [])
        .filter((r) => r.phone)
        .map((r) => [String(r.user), r.phone])
    );

    res.status(200).json({
      success: true,
      count: responses.length,
      eventTitle: event.title,
      questionnaireTitle: doc.approvedVersion?.title || doc.pendingVersion?.title || '',
      questions: publicQuestions(doc.approvedVersion),
      data: responses.map((r) => ({
        _id: r._id,
        user: r.user
          ? {
            _id: r.user._id,
            username: r.user.username,
            email: r.user.email,
            phone: phoneByUser.get(String(r.user._id)) || r.user.personalInfo?.phone || '',
          }
          : null,
        answers: r.answers,
        submittedAt: r.submittedAt,
        editedAt: r.editedAt || null,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching responses',
      error: error.message,
    });
  }
};

// ============================================
// ADMIN — validation des questionnaires d'événements
// ============================================

// @desc    Liste des questionnaires d'événements (filtre par statut)
// @route   GET /api/event-questionnaires/admin/list?status=pending
// @access  Private (superadmin, moderator)
exports.adminListEventQuestionnaires = async (req, res) => {
  try {
    const query = { isDeleted: false };
    if (['pending', 'approved', 'rejected'].includes(req.query.status)) {
      query.reviewStatus = req.query.status;
    }
    const docs = await EventQuestionnaire.find(query)
      .populate('event', 'title eventNumber status eventData.startDate eventData.endDate')
      .populate('author', 'username email')
      .sort({ updatedAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: docs.length,
      data: docs.map((d) => ownerView(d, { event: d.event, author: d.author })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event questionnaires',
      error: error.message,
    });
  }
};

// @desc    Approuver la version soumise d'un questionnaire d'événement
// @route   PUT /api/event-questionnaires/admin/:id/approve
// @access  Private (superadmin, moderator)
exports.adminApproveEventQuestionnaire = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Questionnaire introuvable' });
    }
    const doc = await EventQuestionnaire.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Questionnaire introuvable' });
    }
    if (!doc.pendingVersion) {
      return res.status(400).json({ success: false, message: 'Aucune version en attente de validation.' });
    }

    const now = new Date();
    const pending = doc.pendingVersion.toObject ? doc.pendingVersion.toObject() : doc.pendingVersion;
    doc.approvedVersion = { ...pending, approvedAt: now };
    doc.pendingVersion = null;
    doc.reviewStatus = 'approved';
    doc.rejectionReason = '';
    doc.reviewedAt = now;
    doc.reviewedBy = req.user._id;
    await doc.save();

    res.status(200).json({ success: true, message: 'Questionnaire approuvé', data: ownerView(doc) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving questionnaire',
      error: error.message,
    });
  }
};

// @desc    Refuser la version soumise (la version approuvée éventuelle reste en ligne)
// @route   PUT /api/event-questionnaires/admin/:id/reject
// @access  Private (superadmin, moderator)
exports.adminRejectEventQuestionnaire = async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: 'Questionnaire introuvable' });
    }
    const doc = await EventQuestionnaire.findOne({ _id: req.params.id, isDeleted: false });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Questionnaire introuvable' });
    }
    if (!doc.pendingVersion) {
      return res.status(400).json({ success: false, message: 'Aucune version en attente de validation.' });
    }

    doc.reviewStatus = 'rejected';
    doc.rejectionReason = normalizeReason(req.body?.reason);
    doc.reviewedAt = new Date();
    doc.reviewedBy = req.user._id;
    await doc.save();

    res.status(200).json({ success: true, message: 'Questionnaire refusé', data: ownerView(doc) });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting questionnaire',
      error: error.message,
    });
  }
};

exports.createPendingQuestionnaire = createPendingQuestionnaire;
