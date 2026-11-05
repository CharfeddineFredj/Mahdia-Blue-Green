const mongoose = require('mongoose');
const Questionnaire = require('../models/Questionnaire');
const Question = require('../models/Question');
const Response = require('../models/Response');
const User = require('../models/User');
const { appendScheduleMeta, sortQuestionnaireQuestions } = require('../utils/questionnaireSchedule');
const { DEFAULT_REGISTRATION_QUESTIONS } = require('../data/registrationQuestionnaireDefaults');

function buildQuestionPayload(item, orderIndex) {
  const type = item.type || 'text';
  let options = [];
  if (['single_choice', 'multiple_choice'].includes(type)) {
    options = Array.isArray(item.options) ? item.options.filter(Boolean) : [];
  }
  const pif = item.personalInfoField;
  const personalInfoField = pif === '' || pif === undefined || pif === null ? null : pif;
  return {
    text: (item.text || '').trim(),
    type,
    options,
    order: orderIndex + 1,
    isRequired: !!item.isRequired,
    category: item.category || 'general',
    personalInfoField
  };
}

/**
 * Retire une question des réponses actives et copie la valeur dans archivedAnswers (question supprimée du formulaire).
 * @returns {{ entriesArchived: number, affectedUserIds: string[] }}
 */
async function archiveAndDetachQuestionAnswers(questionnaireId, questionId, questionDoc) {
  const qidStr = questionId.toString();
  const qText = questionDoc?.text || '';
  const qType = questionDoc?.type || 'text';
  const pif = questionDoc?.personalInfoField ?? null;

  const responses = await Response.find({
    questionnaire: questionnaireId,
    'answers.question': questionId
  });

  let entriesArchived = 0;
  const affectedUserIds = [];
  for (const resp of responses) {
    const nextAnswers = [];
    const newArchives = [];
    for (const a of resp.answers || []) {
      const aid = a.question?.toString?.() ?? String(a.question);
      if (aid === qidStr) {
        newArchives.push({
          questionId,
          questionText: qText,
          questionType: qType,
          personalInfoField: pif,
          value: a.value,
          archivedAt: new Date(),
          reason: 'question_removed'
        });
      } else {
        nextAnswers.push(a);
      }
    }
    if (newArchives.length > 0) {
      resp.answers = nextAnswers;
      resp.archivedAnswers = [...(resp.archivedAnswers || []), ...newArchives];
      await resp.save();
      entriesArchived += newArchives.length;
      affectedUserIds.push(resp.user.toString());
    }
  }
  return { entriesArchived, affectedUserIds };
}

// @desc    Get all active questionnaires (hors inscription)
// @route   GET /api/questionnaires
// @access  Public
exports.getQuestionnaires = async (req, res) => {
  try {
    const questionnaires = await Questionnaire.find({
      isActive: true,
      isDeleted: false,
      isRegistrationQuestionnaire: { $ne: true }
    })
      .populate('questions')
      .sort({ createdAt: -1 });

    questionnaires.forEach(sortQuestionnaireQuestions);
    const data = questionnaires
      .map((q) => appendScheduleMeta(q))
      .filter((q) => q.scheduleStatus !== 'ended');

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questionnaires',
      error: error.message
    });
  }
};

// @desc    Get single questionnaire
// @route   GET /api/questionnaires/:id
// @access  Public
exports.getQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findOne({
      _id: req.params.id,
      isDeleted: false,
      isActive: true
    }).populate('questions');

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }

    if (questionnaire.isRegistrationQuestionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }

    sortQuestionnaireQuestions(questionnaire);
    const meta = appendScheduleMeta(questionnaire);
    if (meta.scheduleStatus === 'ended') {
      return res.status(404).json({
        success: false,
        message: 'Ce questionnaire n’est plus disponible (période terminée).'
      });
    }

    res.status(200).json({
      success: true,
      data: meta
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questionnaire',
      error: error.message
    });
  }
};

// @desc    Get registration questionnaire
// @route   GET /api/questionnaires/registration
// @access  Public
exports.getRegistrationQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findOne({
      isRegistrationQuestionnaire: true,
      isActive: true,
      isDeleted: false
    })
      .sort({ updatedAt: -1 })
      .populate('questions');

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Registration questionnaire not found'
      });
    }

    sortQuestionnaireQuestions(questionnaire);
    res.status(200).json({
      success: true,
      data: questionnaire
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registration questionnaire',
      error: error.message
    });
  }
};

