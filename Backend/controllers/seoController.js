const { generateSitemap, generateRobotsTxt } = require('../utils/sitemapGenerator');

// @desc    Get XML Sitemap
// @route   GET /sitemap.xml
// @access  Public
exports.getSitemap = async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const sitemap = await generateSitemap(baseUrl);
    
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemap);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating sitemap',
      error: error.message
    });
  }
};

// @desc    Get robots.txt
// @route   GET /robots.txt
// @access  Public
exports.getRobotsTxt = async (req, res) => {
  try {
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const robotsTxt = generateRobotsTxt(baseUrl);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(robotsTxt);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating robots.txt',
      error: error.message
    });
  }
};
