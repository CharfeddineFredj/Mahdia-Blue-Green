const User = require('../models/User');
const ReactivationRequest = require('../models/ReactivationRequest');
const Post = require('../models/Post');
const Response = require('../models/Response');
const Questionnaire = require('../models/Questionnaire');
const PersonalInfo = require('../models/PersonalInfo');
const Comment = require('../models/Comment');
const Contact = require('../models/Contact');
const Partner = require('../models/Partner');
const Visit = require('../models/Visit');
const { queueNotifyPostPublished } = require('../utils/newsletterMail');
const { applyEventRevision } = require('../utils/eventRevision');
const { applyArticleRevision } = require('../utils/articleRevision');
const { normalizeReason } = require('../utils/eventQuestionnaireRules');

/** Comptes « équipe admin » — le modérateur n’y a pas accès (liste dédiée superadmin uniquement) */
const STAFF_ROLES = ['superadmin', 'analyst', 'moderator'];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parse YYYY-MM-DD; end of day for dateTo */
function buildCreatedAtRange(dateFrom, dateTo) {
  const range = {};
  if (dateFrom) {
    const d = new Date(dateFrom);
    d.setHours(0, 0, 0, 0);
    range.$gte = d;
  }
  if (dateTo) {
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    range.$lte = d;
  }
  return Object.keys(range).length ? range : null;
}

/** Série journalière complétée sur N jours (UTC) pour graphiques */
function fillLastNDays(agg, days = 30) {
  const map = Object.fromEntries(agg.map((x) => [x._id, x.count]));
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map[key] || 0 });
  }
  return out;
}