// @desc    Create questionnaire
// @route   POST /api/questionnaires
// @access  Private/Admin
exports.createQuestionnaire = async (req, res) => {
  try {
    const {
      title,
      description,
      questions: questionsData,
      isRegistrationQuestionnaire,
      targetProfessions,
      opensAt,
      closesAt
    } = req.body;

    const isReg = !!isRegistrationQuestionnaire;

    if (isReg) {
      await Questionnaire.updateMany(
        { isRegistrationQuestionnaire: true },
        { $set: { isRegistrationQuestionnaire: false } }
      );
    }

    const questions = await Question.insertMany(questionsData);
    const questionIds = questions.map((q) => q._id);

    const doc = {
      title,
      description,
      questions: questionIds,
      isRegistrationQuestionnaire: isReg
    };

    if (!isReg) {
      if (opensAt) doc.opensAt = new Date(opensAt);
      if (closesAt) doc.closesAt = new Date(closesAt);
      if (Array.isArray(targetProfessions)) doc.targetProfessions = targetProfessions;
    }

    const questionnaire = await Questionnaire.create(doc);

    const populatedQuestionnaire = await Questionnaire.findById(questionnaire._id)
      .populate('questions');

    sortQuestionnaireQuestions(populatedQuestionnaire);
    res.status(201).json({
      success: true,
      message: 'Questionnaire created successfully',
      data: appendScheduleMeta(populatedQuestionnaire)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating questionnaire',
      error: error.message
    });
  }
};

// @desc    Update questionnaire
// @route   PUT /api/questionnaires/:id
// @access  Private/Admin
exports.updateQuestionnaire = async (req, res) => {
  try {
    const {
      title,
      description,
      isActive,
      isRegistrationQuestionnaire,
      targetProfessions,
      opensAt,
      closesAt
    } = req.body;

    const questionnaire = await Questionnaire.findById(req.params.id);

    if (!questionnaire || questionnaire.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }

    if (title !== undefined) questionnaire.title = title;
    if (description !== undefined) questionnaire.description = description;
    if (isActive !== undefined) questionnaire.isActive = isActive;

    if (isRegistrationQuestionnaire === true) {
      await Questionnaire.updateMany(
        { _id: { $ne: questionnaire._id }, isRegistrationQuestionnaire: true },
        { $set: { isRegistrationQuestionnaire: false } }
      );
      questionnaire.isRegistrationQuestionnaire = true;
      questionnaire.opensAt = null;
      questionnaire.closesAt = null;
      questionnaire.targetProfessions = [];
    } else if (isRegistrationQuestionnaire === false) {
      questionnaire.isRegistrationQuestionnaire = false;
    }

    if (questionnaire.isRegistrationQuestionnaire !== true) {
      if (opensAt !== undefined) {
        questionnaire.opensAt = opensAt ? new Date(opensAt) : null;
      }
      if (closesAt !== undefined) {
        questionnaire.closesAt = closesAt ? new Date(closesAt) : null;
      }
      if (targetProfessions !== undefined) {
        questionnaire.targetProfessions = Array.isArray(targetProfessions) ? targetProfessions : [];
      }
    }

    await questionnaire.save();

    const populated = await Questionnaire.findById(questionnaire._id).populate('questions');

    sortQuestionnaireQuestions(populated);
    res.status(200).json({
      success: true,
      message: 'Questionnaire updated successfully',
      data: appendScheduleMeta(populated)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating questionnaire',
      error: error.message
    });
  }
};

// @desc    Delete questionnaire (soft delete)
// @route   DELETE /api/questionnaires/:id
// @access  Private/Admin
exports.deleteQuestionnaire = async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findById(req.params.id);

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }

    questionnaire.isDeleted = true;
    await questionnaire.save();

    res.status(200).json({
      success: true,
      message: 'Questionnaire deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting questionnaire',
      error: error.message
    });
  }
};

