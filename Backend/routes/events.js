const express = require('express');
const router = express.Router();
const {
  getAllEvents,
  getUpcomingEvents,
  getEventById,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  registerForEvent,
  unregisterFromEvent,
  getRegisteredEvents,
  getEventAttendees,
  exportEventToICal,
  getGoogleCalendarUrl
} = require('../controllers/eventController');
const { protect } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES - Visitor (unauthenticated) access
// ============================================
router.get('/', getAllEvents);                      // Visitor: GET all published events
router.get('/upcoming', getUpcomingEvents);         // Visitor: GET upcoming events

// ============================================
// PRIVATE ROUTES - User (authenticated) access
// Requires: Full token (questionnaireCompleted = true)
// ============================================
router.get('/user/my-events', protect, getMyEvents);           // User: GET current user's events
router.get('/user/registered', protect, getRegisteredEvents);  // User: GET events user registered for
router.post('/', protect, createEvent);                        // User: CREATE event

// ============================================
// PARAMETERIZED ROUTES (must come after static routes)
// ============================================
router.get('/:id', getEventById);                   // Visitor: GET single event
router.get('/:id/ical', exportEventToICal);         // Visitor: Export event to iCal (.ics file)
router.get('/:id/google-calendar', getGoogleCalendarUrl); // Visitor: Get Google Calendar URL
router.put('/:id', protect, updateEvent);                      // User: UPDATE event (owner only)
router.delete('/:id', protect, deleteEvent);                   // User: DELETE event (owner only)

// Event registration (User only)
router.post('/:id/register', protect, registerForEvent);       // User: Register for event
router.delete('/:id/register', protect, unregisterFromEvent);  // User: Unregister from event
router.get('/:id/attendees', protect, getEventAttendees);      // User: Get attendees (owner only)

module.exports = router;
