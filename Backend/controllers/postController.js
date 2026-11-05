const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { moderateContent, moderateArticle, moderateEvent, moderateImage } = require('../utils/moderateContent');
const { getNextEventNumber } = require('../utils/nextEventNumber');
const { isUserRegistered, addRegistration, removeRegistration } = require('../utils/eventRegistration');
const { validateEventSchedule } = require('../utils/eventScheduleValidation');
const { queueNotifyPostPublished } = require('../utils/newsletterMail');
const { buildEventRevision, applyEventRevision } = require('../utils/eventRevision');
const { buildArticleRevision, applyArticleRevision } = require('../utils/articleRevision');
const { normalizeQuestionnairePayload, checkResponseSchedule, isEventEnded, EVENT_ENDED_MESSAGE } = require('../utils/eventQuestionnaireRules');
const { PUBLISHED_LOCK_CODE, LOCK_MESSAGES, isPostLocked } = require('../utils/publishedLock');

// @desc    Get all published posts (for consultation)
// @route   GET /api/posts
// @access  Public (Visitor + User)
exports.getAllPosts = async (req, res) => {
  console.log('CONTROLLER START: getAllPosts', req.query);
  try {
    const { type, category, level, page = 1, limit = 10, search } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

    const query = { status: 'published', isDeleted: false };

    if (type) query.type = type;
    if (category) query.category = category;
    if (level) query.level = level;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await Post.find(query)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ publishedAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      totalPages: Math.ceil(total / limitNum),
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

const populateSinglePost = (query) =>
  Post.findOne(query)
    .populate('author', 'username email createdAt')
    .populate('category', 'title description')
    .populate('level', 'name level description')
    .populate({
      path: 'comments',
      match: { isApproved: true },
      populate: { path: 'author', select: 'username email createdAt' }
    });

// @desc    Get single post by ID or slug
// @route   GET /api/posts/:idOrSlug
// @access  Public (Visitor + User)
exports.getPostById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    let post;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      post = await populateSinglePost({ isDeleted: false, _id: idOrSlug });
    } else if (/^\d+$/.test(idOrSlug)) {
      const n = parseInt(idOrSlug, 10);
      post = await populateSinglePost({ isDeleted: false, type: 'event', eventNumber: n });
      if (!post) {
        post = await populateSinglePost({ isDeleted: false, slug: idOrSlug });
      }
    } else {
      post = await populateSinglePost({ isDeleted: false, slug: idOrSlug });
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment view count
    post.viewCount += 1;
    await post.save();

    res.status(200).json({
      success: true,
      data: post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching post',
      error: error.message
    });
  }
};

// @desc    Get current user's posts
// @route   GET /api/posts/my-posts
// @access  Private (User)
exports.getMyPosts = async (req, res) => {
  try {
    const { type, status, page = 1, limit = 10 } = req.query;

    const query = { author: req.user.id, isDeleted: false };

    if (type) query.type = type;
    if (status) query.status = status;

    const posts = await Post.find(query)
      .select('+pendingRevision')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your posts',
      error: error.message
    });
  }
};

// @desc    Create a new article post
// @route   POST /api/posts/article
// @access  Private (User)
exports.createArticlePost = async (req, res) => {
  try {
    const { title, body, status, category, level, articleData } = req.body;

    const moderation = await moderateArticle({
      title,
      summary: articleData?.summary,
      content: articleData?.content || body,
      tags: articleData?.tags,
      imageUrl: articleData?.featuredImage
    });
    if (moderation.blocked) {
      return res.status(403).json({
        success: false,
        moderated: true,
        message: moderation.reason
      });
    }

    // Un utilisateur ne publie jamais lui-même : l'article attend la validation d'un administrateur
    const isStaff = ['superadmin', 'moderator'].includes(req.user.role);
    const initialStatus = isStaff ? (status || 'draft') : 'draft';
    const post = await Post.create({
      type: 'article',
      title,
      body,
      status: initialStatus,
      ...(isStaff ? {} : { moderation: { status: 'pending', submittedAt: new Date() } }),
      author: req.user.id,
      category,
      level,
      articleData: {
        content: articleData?.content || body,
        summary: articleData?.summary,
        readTime: articleData?.readTime || Math.ceil((articleData?.content || body || '').split(/\s+/).length / 200),
        tags: articleData?.tags,
        featuredImage: articleData?.featuredImage,
        featuredVideo: articleData?.featuredVideo,
        seo: articleData?.seo,
        articleType: ['article', 'news', 'guide', 'tutorial', 'case_study', 'success_story', 'testimonial'].includes(articleData?.articleType)
          ? articleData.articleType
          : 'article'
      }
    });

    if (initialStatus === 'published') {
      post.publishedAt = new Date();
      post.publishedOnce = true;
      await post.save();
      queueNotifyPostPublished(post._id);
    }

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(201).json({
      success: true,
      message: 'Article post created successfully',
      data: populatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating article post',
      error: error.message
    });
  }
};

