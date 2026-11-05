const Post = require('../models/Post');
const { moderateArticle } = require('../utils/moderateContent');
const { submitOwnArticleUpdate } = require('./postController');

// @desc    Get all published articles
// @route   GET /api/articles
// @access  Public (Visitor + User)
exports.getAllArticles = async (req, res) => {
  try {
    const { category, level, tag, page = 1, limit = 10, search } = req.query;
    
    const query = { 
      type: 'article', 
      status: 'published', 
      isDeleted: false 
    };
    
    if (category) query.category = category;
    if (level) query.level = level;
    if (tag) query['articleData.tags'] = tag;

    // Search in title, body, or article content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { 'articleData.content': { $regex: search, $options: 'i' } }
      ];
    }

    const articles = await Post.find(query)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: articles.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching articles',
      error: error.message
    });
  }
};

// @desc    Get single article by ID or slug
// @route   GET /api/articles/:idOrSlug
// @access  Public (Visitor + User)
exports.getArticleById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    
    // Try to find by ID first, then by slug
    let query = { type: 'article', isDeleted: false };
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      query._id = idOrSlug;
    } else {
      query.slug = idOrSlug;
    }

    const post = await Post.findOne(query)
      .populate('author', 'username email')
      .populate('category', 'title description')
      .populate('level', 'name level description')
      .populate({
        path: 'comments',
        match: { isApproved: true },
        populate: { path: 'author', select: 'username' }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
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
      message: 'Error fetching article',
      error: error.message
    });
  }
};

// @desc    Get current user's articles
// @route   GET /api/articles/my-articles
// @access  Private (User)
exports.getMyArticles = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { 
      author: req.user.id, 
      type: 'article',
      isDeleted: false 
    };
    
    if (status) query.status = status;

    const articles = await Post.find(query)
      .select('+pendingRevision')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: articles.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your articles',
      error: error.message
    });
  }
};

// @desc    Create a new article
// @route   POST /api/articles
// @access  Private (User)
exports.createArticle = async (req, res) => {
  try {
    const { 
      title, 
      body, 
      status, 
      category, 
      level,
      content,
      summary,
      readTime,
      tags,
      featuredImage,
      featuredVideo,
      seo,
      articleType
    } = req.body;

    const moderation = await moderateArticle({ title, summary, content: content || body, tags, imageUrl: featuredImage });
    if (moderation.blocked) {
      return res.status(403).json({
        success: false,
        moderated: true,
        message: moderation.reason
      });
    }

    // Un utilisateur ne publie jamais lui-même : l'article attend la validation d'un administrateur
    const isStaff = ['superadmin', 'moderator', 'analyst'].includes(req.user.role);
    const initialStatus = isStaff ? (status || 'draft') : 'draft';
    const postDoc = {
      type: 'article',
      title,
      body,
      status: initialStatus,
      ...(isStaff ? {} : { moderation: { status: 'pending', submittedAt: new Date() } }),
      author: req.user.id,
      category,
      level,
      articleData: {
        content: content || body,
        summary,
        readTime: readTime || Math.ceil((content || body || '').split(/\s+/).length / 200),
        tags,
        featuredImage,
        featuredVideo,
        seo,
        ...(articleType ? { articleType } : {})
      }
    };
    if (initialStatus === 'published') {
      postDoc.publishedAt = new Date();
    }
    const post = await Post.create(postDoc);

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(201).json({
      success: true,
      message: 'Article created successfully',
      data: populatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating article',
      error: error.message
    });
  }
};