// @desc    Submit questionnaire response (for non-registration questionnaires)
// @route   POST /api/questionnaires/:id/submit
// @access  Private
// NOTE: Registration questionnaire must be submitted via POST /api/auth/complete-questionnaire
exports.submitResponse = async (req, res) => {
  try {
    const { answers } = req.body;

    const questionnaire = await Questionnaire.findOne({
      _id: req.params.id,
      isActive: true,
      isDeleted: false
    }).populate('questions');

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found or not active'
      });
    }

    sortQuestionnaireQuestions(questionnaire);

    // Block registration questionnaire submissions through this route
    if (questionnaire.isRegistrationQuestionnaire) {
      return res.status(400).json({
        success: false,
        message: 'Registration questionnaire must be submitted through /api/auth/complete-questionnaire'
      });
    }

    const now = new Date();
    if (questionnaire.opensAt && now < questionnaire.opensAt) {
      return res.status(400).json({
        success: false,
        message: 'Ce questionnaire n’est pas encore ouvert'
      });
    }
    if (questionnaire.closesAt && now > questionnaire.closesAt) {
      return res.status(400).json({
        success: false,
        message: 'Ce questionnaire est clos'
      });
    }

    // Check if user already responded
    const existingResponse = await Response.findOne({
      user: req.user.id,
      questionnaire: req.params.id
    });

    if (existingResponse) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted a response to this questionnaire'
      });
    }

    // Create response
    const response = await Response.create({
      user: req.user.id,
      questionnaire: req.params.id,
      answers
    });

    res.status(201).json({
      success: true,
      message: 'Response submitted successfully',
      data: response
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting response',
      error: error.message
    });
  }
};

// @desc    Détail d’un questionnaire pour l’admin (toujours depuis la DB, questions triées)
// @route   GET /api/questionnaires/admin/:id
// @access  Private / analyst
exports.getQuestionnaireAdminDetail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de questionnaire invalide.'
      });
    }

    const questionnaire = await Questionnaire.findOne({
      _id: req.params.id,
      isDeleted: false
    }).populate('questions');

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }

    sortQuestionnaireQuestions(questionnaire);
    res.status(200).json({
      success: true,
      data: appendScheduleMeta(questionnaire)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questionnaire',
      error: error.message
    });
  }
};

// @desc    Liste tous les questionnaires (admin, hors soft-deleted)
// @route   GET /api/questionnaires/admin/list
// @access  Private / analyst
exports.getQuestionnairesAdmin = async (req, res) => {
  try {
    const questionnaires = await Questionnaire.find({ isDeleted: false })
      .populate('questions')
      .sort({ createdAt: -1 });

    questionnaires.forEach(sortQuestionnaireQuestions);
    const data = questionnaires.map((q) => appendScheduleMeta(q));

    res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching questionnaires',
      error: error.message
    });
  }
};

// @desc    Remplacer / synchroniser les questions d’un questionnaire (CRUD dans un seul appel)
// @route   PUT /api/questionnaires/:id/questions
// @access  Private / analyst
exports.syncQuestionnaireQuestions = async (req, res) => {
  try {
    const { questions: incomingBody } = req.body;
    if (!Array.isArray(incomingBody)) {
      return res.status(400).json({
        success: false,
        message: 'Le corps doit contenir un tableau "questions".'
      });
    }

    const questionnaire = await Questionnaire.findById(req.params.id);
    if (!questionnaire || questionnaire.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }

    const currentIds = questionnaire.questions.map((id) => id.toString());
    const idSet = new Set(currentIds);

    const newOrderedIds = [];
    for (let i = 0; i < incomingBody.length; i++) {
      const payload = buildQuestionPayload(incomingBody[i], i);
      if (!payload.text) {
        return res.status(400).json({
          success: false,
          message: 'Chaque question doit avoir un texte.'
        });
      }

      const rawId = incomingBody[i]._id || incomingBody[i].id;
      if (rawId && mongoose.Types.ObjectId.isValid(rawId) && idSet.has(String(rawId))) {
        await Question.findByIdAndUpdate(rawId, payload, { new: true, runValidators: true });
        newOrderedIds.push(new mongoose.Types.ObjectId(rawId));
      } else {
        const created = await Question.create(payload);
        newOrderedIds.push(created._id);
      }
    }

    const removedIds = currentIds.filter(
      (id) => !newOrderedIds.some((nid) => nid.toString() === id)
    );

    let archivedAnswerCount = 0;
    const affectedUserIdSet = new Set();

    for (const rid of removedIds) {
      const qDoc = await Question.findById(rid).lean();
      const { entriesArchived, affectedUserIds } = await archiveAndDetachQuestionAnswers(
        questionnaire._id,
        rid,
        qDoc
      );
      archivedAnswerCount += entriesArchived;
      affectedUserIds.forEach((uid) => affectedUserIdSet.add(uid));
      await Question.findByIdAndDelete(rid);
    }

    questionnaire.questions = newOrderedIds;
    await questionnaire.save();

    const populated = await Questionnaire.findById(questionnaire._id).populate('questions');

    sortQuestionnaireQuestions(populated);

    const affectedUsersCount = affectedUserIdSet.size;
    let message = 'Questions mises à jour.';
    if (removedIds.length > 0 && archivedAnswerCount > 0) {
      message = `${removedIds.length} question(s) retirée(s) du formulaire. ${archivedAnswerCount} réponse(s) archivée(s) (${affectedUsersCount} membre(s) concerné(s)).`;
    } else if (removedIds.length > 0) {
      message = `${removedIds.length} question(s) supprimée(s). Aucune réponse enregistrée sur ces questions.`;
    }

    res.status(200).json({
      success: true,
      message,
      removedQuestionCount: removedIds.length,
      archivedAnswerCount,
      affectedUsersCount,
      data: appendScheduleMeta(populated)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des questions',
      error: error.message
    });
  }
};

