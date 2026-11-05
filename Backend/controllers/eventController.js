const Post = require('../models/Post');
const { moderateEvent } = require('../utils/moderateContent');
const { getNextEventNumber } = require('../utils/nextEventNumber');
const { isUserRegistered, addRegistration, removeRegistration } = require('../utils/eventRegistration');
const { validateEventSchedule } = require('../utils/eventScheduleValidation');
const { submitOwnEventUpdate } = require('./postController');

function findOneEvent(extraQuery) {
  return Post.findOne({ type: 'event', isDeleted: false, ...extraQuery })
    .populate('author', 'username email')
    .populate('category', 'title description')
    .populate('level', 'name level description')
    .populate('eventData.registeredUsers', 'username email')
    .populate({
      path: 'comments',
      match: { isApproved: true },
      populate: { path: 'author', select: 'username' }
    });
}

// @desc    Get all published events
// @route   GET /api/events
// @access  Public (Visitor + User)
exports.getAllEvents = async (req, res) => {
  try {
    const { category, level, upcoming, online, page = 1, limit = 10, search } = req.query;
    
    const query = { 
      type: 'event', 
      status: 'published', 
      isDeleted: false 
    };
    
    if (category) query.category = category;
    if (level) query.level = level;
    if (online === 'true') query['eventData.isOnline'] = true;
    if (online === 'false') query['eventData.isOnline'] = false;

    // Filter for upcoming events only
    if (upcoming === 'true') {
      query['eventData.startDate'] = { $gt: new Date() };
    }

    // Search in title, body, or location
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { 'eventData.location': { $regex: search, $options: 'i' } },
        { 'eventData.venue': { $regex: search, $options: 'i' } }
      ];
    }

    const posts = await Post.find(query)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ 'eventData.startDate': 1 })
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
      message: 'Error fetching events',
      error: error.message
    });
  }
};

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public (Visitor + User)
exports.getUpcomingEvents = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const posts = await Post.find({
      type: 'event',
      status: 'published',
      isDeleted: false,
      'eventData.startDate': { $gt: new Date() }
    })
      .populate('author', 'username email')
      .populate('category', 'title')
      .sort({ 'eventData.startDate': 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming events',
      error: error.message
    });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public (Visitor + User)
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    let post;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      post = await findOneEvent({ _id: id });
    } else if (/^\d+$/.test(id)) {
      const n = parseInt(id, 10);
      post = await findOneEvent({ eventNumber: n });
      if (!post) {
        post = await findOneEvent({ slug: id });
      }
    } else {
      post = await findOneEvent({ slug: id });
    }

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
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
      message: 'Error fetching event',
      error: error.message
    });
  }
};

// @desc    Get current user's events
// @route   GET /api/events/my-events
// @access  Private (User)
exports.getMyEvents = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { 
      author: req.user.id, 
      type: 'event',
      isDeleted: false 
    };
    
    if (status) query.status = status;

    const events = await Post.find(query)
      .select('+pendingRevision')
      .populate('category', 'title')
      .populate('level', 'name level')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching your events',
      error: error.message
    });
  }
};

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (User)
exports.createEvent = async (req, res) => {
  try {
    const { 
      title, 
      body, 
      status, 
      category, 
      level,
      // Embedded event data
      startDate,
      endDate,
      location,
      venue,
      isOnline,
      meetingLink,
      capacity,
      eventImage
    } = req.body;

    const modResult = await moderateEvent({ title, body, location, venue, eventImage });
    if (modResult.blocked) {
      return res.status(403).json({
        success: false,
        moderated: true,
        message: modResult.reason,
      });
    }

    const resolvedEnd = endDate
      ? new Date(endDate)
      : new Date(new Date(startDate).getTime() + 90 * 60 * 1000);
    const scheduleCheck = validateEventSchedule(startDate, resolvedEnd);
    if (!scheduleCheck.ok) {
      return res.status(400).json({
        success: false,
        message: scheduleCheck.message,
      });
    }

    const eventNumber = await getNextEventNumber();

    // Events always start as draft, admin must approve
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
        startDate,
        endDate: resolvedEnd,
        location,
        venue,
        isOnline: isOnline || false,
        meetingLink,
        capacity,
        registeredUsers: [],
        eventImage
      }
    });

    const populatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: populatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: error.message
    });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (User - owner or Admin)
exports.updateEvent = async (req, res) => {
  try {
    let post = await Post.findOne({ 
      _id: req.params.id, 
      type: 'event' 
    }).select('+pendingRevision');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    const isStaff = ['superadmin', 'moderator'].includes(req.user.role);
    if (post.author.toString() !== req.user.id && !isStaff) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this event'
      });
    }

    // Créateur : modification soumise à validation (la version publiée reste en ligne)
    if (!isStaff) {
      const b = req.body || {};
      return submitOwnEventUpdate(req, res, post, {
        title: b.title,
        body: b.body,
        category: b.category,
        level: b.level,
        eventData: {
          startDate: b.startDate,
          endDate: b.endDate,
          location: b.location,
          venue: b.venue,
          isOnline: b.isOnline,
          meetingLink: b.meetingLink,
          capacity: b.capacity,
          eventImage: b.eventImage,
        },
      });
    }

    const { 
      title, 
      body, 
      status, 
      category, 
      level,
      startDate,
      endDate,
      location,
      venue,
      isOnline,
      meetingLink,
      capacity,
      eventImage
    } = req.body;

    const modResult = await moderateEvent({
      title: title || post.title,
      body: body || post.body,
      location: location || post.eventData?.location,
      venue: venue || post.eventData?.venue,
      eventImage: eventImage || post.eventData?.eventImage,
    });
    if (modResult.blocked) {
      return res.status(403).json({
        success: false,
        moderated: true,
        message: modResult.reason,
      });
    }

    if (title) post.title = title;
    if (body) post.body = body;
    if (status) post.status = status;
    if (category) post.category = category;
    if (level) post.level = level;

    // Update embedded eventData
    if (!post.eventData) post.eventData = {};
    if (location) post.eventData.location = location;
    if (venue) post.eventData.venue = venue;
    if (typeof isOnline === 'boolean') post.eventData.isOnline = isOnline;
    if (meetingLink) post.eventData.meetingLink = meetingLink;
    if (capacity) post.eventData.capacity = capacity;
    if (eventImage) post.eventData.eventImage = eventImage;

    const datesTouched = startDate != null || endDate != null;
    if (datesTouched) {
      const mergedStart = startDate ? new Date(startDate) : new Date(post.eventData.startDate);
      let mergedEnd = endDate != null && endDate !== ''
        ? new Date(endDate)
        : new Date(post.eventData.endDate || mergedStart);
      if (startDate && (endDate == null || endDate === '')) {
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

    await post.save();

    const updatedPost = await Post.findById(post._id)
      .populate('author', 'username email')
      .populate('category', 'title')
      .populate('level', 'name level');

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: updatedPost
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating event',
      error: error.message
    });
  }
};