// @desc    Create a new event post
// @route   POST /api/posts/event
// @access  Private (User)
exports.createEventPost = async (req, res) => {
  try {
    const { title, body, status, category, level, eventData, questionnaire } = req.body;

    // Questionnaire facultatif : validé avant toute création pour ne pas laisser d'événement orphelin
    let questionnairePayload = null;
    if (questionnaire) {
      const qCheck = normalizeQuestionnairePayload(questionnaire);
      if (!qCheck.ok) {
        return res.status(400).json({
          success: false,
          message: `Questionnaire : ${qCheck.message}`,
        });
      }
      // « Après la fin » n'est pas un choix de création : le questionnaire est créé après l'événement
      // depuis le panier (dans les 72 h). À la création de l'événement, il est donc publié « avant ».
      if (qCheck.value.publishMode === 'after_end') {
        return res.status(400).json({
          success: false,
          message: 'Questionnaire : à la création de l’événement, choisissez « Créer maintenant » ou « Créer après la fin ». Le mode « après la fin » se crée depuis votre panier après l’événement.',
        });
      }
      const sCheck = checkResponseSchedule(eventData, qCheck.value);
      if (!sCheck.ok) {
        return res.status(400).json({ success: false, message: `Questionnaire : ${sCheck.message}` });
      }
      questionnairePayload = questionnaire;
    }

    const modResult = await moderateEvent({
      title,
      body,
      location: eventData?.location,
      venue: eventData?.venue,
      eventImage: eventData?.eventImage,
    });
    if (modResult.blocked) {
      return res.status(403).json({
        success: false,
        moderated: true,
        message: modResult.reason,
      });
    }

    const resolvedEnd = eventData?.endDate
      ? new Date(eventData.endDate)
      : new Date(new Date(eventData?.startDate).getTime() + 90 * 60 * 1000);
    const scheduleCheck = validateEventSchedule(eventData?.startDate, resolvedEnd);
    if (!scheduleCheck.ok) {
      return res.status(400).json({
        success: false,
        message: scheduleCheck.message,
      });
    }

    const eventNumber = await getNextEventNumber();

    const post = await Post.create({
      type: 'event',
      eventNumber,
      title,
      body,
      status: 'draft',
      moderation: { status: 'pending', submittedAt: new Date() },
      author: req.user.id,
      category,
      level,
      eventData: {
        startDate: eventData?.startDate,
        endDate: resolvedEnd,
        location: eventData?.location,
        venue: eventData?.venue,
        isOnline: eventData?.isOnline || false,
        meetingLink: eventData?.meetingLink,
        capacity: eventData?.capacity,
        registeredUsers: [],
        eventImage: eventData?.eventImage
      }
    });

    let questionnaireResult = null;
    if (questionnairePayload) {
      // Chargé ici pour éviter une dépendance circulaire au chargement des contrôleurs
      const { createPendingQuestionnaire } = require('./eventQuestionnaireController');
      questionnaireResult = await createPendingQuestionnaire(post, req.user.id, questionnairePayload);
    }

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(201).json({
      success: true,
      message: 'Event post created successfully',
      data: populatedPost,
      questionnaire: questionnaireResult
        ? (questionnaireResult.ok
          ? { created: true, reviewStatus: questionnaireResult.doc.reviewStatus }
          : { created: false, message: questionnaireResult.message })
        : null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating event post',
      error: error.message
    });
  }
};