// @desc    Restaurer le jeu de questions par défaut (inscription uniquement, si aucune réponse)
// @route   POST /api/questionnaires/:id/questions/restore-defaults
// @access  Private / analyst
exports.restoreRegistrationQuestionDefaults = async (req, res) => {
  try {
    const questionnaire = await Questionnaire.findById(req.params.id);
    if (!questionnaire || questionnaire.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire not found'
      });
    }
    if (!questionnaire.isRegistrationQuestionnaire) {
      return res.status(400).json({
        success: false,
        message: 'Réservé au questionnaire d’inscription.'
      });
    }

    const hasResponses = await Response.exists({ questionnaire: questionnaire._id });
    if (hasResponses) {
      return res.status(400).json({
        success: false,
        message:
          'Des réponses existent déjà : la restauration complète est désactivée. Modifiez les questions une par une ou ajoutez-en de nouvelles.'
      });
    }

    const oldIds = [...questionnaire.questions];
    if (oldIds.length) {
      await Question.deleteMany({ _id: { $in: oldIds } });
    }

    const created = await Question.insertMany(
      DEFAULT_REGISTRATION_QUESTIONS.map((q, idx) => ({
        ...q,
        order: idx + 1
      }))
    );
    questionnaire.questions = created.map((q) => q._id);
    await questionnaire.save();

    const populated = await Questionnaire.findById(questionnaire._id).populate('questions');

    sortQuestionnaireQuestions(populated);
    res.status(200).json({
      success: true,
      message: 'Jeu de questions « Complétez votre profil » restauré.',
      data: appendScheduleMeta(populated)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la restauration',
      error: error.message
    });
  }
};