// @desc    Update an article
// @route   PUT /api/articles/:id
// @access  Private (User - owner or Admin)
exports.updateArticle = async (req, res) => {
  try {
    let post = await Post.findOne({ 
      _id: req.params.id, 
      type: 'article' 
    }).select('+pendingRevision');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    const isStaff = ['superadmin', 'moderator', 'analyst'].includes(req.user.role);

    // Check ownership
    if (post.author.toString() !== req.user.id && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this article'
      });
    }

    // Auteur : modification soumise à validation (la version publiée reste en ligne)
    if (!isStaff) {
      const b = req.body || {};
      return submitOwnArticleUpdate(req, res, post, {
        title: b.title,
        body: b.body,
        category: b.category,
        level: b.level,
        articleData: {
          content: b.content,
          summary: b.summary,
          readTime: b.readTime,
          articleType: b.articleType,
          tags: b.tags,
          featuredImage: b.featuredImage,
          featuredVideo: b.featuredVideo,
        },
      });
    }

    const { 
      title, 
      body, 
      status, 
      category, 
      level,
      content,
      summary,
      readTime,
      tags,
      featuredImage,
      featuredVideo,
      seo,
      articleType
    } = req.body;

    const moderation = await moderateArticle({
      title: title || post.title,
      summary: summary || post.articleData?.summary,
      content: content || body || post.articleData?.content,
      tags: tags || post.articleData?.tags,
      imageUrl: featuredImage
    });
    if (moderation.blocked) {
      return res.status(403).json({
        success: false,
        moderated: true,
        message: moderation.reason
      });
    }

    if (title) post.title = title;
    if (body) post.body = body;
    if (status) {
      post.status = status;
      if (status === 'published' && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }
    if (category) post.category = category;
    if (level) post.level = level;

    if (!post.articleData) post.articleData = {};
    if (content) post.articleData.content = content;
    if (summary) post.articleData.summary = summary;
    if (readTime !== undefined && readTime !== null && readTime !== '') {
      post.articleData.readTime = Number(readTime);
    }
    if (tags) post.articleData.tags = tags;
    if (articleType !== undefined && articleType !== '') {
      post.articleData.articleType = articleType;
    }
    if (featuredImage !== undefined) post.articleData.featuredImage = featuredImage;
    if (featuredVideo !== undefined) post.articleData.featuredVideo = featuredVideo;
    if (seo) post.articleData.seo = { ...post.articleData.seo, ...seo };

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(200).json({
      success: true,
      message: 'Article updated successfully',
      data: updatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating article',
      error: error.message
    });
  }
};

// @desc    Delete an article (soft delete)
// @route   DELETE /api/articles/:id
// @access  Private (User - owner or Admin)
exports.deleteArticle = async (req, res) => {
  try {
    const post = await Post.findOne({ 
      _id: req.params.id, 
      type: 'article' 
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id && !['superadmin', 'moderator', 'analyst'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this article'
      });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Article deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting article',
      error: error.message
    });
  }
};

// @desc    Get articles by tag
// @route   GET /api/articles/tag/:tag
// @access  Public (Visitor + User)
exports.getArticlesByTag = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const tag = req.params.tag;

    const query = {
      type: 'article',
      status: 'published',
      isDeleted: false,
      'articleData.tags': tag
    };

    const posts = await Post.find(query)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: posts.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      tag,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching articles by tag',
      error: error.message
    });
  }
};

// @desc    Get featured/popular articles
// @route   GET /api/articles/featured
// @access  Public (Visitor + User)
exports.getFeaturedArticles = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const articles = await Post.find({
      type: 'article',
      status: 'published',
      isDeleted: false
    })
      .populate('author', 'username')
      .populate('category', 'title')
      .select('title slug body articleData.summary articleData.featuredImage viewCount publishedAt')
      .sort({ viewCount: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching featured articles',
      error: error.message
    });
  }
};

// @desc    Get all tags with count
// @route   GET /api/articles/tags
// @access  Public (Visitor + User)
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Post.aggregate([
      { $match: { type: 'article', status: 'published', isDeleted: false } },
      { $unwind: '$articleData.tags' },
      { $group: { _id: '$articleData.tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    res.status(200).json({
      success: true,
      count: tags.length,
      data: tags
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tags',
      error: error.message
    });
  }
};
