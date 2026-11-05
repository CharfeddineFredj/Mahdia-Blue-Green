const express = require('express');
const router = express.Router();
const { trackVisit, getVisitStats } = require('../controllers/visitController');
const { protect, isAdmin } = require('../middleware/auth');

// Public - track visits
router.post('/track', trackVisit);

// Admin - get stats
router.get('/stats', protect, isAdmin, getVisitStats);

module.exports = router;