// @desc    Questionnaires publics ouverts auxquels l’utilisateur n’a pas encore répondu
// @route   GET /api/questionnaires/user/pending
// @access  Private (questionnaire d’inscription déjà complété)
exports.getPendingQuestionnairesForUser = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const joinedAt = req.user.createdAt ? new Date(req.user.createdAt) : null;

    const user = await User.findById(userId).populate('personalInfo');
    const userProfession = user?.personalInfo?.profession || null;

    const questionnaires = await Questionnaire.find({
      isActive: true,
      isDeleted: false,
      isRegistrationQuestionnaire: { $ne: true }
    })
      .populate('questions')
      .sort({ createdAt: -1 });

    const respondedIds = await Response.find({ user: userId }).distinct('questionnaire');
    const respondedSet = new Set(respondedIds.map((id) => id.toString()));

    const pending = [];
    for (const q of questionnaires) {
      if (respondedSet.has(q._id.toString())) continue;

      if (q.targetProfessions && q.targetProfessions.length > 0) {
        if (!userProfession || !q.targetProfessions.includes(userProfession)) continue;
      }

      sortQuestionnaireQuestions(q);
      const meta = appendScheduleMeta(q);
      if (!meta.canSubmit) continue;

      const createdAt = meta.createdAt ? new Date(meta.createdAt) : null;
      const updatedAt = meta.updatedAt ? new Date(meta.updatedAt) : null;

      const isNewSinceUserJoined = !!(joinedAt && createdAt && createdAt > joinedAt);
      const mayHaveNewContent = !!(joinedAt && updatedAt && updatedAt > joinedAt && !isNewSinceUserJoined);

      pending.push({
        _id: meta._id,
        title: meta.title,
        description: meta.description,
        scheduleLabel: meta.scheduleLabel,
        scheduleStatus: meta.scheduleStatus,
        questionsCount: Array.isArray(meta.questions) ? meta.questions.length : 0,
        opensAt: meta.opensAt,
        closesAt: meta.closesAt,
        isNewSinceUserJoined,
        mayHaveNewContent
      });
    }

    const newCount = pending.filter((p) => p.isNewSinceUserJoined || p.mayHaveNewContent).length;

    res.status(200).json({
      success: true,
      count: pending.length,
      newCount,
      data: pending
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des questionnaires en attente',
      error: error.message
    });
  }
};

function formatStatDisplayValue(value, type) {
  if (value === null || value === undefined || value === '') return '—';
  if (type === 'boolean') return value ? 'Oui' : 'Non';
  if (type === 'rating') return String(value);
  if (type === 'date') {
    try {
      return new Date(value).toLocaleString('fr-FR');
    } catch {
      return String(value);
    }
  }
  if (type === 'multiple_choice' && Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }
  return String(value);
}

function addAnswerToQuestionStats(qs, qType, value) {
  const { distribution } = qs;
  if (qType === 'multiple_choice') {
    const arr = Array.isArray(value) && value.length ? value : ['(vide)'];
    for (const opt of arr) {
      const k = String(opt);
      distribution[k] = (distribution[k] || 0) + 1;
    }
    return;
  }
  if (qType === 'boolean') {
    const k = value ? 'Oui' : 'Non';
    distribution[k] = (distribution[k] || 0) + 1;
    return;
  }
  if (qType === 'rating') {
    const n = Math.round(Number(value));
    if (!Number.isNaN(n) && n >= 1 && n <= 5) {
      const key = String(n);
      distribution[key] = (distribution[key] || 0) + 1;
      qs.ratingSum = (qs.ratingSum || 0) + n;
      qs.ratingCount = (qs.ratingCount || 0) + 1;
    }
    return;
  }
  if (qType === 'text') {
    const t = String(value ?? '').trim();
    if (t) qs.textSamples.push(t);
    return;
  }
  if (qType === 'date' && value) {
    try {
      const k = new Date(value).toISOString().slice(0, 10);
      distribution[k] = (distribution[k] || 0) + 1;
    } catch {
      const k = String(value);
      distribution[k] = (distribution[k] || 0) + 1;
    }
    return;
  }
  const k = String(value);
  distribution[k] = (distribution[k] || 0) + 1;
}