// @desc    Delete an event (soft delete)
// @route   DELETE /api/events/:id
// @access  Private (User - owner or Admin)
exports.deleteEvent = async (req, res) => {
  try {
    const post = await Post.findOne({ 
      _id: req.params.id, 
      type: 'event' 
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id && !['superadmin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this event'
      });
    }

    // Soft delete
    post.isDeleted = true;
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting event',
      error: error.message
    });
  }
};

// @desc    Register for an event
// @route   POST /api/events/:id/register
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
        message: 'Event not found'
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
// @route   DELETE /api/events/:id/register
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
        message: 'Event not found'
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

// @desc    Get events user is registered for
// @route   GET /api/events/registered
// @access  Private (User)
exports.getRegisteredEvents = async (req, res) => {
  try {
    const pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const userId = String(req.user._id || req.user.id);

    const query = {
      type: 'event',
      status: 'published',
      isDeleted: false,
      $or: [
        { 'eventData.registeredUsers': req.user._id || req.user.id },
        { 'eventData.eventRegistrations.user': req.user._id || req.user.id }
      ]
    };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .select('title slug eventNumber eventData.startDate eventData.endDate eventData.location eventData.eventImage eventData.eventRegistrations eventData.capacity')
        .sort({ 'eventData.startDate': -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Post.countDocuments(query)
    ]);

    // Données limitées à l'utilisateur : jamais les coordonnées des autres inscrits
    const now = Date.now();
    const data = posts.map((p) => {
      const ed = p.eventData || {};
      const mine = (ed.eventRegistrations || []).find((r) => String(r.user) === userId);
      const end = ed.endDate || ed.startDate;
      return {
        _id: p._id,
        title: p.title,
        slug: p.slug,
        eventNumber: p.eventNumber,
        startDate: ed.startDate || null,
        endDate: ed.endDate || null,
        location: ed.location || '',
        eventImage: ed.eventImage || '',
        registeredAt: mine?.registeredAt || null,
        isPast: end ? new Date(end).getTime() < now : false
      };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      total,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
      currentPage: pageNum,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching registered events',
      error: error.message
    });
  }
};

// @desc    Get event attendees (for event owner/admin)
// @route   GET /api/events/:id/attendees
// @access  Private (Owner/Admin)
exports.getEventAttendees = async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      type: 'event'
    })
      .populate('eventData.registeredUsers', 'username email')
      .populate('eventData.eventRegistrations.user', 'username email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check ownership
    if (post.author.toString() !== req.user.id && !['superadmin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view attendees'
      });
    }

    const regByUser = {};
    for (const r of post.eventData.eventRegistrations || []) {
      const uid = String(r.user?._id || r.user);
      regByUser[uid] = {
        phone: r.phone || '',
        address: r.address || '',
        registeredAt: r.registeredAt || null
      };
    }

    const users = post.eventData.registeredUsers || [];
    const data = users.map((u) => {
      const uid = String(u._id || u);
      const extra = regByUser[uid] || { phone: '', address: '', registeredAt: null };
      const username = typeof u === 'object' && u ? u.username : undefined;
      const email = typeof u === 'object' && u ? u.email : undefined;
      return {
        _id: u._id || u,
        username,
        email,
        phone: extra.phone,
        address: extra.address,
        registeredAt: extra.registeredAt
      };
    });

    res.status(200).json({
      success: true,
      count: users.length,
      capacity: post.eventData.capacity,
      isFull: post.isFull,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching event attendees',
      error: error.message
    });
  }
};

// @desc    Export event to iCal format (.ics file)
// @route   GET /api/events/:id/ical
// @access  Public
exports.exportEventToICal = async (req, res) => {
  try {
    const { generateICalEvent } = require('../utils/sitemapGenerator');
    
    const post = await Post.findOne({ 
      _id: req.params.id, 
      type: 'event',
      status: 'published',
      isDeleted: false 
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const icalContent = generateICalEvent(post);
    
    // Sanitize filename
    const filename = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50);
    
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.ics"`);
    res.send(icalContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error exporting event to iCal',
      error: error.message
    });
  }
};

// @desc    Get Google Calendar URL for event
// @route   GET /api/events/:id/google-calendar
// @access  Public
exports.getGoogleCalendarUrl = async (req, res) => {
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
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        googleCalendarUrl: post.googleCalendarUrl,
        iCalUrl: post.iCalUrl
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting calendar URLs',
      error: error.message
    });
  }
};