/**
 * Modification d'un événement par son créateur (non staff).
 * - Jamais publié (en attente / refusé) : la modification remplace le brouillon et repasse « en attente ».
 * - Validé et publié par un administrateur : plus aucune modification (403 PUBLISHED_LOCKED).
 * Le créateur ne peut jamais changer lui-même le statut de publication.
 * @param {object} changes { title, body, category, level, eventData }
 */
async function submitOwnEventUpdate(req, res, post, changes) {
  // Événement terminé : plus aucune modification par le créateur
  if (isEventEnded(post.eventData)) {
    return res.status(403).json({ success: false, code: 'EVENT_ENDED', message: EVENT_ENDED_MESSAGE });
  }
  // Validé et publié par un administrateur : figé pour le créateur
  if (isPostLocked(post)) {
    return res.status(403).json({ success: false, code: PUBLISHED_LOCK_CODE, message: LOCK_MESSAGES.event });
  }

  const { revision, datesChanged } = buildEventRevision(post, changes || {});

  const modResult = await moderateEvent({
    title: revision.title,
    body: revision.body,
    location: revision.eventData.location,
    venue: revision.eventData.venue,
    eventImage: revision.eventData.eventImage,
  });
  if (modResult.blocked) {
    return res.status(403).json({
      success: false,
      moderated: true,
      message: modResult.reason,
    });
  }

  if (datesChanged) {
    const scheduleCheck = validateEventSchedule(revision.eventData.startDate, revision.eventData.endDate);
    if (!scheduleCheck.ok) {
      return res.status(400).json({
        success: false,
        message: scheduleCheck.message,
      });
    }
  }

  const now = new Date();
  const isLive = post.status === 'published' || post.publishedOnce;
  let message;
  if (isLive) {
    post.pendingRevision = {
      ...revision,
      status: 'pending',
      rejectionReason: '',
      submittedAt: now,
    };
    message = 'Modification soumise. La version actuellement publiée reste visible jusqu’à la validation par un administrateur.';
  } else {
    applyEventRevision(post, revision);
    post.status = 'draft';
    post.moderation = { status: 'pending', reason: '', submittedAt: now };
    message = 'Événement mis à jour et soumis à validation.';
  }

  await post.save();

  const updatedPost = await Post.findById(post._id)
    .select('+pendingRevision')
    .populate('author', 'username email')
    .populate('category', 'title')
    .populate('level', 'name level');

  return res.status(200).json({
    success: true,
    message,
    data: updatedPost
  });
}

exports.submitOwnEventUpdate = submitOwnEventUpdate;

/**
 * Modification d'un article par son auteur (non staff) — même principe que pour les événements.
 * - Jamais publié (en attente / refusé) : la modification remplace le brouillon et repasse « en attente ».
 * - Validé et publié par un administrateur : plus aucune modification (403 PUBLISHED_LOCKED).
 * @param {object} changes { title, body, category, level, articleData }
 */
async function submitOwnArticleUpdate(req, res, post, changes) {
  if (isPostLocked(post)) {
    return res.status(403).json({ success: false, code: PUBLISHED_LOCK_CODE, message: LOCK_MESSAGES.article });
  }
  const { revision } = buildArticleRevision(post, changes || {});
  const ad = revision.articleData;

  const modResult = await moderateArticle({
    title: revision.title,
    summary: ad.summary,
    content: ad.content || revision.body,
    tags: ad.tags,
    imageUrl: ad.featuredImage
  });
  if (modResult.blocked) {
    return res.status(403).json({
      success: false,
      moderated: true,
      message: modResult.reason,
    });
  }

  const now = new Date();
  const isLive = post.status === 'published' || post.publishedOnce;
  let message;
  if (isLive) {
    post.pendingRevision = {
      ...revision,
      status: 'pending',
      rejectionReason: '',
      submittedAt: now,
    };
    message = 'Modification soumise. La version actuellement publiée reste visible jusqu’à la validation par un administrateur.';
  } else {
    applyArticleRevision(post, revision);
    post.status = 'draft';
    post.moderation = { status: 'pending', reason: '', submittedAt: now };
    message = 'Article mis à jour et soumis à validation.';
  }

  await post.save();

  const updatedPost = await Post.findById(post._id)
    .select('+pendingRevision')
    .populate('author', 'username email')
    .populate('category', 'title')
    .populate('level', 'name level');

  return res.status(200).json({
    success: true,
    message,
    data: updatedPost
  });
}