// @desc    Statistiques détaillées + réponses paginées (admin / analyste)
// @route   GET /api/questionnaires/admin/:id/statistics
// @access  Private / analyst
exports.getQuestionnaireStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de questionnaire invalide.'
      });
    }

    const questionnaire = await Questionnaire.findOne({
      _id: id,
      isDeleted: false
    }).populate('questions');

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Questionnaire introuvable.'
      });
    }

    sortQuestionnaireQuestions(questionnaire);
    const qList = questionnaire.questions || [];
    const qById = new Map(qList.map((q) => [q._id.toString(), q]));

    const questionStats = qList.map((q) => ({
      questionId: q._id.toString(),
      text: q.text,
      type: q.type,
      options: q.options || [],
      answeredCount: 0,
      distribution: {},
      ratingSum: 0,
      ratingCount: 0,
      textSamples: [],
      ratingAvg: null
    }));

    const idxByQid = new Map(questionStats.map((s, i) => [s.questionId, i]));

    const allRes = await Response.find({ questionnaire: id })
      .select('answers archivedAnswers')
      .lean();

    const archivedMap = {};

    for (const r of allRes) {
      for (const a of r.answers || []) {
        const qid = a.question?.toString?.() ?? String(a.question);
        const qi = idxByQid.get(qid);
        if (qi === undefined) continue;
        const qs = questionStats[qi];
        const qDoc = qById.get(qid);
        if (!qDoc) continue;
        qs.answeredCount += 1;
        addAnswerToQuestionStats(qs, qDoc.type, a.value);
      }
      for (const ar of r.archivedAnswers || []) {
        const label = (ar.questionText || 'Question retirée').trim() || 'Question retirée';
        if (!archivedMap[label]) {
          archivedMap[label] = {
            questionText: label,
            questionType: ar.questionType || 'text',
            answerCount: 0,
            samples: []
          };
        }
        archivedMap[label].answerCount += 1;
        const disp = formatStatDisplayValue(ar.value, ar.questionType || 'text');
        if (archivedMap[label].samples.length < 40) {
          archivedMap[label].samples.push(disp);
        }
      }
    }

    for (const qs of questionStats) {
      if (qs.textSamples.length > 100) {
        qs.textSamples = qs.textSamples.slice(0, 100);
      }
      qs.ratingAvg =
        qs.ratingCount > 0 ? Math.round((qs.ratingSum / qs.ratingCount) * 100) / 100 : null;
      delete qs.ratingSum;
      delete qs.ratingCount;
    }

    const totalResponses = await Response.countDocuments({ questionnaire: id });
    const totalPages = Math.ceil(totalResponses / limit) || 1;

    const pageRows = await Response.find({ questionnaire: id })
      .populate('user', 'username email firstName lastName')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const items = pageRows.map((r) => {
      const u = r.user;
      const userLabel = u
        ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || '—'
        : '—';
      return {
        _id: r._id,
        submittedAt: r.submittedAt,
        createdAt: r.createdAt,
        user: u
          ? {
              _id: u._id,
              username: u.username,
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              displayName: userLabel
            }
          : null,
        answers: (r.answers || []).map((a) => {
          const qid = a.question?.toString?.() ?? String(a.question);
          const qDoc = qById.get(qid);
          const type = qDoc?.type || 'text';
          return {
            questionId: qid,
            questionText: qDoc?.text || '(question inconnue)',
            type,
            value: a.value,
            display: formatStatDisplayValue(a.value, type)
          };
        }),
        archivedAnswers: (r.archivedAnswers || []).map((ar) => ({
          questionText: ar.questionText,
          questionType: ar.questionType,
          value: ar.value,
          display: formatStatDisplayValue(ar.value, ar.questionType || 'text')
        }))
      };
    });

    const chartDays = Math.min(365, Math.max(7, parseInt(req.query.chartDays, 10) || 90));
    const qObjectId = new mongoose.Types.ObjectId(id);
    const chartStart = new Date();
    chartStart.setUTCDate(chartStart.getUTCDate() - chartDays);
    chartStart.setUTCHours(0, 0, 0, 0);

    const dailyAgg = await Response.aggregate([
      { $match: { questionnaire: qObjectId, createdAt: { $gte: chartStart } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const dayMap = Object.fromEntries(dailyAgg.map((x) => [x._id, x.count]));
    const dailyResponses = [];
    for (let i = chartDays - 1; i >= 0; i -= 1) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyResponses.push({ date: key, count: dayMap[key] || 0 });
    }

    res.status(200).json({
      success: true,
      data: {
        questionnaire: {
          _id: questionnaire._id,
          title: questionnaire.title,
          isRegistrationQuestionnaire: !!questionnaire.isRegistrationQuestionnaire
        },
        totalResponses,
        chartDays,
        dailyResponses,
        questionStats,
        archivedQuestionStats: Object.values(archivedMap),
        responsesPage: {
          page,
          limit,
          total: totalResponses,
          totalPages,
          items
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques',
      error: error.message
    });
  }
};

// @desc    Get current user's responses
// @route   GET /api/questionnaires/user/responses
// @access  Private
exports.getMyResponses = async (req, res) => {
  try {
    const responses = await Response.find({ user: req.user.id })
      .populate('questionnaire', 'title description')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: responses.length,
      data: responses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching responses',
      error: error.message
    });
  }
};
