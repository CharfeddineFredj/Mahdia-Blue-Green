const mongoose = require('mongoose');
const { isUserRegistered, addRegistration } = require('../utils/eventRegistration');

// Embedded SEO Schema
const seoSchema = new mongoose.Schema({
  metaTitle: { type: String, maxlength: 60 },
  metaDescription: { type: String, maxlength: 160 },
  keywords: [{ type: String }]
}, { _id: false });

// Embedded ArticleData Schema
const articleDataSchema = new mongoose.Schema({
  content: { type: String },
  summary: { type: String, maxlength: 500 },
  readTime: { type: Number, default: 0 },
  // Article type for categorization (Success Stories, Guides, etc.)
  articleType: {
    type: String,
    enum: ['article', 'success_story', 'guide', 'case_study', 'testimonial', 'news', 'tutorial'],
    default: 'article'
  },
  tags: [{ type: String, trim: true }],
  featuredImage: { type: String },
  featuredVideo: { type: String },
  seo: seoSchema
}, { _id: false });

const eventRegistrationEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  phone: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  registeredAt: { type: Date, default: Date.now },
}, { _id: true });

// Embedded EventData Schema
const eventDataSchema = new mongoose.Schema({
  startDate: { type: Date },
  endDate: { type: Date },
  location: { type: String },
  venue: { type: String },
  isOnline: { type: Boolean, default: false },
  meetingLink: { type: String },
  capacity: { type: Number },
  registeredUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  /** Détails d'inscription (téléphone, adresse) par participant */
  eventRegistrations: {
    type: [eventRegistrationEntrySchema],
    default: [],
  },
  eventImage: { type: String },
  // Reminder settings
  reminderEnabled: { type: Boolean, default: true },
  reminderDays: { type: Number, default: 1 }, // Days before event to send reminder
  reminderSent: { type: Boolean, default: false },
  // Timezone for calendar export
  timezone: { type: String, default: 'Africa/Tunis' }
}, { _id: false });

/** Décision administrative sur la version courante (événements proposés par les utilisateurs) */
const moderationSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reason: { type: String, trim: true, default: '' },
  submittedAt: { type: Date },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

/** Modification d'un événement ou d'un article publié en attente de validation (la version publiée reste en ligne) */
const pendingRevisionSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  body: { type: String },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  level: { type: mongoose.Schema.Types.ObjectId, ref: 'Level' },
  articleData: {
    content: { type: String },
    summary: { type: String, maxlength: 500 },
    readTime: { type: Number },
    articleType: { type: String },
    tags: { type: [String], default: undefined },
    featuredImage: { type: String },
    featuredVideo: { type: String }
  },
  eventData: {
    startDate: { type: Date },
    endDate: { type: Date },
    location: { type: String },
    venue: { type: String },
    isOnline: { type: Boolean },
    meetingLink: { type: String },
    capacity: { type: Number },
    eventImage: { type: String }
  },
  status: {
    type: String,
    enum: ['pending', 'rejected'],
    default: 'pending'
  },
  rejectionReason: { type: String, trim: true, default: '' },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: false });

const postSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['article', 'event'],
    required: [true, 'Post type is required']
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  /** Public sequential id for events (1, 2, 3…) — used in /evenement/:id URLs */
  eventNumber: {
    type: Number,
    unique: true,
    sparse: true,
    min: 1,
  },
  body: {
    type: String,
    required: [true, 'Post body is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Embedded article data (if type = 'article')
  articleData: articleDataSchema,
  // Embedded event data (if type = 'event')
  eventData: eventDataSchema,
  moderation: moderationSchema,
  /** Non renvoyé par défaut (routes publiques) : sélectionner explicitement avec '+pendingRevision' */
  pendingRevision: {
    type: pendingRevisionSchema,
    default: null,
    select: false
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  level: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Level'
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  publishedAt: {
    type: Date
  },
  publishedOnce: {
    type: Boolean,
    default: false
  },
  /** Email newsletter auto-envoyé une fois à la publication (évite les doublons) */
  newsletterSentAt: {
    type: Date,
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'celebrate', 'support', 'love', 'insightful'],
      required: true
    }
  }],
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    value: {
      type: Number,
      min: 1,
      max: 5,
      required: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comments
postSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'post'
});