async function aggregateSeriesByCreatedAt(Model, extraMatch, days = 30) {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  const match = { createdAt: { $gte: start }, ...extraMatch };
  const raw = await Model.aggregate([
    { $match: match },
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
  return fillLastNDays(raw, days);
}

function utcMidnightFromDate(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/** Fenêtre de N jours calendaires UTC se terminant le jour `endDay` (date UTC du jour). */
function buildNDayWindowUtc(days, endDay) {
  const lastMidnight = utcMidnightFromDate(endDay);
  const windowEnd = new Date(lastMidnight);
  windowEnd.setUTCHours(23, 59, 59, 999);
  const firstMidnight = new Date(lastMidnight);
  firstMidnight.setUTCDate(firstMidnight.getUTCDate() - (days - 1));
  return { firstMidnight, windowEnd };
}

function fillSeriesFromAgg(raw, firstMidnight, days) {
  const map = Object.fromEntries(raw.map((x) => [x._id, x.count]));
  const out = [];
  const d = new Date(firstMidnight);
  for (let i = 0; i < days; i += 1) {
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, count: map[key] || 0 });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function aggregateSeriesByCreatedAtWindow(Model, extraMatch, days, endDay) {
  const { firstMidnight, windowEnd } = buildNDayWindowUtc(days, endDay);
  const raw = await Model.aggregate([
    { $match: { createdAt: { $gte: firstMidnight, $lte: windowEnd }, ...extraMatch } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return fillSeriesFromAgg(raw, firstMidnight, days);
}

async function visitSeriesByWindow(days, endDay) {
  const { firstMidnight, windowEnd } = buildNDayWindowUtc(days, endDay);
  const raw = await Visit.aggregate([
    {
      $match: {
        $expr: {
          $and: [
            { $gte: [{ $ifNull: ['$visitedAt', '$createdAt'] }, firstMidnight] },
            { $lte: [{ $ifNull: ['$visitedAt', '$createdAt'] }, windowEnd] },
          ],
        },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: { $ifNull: ['$visitedAt', '$createdAt'] },
            timezone: 'UTC',
          },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  return fillSeriesFromAgg(raw, firstMidnight, days);
}

async function visitSeriesByDay(days = 30) {
  return visitSeriesByWindow(days, new Date());
}

/** Répartition 1–5 étoiles pour graphiques (complète les notes manquantes avec 0) */
function fillStars1to5(distList) {
  const map = {};
  for (const row of distList || []) {
    const k = Number(row.rating != null ? row.rating : row._id);
    if (k >= 1 && k <= 5) map[k] = row.count;
  }
  return [1, 2, 3, 4, 5].map((rating) => ({ rating, count: map[rating] || 0 }));
}

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalPosts = await Post.countDocuments({ isDeleted: false });
    const publishedPosts = await Post.countDocuments({ status: 'published', isDeleted: false });
    const totalArticles = await Post.countDocuments({ type: 'article', isDeleted: false });
    const totalEvents = await Post.countDocuments({ type: 'event', isDeleted: false });
    const totalResponses = await Response.countDocuments();

    // Recent posts
    const recentPosts = await Post.find({ isDeleted: false })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(5);

    // Recent users
    const recentUsers = await User.find()
      .select('username email role createdAt isActive firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalPosts,
          publishedPosts,
          totalArticles,
          totalEvents,
          totalResponses
        },
        recentPosts,
        recentUsers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
};

// @desc    Get all users (admin)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, staffOnly, q, dateFrom, dateTo } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const staffRoles = STAFF_ROLES;
    const base = {};
    if (staffOnly === 'true' || staffOnly === '1') {
      if (req.user.role === 'moderator') {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé au super administrateur.'
        });
      }
      if (role && staffRoles.includes(String(role))) {
        base.role = role;
      } else {
        base.role = { $in: staffRoles };
      }
    } else if (role) {
      if (req.user.role === 'moderator' && staffRoles.includes(String(role))) {
        return res.status(403).json({
          success: false,
          message: 'Accès réservé au super administrateur.'
        });
      }
      base.role = role;
    } else if (req.user.role === 'moderator') {
      base.role = 'user';
    }
    if (isActive !== undefined && isActive !== '') {
      base.isActive = isActive === 'true' || isActive === true;
    }

    const conditions = [base];
    const qTrim = q != null ? String(q).trim() : '';
    if (qTrim) {
      const rx = new RegExp(escapeRegex(qTrim), 'i');
      conditions.push({ $or: [{ username: rx }, { email: rx }] });
    }
    const createdRange = buildCreatedAtRange(dateFrom, dateTo);
    if (createdRange) conditions.push({ createdAt: createdRange });

    const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const users = await User.find(query)
      .select('-password')
      .populate('personalInfo')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await User.countDocuments(query);

    const now = new Date();
    const openQuestionnaires = await Questionnaire.find({
      isActive: true,
      isDeleted: false,
      isRegistrationQuestionnaire: { $ne: true },
      $or: [{ opensAt: null }, { opensAt: { $lte: now } }]
    }).select('_id closesAt targetProfessions').lean();

    const openQList = openQuestionnaires.filter(q => !q.closesAt || new Date(q.closesAt) >= now);

    const hasRegistrationQ = await Questionnaire.exists({
      isRegistrationQuestionnaire: true,
      isActive: true,
      isDeleted: false
    });

    const allOpenIds = openQList.map(q => q._id);
    let responseMap = {};
    if (allOpenIds.length > 0 && users.length > 0) {
      const userIds = users.map(u => u._id);
      const responses = await Response.find({
        user: { $in: userIds },
        questionnaire: { $in: allOpenIds }
      }).select('user questionnaire').lean();

      for (const r of responses) {
        const uid = r.user.toString();
        if (!responseMap[uid]) responseMap[uid] = new Set();
        responseMap[uid].add(r.questionnaire.toString());
      }
    }

    const adminRoles = STAFF_ROLES;
    const usersData = users.map(u => {
      const obj = u.toObject();

      if (adminRoles.includes(u.role)) {
        obj.totalOpenQuestionnaires = 0;
        obj.respondedQuestionnaires = 0;
        obj.pendingQuestionnaires = 0;
        obj.questionnaireStatus = 'complete';
        return obj;
      }

      const uid = u._id.toString();
      const userProfession = u.personalInfo?.profession || null;

      const applicableQ = openQList.filter(q => {
        if (!q.targetProfessions || q.targetProfessions.length === 0) return true;
        return userProfession && q.targetProfessions.includes(userProfession);
      });
      const applicableIds = new Set(applicableQ.map(q => q._id.toString()));

      const responded = responseMap[uid]
        ? [...responseMap[uid]].filter(id => applicableIds.has(id)).length
        : 0;
      const totalOpen = applicableIds.size;

      const registrationPending = hasRegistrationQ && !u.questionnaireCompleted;
      const surveysPending = totalOpen > 0 && responded < totalOpen;

      obj.totalOpenQuestionnaires = totalOpen + (hasRegistrationQ ? 1 : 0);
      obj.respondedQuestionnaires = responded + (u.questionnaireCompleted ? 1 : 0);
      obj.pendingQuestionnaires = (registrationPending ? 1 : 0) + (totalOpen - responded);
      obj.questionnaireStatus = (registrationPending || surveysPending) ? 'incomplete' : 'complete';
      return obj;
    });

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      currentPage: pageNum,
      data: usersData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get user by ID (admin)
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('personalInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user.role === 'moderator' && STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Accès réservé au super administrateur.'
      });
    }

    const userPosts = await Post.find({ author: user._id, isDeleted: false })
      .select('title type status createdAt')
      .sort({ createdAt: -1 });

    const userObj = user.toObject();
    const adminRoles = STAFF_ROLES;

    if (adminRoles.includes(user.role)) {
      userObj.totalOpenQuestionnaires = 0;
      userObj.respondedQuestionnaires = 0;
      userObj.pendingQuestionnaires = 0;
      userObj.questionnaireStatus = 'complete';
    } else {
      const now = new Date();
      const openQuestionnaires = await Questionnaire.find({
        isActive: true,
        isDeleted: false,
        isRegistrationQuestionnaire: { $ne: true },
        $or: [{ opensAt: null }, { opensAt: { $lte: now } }]
      }).select('_id closesAt targetProfessions').lean();

      const openQList = openQuestionnaires.filter(q => !q.closesAt || new Date(q.closesAt) >= now);

      const userProfession = user.personalInfo?.profession || null;
      const applicableQ = openQList.filter(q => {
        if (!q.targetProfessions || q.targetProfessions.length === 0) return true;
        return userProfession && q.targetProfessions.includes(userProfession);
      });
      const applicableIds = applicableQ.map(q => q._id);

      const hasRegistrationQ = await Questionnaire.exists({
        isRegistrationQuestionnaire: true,
        isActive: true,
        isDeleted: false
      });

      const responded = applicableIds.length > 0
        ? await Response.countDocuments({ user: user._id, questionnaire: { $in: applicableIds } })
        : 0;

      const totalOpen = applicableIds.length;
      const registrationPending = hasRegistrationQ && !user.questionnaireCompleted;
      const surveysPending = totalOpen > 0 && responded < totalOpen;

      userObj.totalOpenQuestionnaires = totalOpen + (hasRegistrationQ ? 1 : 0);
      userObj.respondedQuestionnaires = responded + (user.questionnaireCompleted ? 1 : 0);
      userObj.pendingQuestionnaires = (registrationPending ? 1 : 0) + (totalOpen - responded);
      userObj.questionnaireStatus = (registrationPending || surveysPending) ? 'incomplete' : 'complete';
    }

    res.status(200).json({
      success: true,
      data: {
        user: userObj,
        posts: userPosts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Superadmin ou modérateur (rôle : superadmin uniquement)
exports.updateUserRole = async (req, res) => {
  try {
    if (req.user.role === 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Seul le super administrateur peut modifier les rôles.'
      });
    }

    const { role } = req.body;

    const assignableRoles = ['user', 'analyst', 'moderator'];
    if (!assignableRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Rôle invalide. Rôles autorisés : ${assignableRoles.join(', ')}`
      });
    }

    // Prevent changing own role
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    const existing = await User.findById(req.params.id).select('role');
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (existing.role === 'superadmin') {
      return res.status(400).json({
        success: false,
        message: 'Le rôle super administrateur ne peut pas être modifié depuis le tableau de bord.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user role',
      error: error.message
    });
  }
};

// @desc    Update user account status (active/inactive)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Superadmin ou modérateur (pas les comptes équipe admin)
exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean'
      });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own account status'
      });
    }

    const targetBefore = await User.findById(req.params.id).select('role');
    if (!targetBefore) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (STAFF_ROLES.includes(targetBefore.role)) {
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Seul le super administrateur peut modifier le statut de ce compte.'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: error.message
    });
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account from admin panel'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (req.user.role === 'moderator' && STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le super administrateur peut supprimer ce compte.'
      });
    }

    // Hard delete from database
    const personalInfoId = user.personalInfo;
    await User.findByIdAndDelete(req.params.id);

    // Cleanup linked documents
    if (personalInfoId) {
      await PersonalInfo.findByIdAndDelete(personalInfoId);
    }
    await Response.deleteMany({ user: req.params.id });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// @desc    Get all posts (admin)
// @route   GET /api/admin/posts
// @access  Private/Admin
exports.getAllPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, status, q, dateFrom, dateTo } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const base = { isDeleted: false };
    if (type) base.type = type;
    if (status) base.status = status;

    const conditions = [base];
    const qTrim = q != null ? String(q).trim() : '';
    if (qTrim) {
      const rx = new RegExp(escapeRegex(qTrim), 'i');
      conditions.push({
        $or: [
          { title: rx },
          { body: rx },
          { 'articleData.summary': rx },
          { 'articleData.content': rx }
        ]
      });
    }
    const createdRange = buildCreatedAtRange(dateFrom, dateTo);
    if (createdRange) conditions.push({ createdAt: createdRange });

    const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

    const posts = await Post.find(query)
      .select('+pendingRevision')
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      currentPage: pageNum,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching posts',
      error: error.message
    });
  }
};

// @desc    Approve/publish a post
// @route   PUT /api/admin/posts/:id/approve
// @access  Private/Admin
exports.approvePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.status = 'published';
    post.publishedAt = new Date();
    post.publishedOnce = true;
    post.moderation = {
      ...(post.moderation?.toObject ? post.moderation.toObject() : post.moderation || {}),
      status: 'approved',
      reason: '',
      reviewedAt: new Date(),
      reviewedBy: req.user._id
    };
    await post.save();

    queueNotifyPostPublished(post._id);

    res.status(200).json({
      success: true,
      message: 'Post approved and published',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving post',
      error: error.message
    });
  }
};

// @desc    Reject a submitted post (stays unpublished, reason shown to the author)
// @route   PUT /api/admin/posts/:id/reject
// @access  Private/Moderator
exports.rejectPost = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, isDeleted: false });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Ce contenu est déjà publié. Refusez plutôt sa modification en attente.'
      });
    }

    post.moderation = {
      ...(post.moderation?.toObject ? post.moderation.toObject() : post.moderation || {}),
      status: 'rejected',
      reason: normalizeReason(req.body?.reason),
      reviewedAt: new Date(),
      reviewedBy: req.user._id
    };
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post rejected',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting post',
      error: error.message
    });
  }
};

// @desc    Approve the pending modification of a published event or article (applied to the live version)
// @route   PUT /api/admin/posts/:id/revision/approve
// @access  Private/Moderator
exports.approveEventRevision = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, type: { $in: ['event', 'article'] }, isDeleted: false })
      .select('+pendingRevision');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    if (!post.pendingRevision || post.pendingRevision.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification en attente de validation.'
      });
    }

    const revision = post.pendingRevision.toObject();
    if (post.type === 'article') applyArticleRevision(post, revision);
    else applyEventRevision(post, revision);
    post.pendingRevision = null;
    post.moderation = {
      ...(post.moderation?.toObject ? post.moderation.toObject() : post.moderation || {}),
      status: 'approved',
      reason: '',
      reviewedAt: new Date(),
      reviewedBy: req.user._id
    };
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Modification approuvée et publiée',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving revision',
      error: error.message
    });
  }
};

// @desc    Reject the pending modification of a published event or article (live version unchanged)
// @route   PUT /api/admin/posts/:id/revision/reject
// @access  Private/Moderator
exports.rejectEventRevision = async (req, res) => {
  try {
    const post = await Post.findOne({ _id: req.params.id, type: { $in: ['event', 'article'] }, isDeleted: false })
      .select('+pendingRevision');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    if (!post.pendingRevision || post.pendingRevision.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Aucune modification en attente de validation.'
      });
    }

    post.pendingRevision.status = 'rejected';
    post.pendingRevision.rejectionReason = normalizeReason(req.body?.reason);
    post.pendingRevision.reviewedAt = new Date();
    post.pendingRevision.reviewedBy = req.user._id;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Modification refusée',
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting revision',
      error: error.message
    });
  }
};

// @desc    Delete post (admin)
// @route   DELETE /api/admin/posts/:id
// @access  Private/Admin
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    post.isDeleted = true;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting post',
      error: error.message
    });
  }
};

// @desc    Get all questionnaire responses
// @route   GET /api/admin/responses
// @access  Private/Admin
exports.getAllResponses = async (req, res) => {
  try {
    const { page = 1, limit = 10, questionnaire } = req.query;
    
    const query = {};
    if (questionnaire) query.questionnaire = questionnaire;

    const responses = await Response.find(query)
      .populate('user', 'username email')
      .populate('questionnaire', 'title')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Response.countDocuments(query);

    res.status(200).json({
      success: true,
      count: responses.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
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

// @desc    List pending reactivation requests
// @route   GET /api/admin/reactivation-requests
// @access  Private/Superadmin
exports.getReactivationRequests = async (req, res) => {
  try {
    const requests = await ReactivationRequest.find({ status: 'pending' })
      .populate('user', 'username email authProvider isActive role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reactivation requests',
      error: error.message
    });
  }
};

// @desc    Approve reactivation (reactivate user)
// @route   PUT /api/admin/reactivation-requests/:id/approve
// @access  Private/Superadmin
exports.approveReactivationRequest = async (req, res) => {
  try {
    const requestDoc = await ReactivationRequest.findById(req.params.id).populate('user');

    if (!requestDoc || requestDoc.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Demande introuvable ou déjà traitée'
      });
    }

    const targetUser = await User.findById(requestDoc.user._id);
    if (!targetUser) {
      requestDoc.status = 'rejected';
      await requestDoc.save();
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable (compte supprimé)'
      });
    }

    targetUser.isActive = true;
    await targetUser.save();

    requestDoc.status = 'approved';
    await requestDoc.save();

    res.status(200).json({
      success: true,
      message: 'Compte réactivé et demande approuvée',
      data: { user: targetUser, request: requestDoc }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l’approbation',
      error: error.message
    });
  }
};

// @desc    Reject reactivation request
// @route   PUT /api/admin/reactivation-requests/:id/reject
// @access  Private/Superadmin
exports.rejectReactivationRequest = async (req, res) => {
  try {
    const requestDoc = await ReactivationRequest.findById(req.params.id);

    if (!requestDoc || requestDoc.status !== 'pending') {
      return res.status(404).json({
        success: false,
        message: 'Demande introuvable ou déjà traitée'
      });
    }

    requestDoc.status = 'rejected';
    await requestDoc.save();

    res.status(200).json({
      success: true,
      message: 'Demande refusée',
      data: requestDoc
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors du refus',
      error: error.message
    });
  }
};

// @desc    Statistiques agrégées (tableau analyste / direction)
// @route   GET /api/admin/analytics
// @access  Private — superadmin, analyst
exports.getAnalytics = async (req, res) => {
  /** Fenêtre max 365 j pour agrégations mois / année côté analytique */
  const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 30));
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      usersByRoleAgg,
      totalPosts,
      postsByTypeAgg,
      articlesByCategoryAgg,
      eventsByCategoryAgg,
      totalComments,
      commentsWithRating,
      ratingDistAgg,
      avgRatingArr,
      postRatingDistAgg,
      postRatingStatsAgg,
      totalContacts,
      totalPartners,
      activeQuestionnaires,
      totalResponses,
      totalVisits,
      todayVisits,
      monthVisits,
      uniqueVisitorIds
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Post.countDocuments({ isDeleted: false }),
      Post.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Post.aggregate([
        { $match: { isDeleted: false, type: 'article' } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'catArr',
          },
        },
        {
          $addFields: {
            categoryLabel: {
              $cond: {
                if: { $gt: [{ $size: '$catArr' }, 0] },
                then: { $arrayElemAt: ['$catArr.title', 0] },
                else: 'Sans catégorie',
              },
            },
          },
        },
        { $group: { _id: '$categoryLabel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Post.aggregate([
        { $match: { isDeleted: false, type: 'event' } },
        {
          $lookup: {
            from: 'categories',
            localField: 'category',
            foreignField: '_id',
            as: 'catArr',
          },
        },
        {
          $addFields: {
            categoryLabel: {
              $cond: {
                if: { $gt: [{ $size: '$catArr' }, 0] },
                then: { $arrayElemAt: ['$catArr.title', 0] },
                else: 'Sans catégorie',
              },
            },
          },
        },
        { $group: { _id: '$categoryLabel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Comment.countDocuments(),
      Comment.countDocuments({ rating: { $exists: true, $ne: null } }),
      Comment.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Comment.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } }
      ]),
      Post.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: false } },
        { $group: { _id: '$ratings.value', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Post.aggregate([
        { $match: { isDeleted: false } },
        { $unwind: { path: '$ratings', preserveNullAndEmptyArrays: false } },
        { $group: { _id: null, avg: { $avg: '$ratings.value' }, totalVotes: { $sum: 1 } } }
      ]),
      Contact.countDocuments(),
      Partner.countDocuments(),
      Questionnaire.countDocuments({ isActive: true, isDeleted: false }),
      Response.countDocuments(),
      Visit.countDocuments(),
      Visit.countDocuments({ visitedAt: { $gte: todayStart } }),
      Visit.countDocuments({ visitedAt: { $gte: monthAgo } }),
      Visit.distinct('visitorId')
    ]);

    const [
      usersSeries,
      articlesSeries,
      eventsSeries,
      contactsSeries,
      visitsSeries,
    ] = await Promise.all([
      aggregateSeriesByCreatedAt(User, {}, days),
      aggregateSeriesByCreatedAt(Post, { isDeleted: false, type: 'article' }, days),
      aggregateSeriesByCreatedAt(Post, { isDeleted: false, type: 'event' }, days),
      aggregateSeriesByCreatedAt(Contact, {}, days),
      visitSeriesByDay(days),
    ]);

    const includeCompare = req.query.compare === '1' || req.query.compare === 'true';
    let seriesPrevious = null;
    if (includeCompare) {
      const endPrev = new Date();
      endPrev.setUTCDate(endPrev.getUTCDate() - days);
      const [
        usersSeriesPrev,
        articlesSeriesPrev,
        eventsSeriesPrev,
        contactsSeriesPrev,
        visitsSeriesPrev,
      ] = await Promise.all([
        aggregateSeriesByCreatedAtWindow(User, {}, days, endPrev),
        aggregateSeriesByCreatedAtWindow(Post, { isDeleted: false, type: 'article' }, days, endPrev),
        aggregateSeriesByCreatedAtWindow(Post, { isDeleted: false, type: 'event' }, days, endPrev),
        aggregateSeriesByCreatedAtWindow(Contact, {}, days, endPrev),
        visitSeriesByWindow(days, endPrev),
      ]);
      seriesPrevious = {
        users: usersSeriesPrev,
        articles: articlesSeriesPrev,
        events: eventsSeriesPrev,
        contacts: contactsSeriesPrev,
        visits: visitsSeriesPrev,
      };
    }

    const usersByRole = usersByRoleAgg.map((x) => ({ role: x._id || 'unknown', count: x.count }));
    const postsByType = postsByTypeAgg.map((x) => ({ type: x._id || 'unknown', count: x.count }));
    const articlesByCategory = articlesByCategoryAgg.map((x) => ({ category: x._id || 'Sans catégorie', count: x.count }));
    const eventsByCategory = eventsByCategoryAgg.map((x) => ({ category: x._id || 'Sans catégorie', count: x.count }));
    const commentRatingsDistribution = fillStars1to5(
      ratingDistAgg.map((x) => ({ rating: x._id, count: x.count }))
    );
    const avgCommentRating = avgRatingArr[0]?.avg != null ? Math.round(avgRatingArr[0].avg * 100) / 100 : null;

    const postRatingsDistribution = fillStars1to5(
      postRatingDistAgg.map((x) => ({ rating: x._id, count: x.count }))
    );
    const avisPostsTotalVotes = postRatingStatsAgg[0]?.totalVotes ?? 0;
    const avisPostsAvgRating =
      postRatingStatsAgg[0]?.avg != null ? Math.round(postRatingStatsAgg[0].avg * 100) / 100 : null;

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        periodDays: days,
        summary: {
          users: {
            total: totalUsers,
            active: activeUsers,
            byRole: usersByRole
          },
          posts: {
            total: totalPosts,
            byType: postsByType,
            articlesByCategory,
            eventsByCategory
          },
          comments: {
            total: totalComments,
            withRating: commentsWithRating,
            avgRating: avgCommentRating
          },
          /** Notes optionnelles sur le texte du commentaire (peu utilisé) */
          commentRatingsDistribution,
          /**
           * Avis sur articles & événements (Post.ratings) — principal affichage « avis » du site
           */
          avisPosts: {
            totalVotes: avisPostsTotalVotes,
            avgRating: avisPostsAvgRating,
            distribution: postRatingsDistribution
          },
          /** @deprecated utiliser avisPosts.distribution — conservé pour compat */
          ratingsDistribution: postRatingsDistribution,
          contacts: { total: totalContacts },
          partners: { total: totalPartners },
          questionnaires: { active: activeQuestionnaires },
          responses: { total: totalResponses },
          visits: {
            total: totalVisits,
            today: todayVisits,
            last30Days: monthVisits,
            uniqueVisitors: uniqueVisitorIds.length
          }
        },
        series: {
          users: usersSeries,
          articles: articlesSeries,
          events: eventsSeries,
          contacts: contactsSeries,
          visits: visitsSeries,
        },
        ...(seriesPrevious ? { seriesPrevious } : {}),
        visitsDetail: {
          weekVisits: await Visit.countDocuments({ visitedAt: { $gte: weekAgo } })
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