exports.submitOwnArticleUpdate = submitOwnArticleUpdate;

// @desc    Update a post (only owner can update)
// @route   PUT /api/posts/:id
// @access  Private (User - owner or Admin)
exports.updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id).select('+pendingRevision');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const prevStatus = post.status;

    const isStaff = ['superadmin', 'moderator'].includes(req.user.role);

    // Check ownership
    if (post.author.toString() !== req.user.id && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this post'
      });
    }

    // Événements : toute modification par le créateur est soumise à validation administrative
    if (!isStaff && post.type === 'event') {
      return submitOwnEventUpdate(req, res, post, req.body);
    }
    // Articles : même principe (la version publiée reste en ligne pendant la validation)
    if (!isStaff && post.type === 'article') {
      return submitOwnArticleUpdate(req, res, post, req.body);
    }

    // Regular users cannot edit posts that have been published (even if reverted to draft)
    if (!isStaff && (post.status === 'published' || post.publishedOnce)) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez plus modifier ce contenu car il a été publié par un administrateur.'
      });
    }

    const { title, body, status, category, level, articleData, eventData } = req.body;

    // Update Post fields
    if (title) post.title = title;
    if (body) post.body = body;
    if (status) post.status = status;
    if (category) post.category = category;
    if (level) post.level = level;

    // Update embedded articleData if type is article
    if (post.type === 'article' && articleData) {
      if (!post.articleData) post.articleData = {};
      if (articleData.content) post.articleData.content = articleData.content;
      if (articleData.summary) post.articleData.summary = articleData.summary;
      if (articleData.readTime) post.articleData.readTime = articleData.readTime;
      if (articleData.tags) post.articleData.tags = articleData.tags;
      if (articleData.featuredImage !== undefined) post.articleData.featuredImage = articleData.featuredImage;
      if (articleData.featuredVideo !== undefined) post.articleData.featuredVideo = articleData.featuredVideo;
      if (articleData.seo) post.articleData.seo = { ...post.articleData.seo, ...articleData.seo };
    }

    // Update embedded eventData if type is event
    if (post.type === 'event' && eventData) {
      if (!post.eventData) post.eventData = {};
      const startTouched = eventData.startDate != null && eventData.startDate !== '';
      const endTouched = eventData.endDate != null && eventData.endDate !== '';
      if (startTouched || endTouched) {
        const mergedStart = startTouched
          ? new Date(eventData.startDate)
          : new Date(post.eventData.startDate);
        let mergedEnd = endTouched
          ? new Date(eventData.endDate)
          : new Date(post.eventData.endDate || mergedStart);
        if (startTouched && !endTouched) {
          mergedEnd = new Date(mergedStart.getTime() + 90 * 60 * 1000);
        }
        const scheduleCheck = validateEventSchedule(mergedStart, mergedEnd);
        if (!scheduleCheck.ok) {
          return res.status(400).json({
            success: false,
            message: scheduleCheck.message,
          });
        }
        post.eventData.startDate = mergedStart;
        post.eventData.endDate = mergedEnd;
      }
      if (eventData.location) post.eventData.location = eventData.location;
      if (eventData.venue) post.eventData.venue = eventData.venue;
      if (typeof eventData.isOnline === 'boolean') post.eventData.isOnline = eventData.isOnline;
      if (eventData.meetingLink) post.eventData.meetingLink = eventData.meetingLink;
      if (eventData.capacity) post.eventData.capacity = eventData.capacity;
      if (eventData.eventImage) post.eventData.eventImage = eventData.eventImage;
    }

    if (post.status === 'published' && prevStatus !== 'published') {
      post.publishedAt = new Date();
      post.publishedOnce = true;
      if (post.type === 'event') {
        post.moderation = { status: 'approved', reason: '', reviewedAt: new Date(), reviewedBy: req.user._id };
      }
    }

    await post.save();

    if (post.status === 'published' && prevStatus !== 'published') {
      queueNotifyPostPublished(post._id);
    }

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating post',
      error: error.message
    });
  }
};

