const Visit = require('../models/Visit');
const crypto = require('crypto');

// Helper to generate anonymous visitor ID
const generateVisitorId = () => {
    return crypto.randomBytes(16).toString('hex');
};

// Helper to hash IP for privacy
const hashIP = (ip) => {
    if (!ip) return null;
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
};

// @desc    Track a page visit
// @route   POST /api/visits/track
// @access  Public
exports.trackVisit = async (req, res) => {
    try {
        const { page, visitorId, referrer } = req.body;

        // Get IP from request (may be behind proxy)
        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;

        const visit = await Visit.create({
            visitorId: visitorId || generateVisitorId(),
            ipHash: hashIP(ip),
            page: page || '/',
            userAgent: req.headers['user-agent'],
            referrer: referrer || req.headers.referer
        });

        res.status(201).json({
            success: true,
            visitorId: visit.visitorId
        });
    } catch (error) {
        // Don't fail silently - just log
        console.error('Visit tracking error:', error.message);
        res.status(200).json({ success: true }); // Don't break the site if tracking fails
    }
};

// @desc    Get visitor statistics
// @route   GET /api/visits/stats
// @access  Private/Admin
exports.getVisitStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now.setHours(0, 0, 0, 0));
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Total visits
        const totalVisits = await Visit.countDocuments();

        // Today's visits
        const todayVisits = await Visit.countDocuments({
            visitedAt: { $gte: todayStart }
        });

        // Unique visitors (by visitorId)
        const uniqueVisitors = await Visit.distinct('visitorId');

        // Today's unique visitors
        const todayUniqueVisitors = await Visit.distinct('visitorId', {
            visitedAt: { $gte: todayStart }
        });

        // This week's visits
        const weekVisits = await Visit.countDocuments({
            visitedAt: { $gte: weekAgo }
        });

        // This month's visits
        const monthVisits = await Visit.countDocuments({
            visitedAt: { $gte: monthAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                totalVisits,
                todayVisits,
                uniqueVisitors: uniqueVisitors.length,
                todayUniqueVisitors: todayUniqueVisitors.length,
                weekVisits,
                monthVisits
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching visit stats',
            error: error.message
        });
    }
};
