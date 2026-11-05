const express = require('express');
const router = express.Router();
const { getSitemap, getRobotsTxt } = require('../controllers/seoController');

// SEO Routes - Public access
router.get('/sitemap.xml', getSitemap);
router.get('/robots.txt', getRobotsTxt);

module.exports = router;