// @desc    Delete a post (soft delete, only owner can delete)
// @route   DELETE /api/posts/:id
// @access  Private (User - owner or Admin)
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id && !['superadmin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this post'
      });
    }

    // Soft delete
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

// @desc    Add comment to a post
// @route   POST /api/posts/:id/comments
// @access  Private (User)
/**
 * Le super administrateur ne laisse pas d'avis, et l'auteur ne peut pas noter, commenter ni réagir à sa propre publication.
 * @returns {string|null} message d'erreur, ou null si l'action est permise
 */
function interactionDenied(post, user, { allowAuthorReply = false } = {}) {
  if (user?.role === 'superadmin') return 'Le super administrateur ne peut pas laisser d’avis.';
  if (String(post.author) === String(user?._id || user?.id) && !allowAuthorReply) {
    return 'Vous ne pouvez pas noter, commenter ni réagir à votre propre publication.';
  }
  return null;
}

exports.addComment = async (req, res) => {
  console.log('ADD COMMENT:', { postId: req.params.id, userId: req.user?.id, body: req.body });
  try {
    const moderation = await moderateContent(req.body.content);
    if (moderation.blocked) {
      console.log('ADD COMMENT: blocked by moderation');
      return res.status(403).json({
        success: false,
        moderated: true,
        message: moderation.reason
      });
    }

    const post = await Post.findOne({
      _id: req.params.id,
      isDeleted: false
    });

    if (!post) {
      console.log('ADD COMMENT: post not found');
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // L'auteur peut répondre à un commentaire de sa publication (pas écrire de commentaire de premier niveau)
    // Réponse valide = commentaire parent existant sur cette même publication
    const isReply = !!req.body.parentComment
      && !!(await Comment.exists({ _id: req.body.parentComment, post: post._id }));
    const denied = interactionDenied(post, req.user, { allowAuthorReply: isReply });
    if (denied) {
      return res.status(403).json({ success: false, message: denied });
    }

    const commentData = {
      content: req.body.content,
      post: post._id,
      author: req.user.id
    };

    if (req.body.parentComment) {
      const parent = await Comment.findById(req.body.parentComment);
      if (parent && parent.post.toString() === post._id.toString()) {
        commentData.parentComment = parent._id;
      }
    }

    const comment = await Comment.create(commentData);

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'username email createdAt');

    console.log('ADD COMMENT: success', populatedComment._id);
    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: populatedComment
    });
  } catch (error) {
    console.error('ADD COMMENT ERROR:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error adding comment',
      error: error.message
    });
  }
};

// @desc    Get comments for a post
// @route   GET /api/posts/:id/comments
// @access  Public (Visitor + User)
exports.getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({
      post: req.params.id,
      isApproved: true
    })
      .populate('author', 'username email createdAt')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// @desc    Register for an event
// @route   POST /api/posts/:id/register
// @access  Private (User)
exports.registerForEvent = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      type: 'event',
      status: 'published',
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event post not found'
      });
    }

    // Check if event has passed
    if (post.isPast) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past events'
      });
    }

    // Check if event is full
    if (post.isFull) {
      return res.status(400).json({
        success: false,
        message: 'Event is at full capacity'
      });
    }

    const phone = String(req.body.phone ?? '').trim();
    const address = String(req.body.address ?? '').trim();
    if (!phone || !address) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and address are required'
      });
    }
    if (phone.length > 40 || address.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Phone or address exceeds maximum length'
      });
    }

    if (isUserRegistered(post.eventData, req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    addRegistration(post.eventData, req.user.id, phone, address);
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Successfully registered for event',
      data: {
        eventId: post._id,
        title: post.title,
        registeredCount: post.eventData.registeredUsers.length,
        capacity: post.eventData.capacity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering for event',
      error: error.message
    });
  }
};