// Virtual for event: isFull
postSchema.virtual('isFull').get(function () {
  if (this.type !== 'event' || !this.eventData) return false;
  if (!this.eventData.capacity) return false;
  return this.eventData.registeredUsers?.length >= this.eventData.capacity;
});

// Virtual for event: Google Calendar URL
postSchema.virtual('googleCalendarUrl').get(function () {
  if (this.type !== 'event' || !this.eventData) return null;

  const formatDate = (date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '');
  };

  const startDate = this.eventData.startDate ? formatDate(this.eventData.startDate) : '';
  const endDate = this.eventData.endDate ? formatDate(this.eventData.endDate) : startDate;
  const location = this.eventData.isOnline
    ? (this.eventData.meetingLink || 'Online')
    : `${this.eventData.venue || ''}, ${this.eventData.location || ''}`.trim();

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: this.title,
    dates: `${startDate}/${endDate}`,
    details: this.body.substring(0, 500),
    location: location,
    ctz: this.eventData.timezone || 'Africa/Tunis'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
});

// Virtual for event: iCal URL (to be served by API)
postSchema.virtual('iCalUrl').get(function () {
  if (this.type !== 'event' || !this.eventData) return null;
  return `/api/events/${this._id}/ical`;
});

// Virtual for event: isPast
postSchema.virtual('isPast').get(function () {
  if (this.type !== 'event' || !this.eventData) return false;
  return this.eventData.endDate < new Date();
});

// Index for efficient queries
postSchema.index({ type: 1, status: 1 });
postSchema.index({ author: 1 });
postSchema.index({ category: 1 });
postSchema.index({ slug: 1 });
postSchema.index({ 'articleData.tags': 1 });
postSchema.index({ 'eventData.startDate': 1 });

// Generate slug from title
postSchema.pre('save', function () {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') +
      '-' + Date.now().toString(36);
  }

  if (this.isModified('status') && this.status === 'published') {
    if (!this.publishedAt) this.publishedAt = new Date();
    this.publishedOnce = true;
    // Une publication par un administrateur vaut approbation de la version en ligne
    if (this.moderation && this.moderation.status !== 'approved') {
      this.moderation.status = 'approved';
      this.moderation.reason = '';
      if (!this.moderation.reviewedAt) this.moderation.reviewedAt = new Date();
    }
  }
});

// Static method to get published posts
postSchema.statics.getPublishedPosts = function (type = null) {
  const query = { status: 'published', isDeleted: false };
  if (type) query.type = type;
  return this.find(query)
    .populate('author', 'username email')
    .populate('category', 'title')
    .populate('level', 'name level')
    .sort({ publishedAt: -1 });
};

// Static method to get user's posts
postSchema.statics.getUserPosts = function (userId) {
  return this.find({ author: userId, isDeleted: false })
    .populate('category', 'title')
    .populate('level', 'name level')
    .sort({ createdAt: -1 });
};

// Static method for event registration
postSchema.statics.registerForEvent = async function (postId, userId) {
  const post = await this.findById(postId);
  if (!post || post.type !== 'event') {
    throw new Error('Event not found');
  }
  if (post.isFull) {
    throw new Error('Event is full');
  }
  if (post.isPast) {
    throw new Error('Event has already ended');
  }
  if (isUserRegistered(post.eventData, userId)) {
    throw new Error('Already registered for this event');
  }
  addRegistration(post.eventData, userId, '', '');
  return post.save();
};

module.exports = mongoose.model('Post', postSchema);