// @desc    Unregister from an event
// @route   DELETE /api/posts/:id/register
// @access  Private (User)
exports.unregisterFromEvent = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      type: 'event',
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event post not found'
      });
    }

    if (!isUserRegistered(post.eventData, req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'You are not registered for this event'
      });
    }

    removeRegistration(post.eventData, req.user.id);
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Successfully unregistered from event'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unregistering from event',
      error: error.message
    });
  }
};

// @desc    Toggle reaction on a post
// @route   POST /api/posts/:id/react
// @access  Private (User)
exports.toggleReaction = async (req, res) => {
  try {
    const { type } = req.body;

    // Validate reaction type
    const validTypes = ['like', 'celebrate', 'support', 'love', 'insightful'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction type'
      });
    }

    const post = await Post.findOne({
      _id: req.params.id,
      status: 'published',
      isDeleted: false
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }
    const denied = interactionDenied(post, req.user);
    if (denied) {
      return res.status(403).json({ success: false, message: denied });
    }

    // Initialize reactions array if needed
    if (!post.reactions) {
      post.reactions = [];
    }

    // Check if user already reacted
    const existingReactionIndex = post.reactions.findIndex(
      r => r.user.toString() === req.user.id
    );

    if (existingReactionIndex > -1) {
      if (post.reactions[existingReactionIndex].type === type) {
        // Same reaction: toggle off (remove)
        post.reactions.splice(existingReactionIndex, 1);
      } else {
        // Different reaction: update
        post.reactions[existingReactionIndex].type = type;
      }
    } else {
      // New reaction: add
      post.reactions.push({
        user: req.user.id,
        type
      });
    }

    await post.save();

    // Calculate reaction counts
    const reactions = post.reactions.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        reactions,
        userReaction: post.reactions.find(r => r.user.toString() === req.user.id)?.type || null,
        totalReactions: post.reactions.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling reaction',
      error: error.message
    });
  }
};

// @desc    Rate a post (1-5 stars)
// @route   POST /api/posts/:id/rate
// @access  Private (User)
exports.ratePost = async (req, res) => {
  try {
    const { value } = req.body;
    const numVal = Number(value);
    if (!numVal || numVal < 1 || numVal > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    const post = await Post.findOne({ _id: req.params.id, status: 'published', isDeleted: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    const denied = interactionDenied(post, req.user);
    if (denied) return res.status(403).json({ success: false, message: denied });

    if (!post.ratings) post.ratings = [];
    const idx = post.ratings.findIndex(r => r.user.toString() === req.user.id);
    if (idx > -1) {
      post.ratings[idx].value = numVal;
    } else {
      post.ratings.push({ user: req.user.id, value: numVal });
    }

    await post.save();

    const avg = post.ratings.reduce((s, r) => s + r.value, 0) / post.ratings.length;

    res.status(200).json({
      success: true,
      data: {
        averageRating: Math.round(avg * 10) / 10,
        totalRatings: post.ratings.length,
        userRating: numVal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error rating post', error: error.message });
  }
};

// @desc    Toggle favorite
// @route   POST /api/posts/:id/favorite
// @access  Private (User)
exports.toggleFavorite = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findOne({ _id: postId, isDeleted: false });
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const user = await User.findById(req.user.id);
    if (!user.favorites) user.favorites = [];

    const index = user.favorites.findIndex(f => f.toString() === postId);
    const isFavorited = index > -1;

    if (isFavorited) {
      user.favorites.splice(index, 1);
    } else {
      user.favorites.push(postId);
    }
    await user.save();

    res.status(200).json({
      success: true,
      data: { isFavorited: !isFavorited, totalFavorites: user.favorites.length }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling favorite', error: error.message });
  }
};

// @desc    Get user's favorite posts
// @route   GET /api/posts/user/favorites
// @access  Private (User)
exports.getUserFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      match: { isDeleted: false },
      populate: [
        { path: 'author', select: 'username email' },
        { path: 'category', select: 'title' },
        { path: 'level', select: 'name level' }
      ]
    });

    const favorites = (user.favorites || []).filter(Boolean);

    res.status(200).json({ success: true, count: favorites.length, data: favorites });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching favorites', error: error.message });
  }
};
