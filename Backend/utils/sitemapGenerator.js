const Post = require('../models/Post');
const Category = require('../models/Category');

/**
 * Generate XML Sitemap for SEO
 * @param {string} baseUrl - The base URL of the site
 * @returns {string} XML sitemap content
 */
const generateSitemap = async (baseUrl = 'https://mahdiablueandgreen.tn') => {
  const urls = [];
  
  // Static pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/a-propos', priority: '0.8', changefreq: 'monthly' },
    { loc: '/economie-bleue', priority: '0.9', changefreq: 'weekly' },
    { loc: '/economie-verte', priority: '0.9', changefreq: 'weekly' },
    { loc: '/economie-circulaire', priority: '0.9', changefreq: 'weekly' },
    { loc: '/evenements', priority: '0.9', changefreq: 'daily' },
    { loc: '/entrepreneurs', priority: '0.8', changefreq: 'weekly' },
    { loc: '/actualites', priority: '0.9', changefreq: 'daily' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    { loc: '/ressources', priority: '0.8', changefreq: 'weekly' }
  ];
  
  staticPages.forEach(page => {
    urls.push({
      loc: `${baseUrl}${page.loc}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: page.changefreq,
      priority: page.priority
    });
  });
  
  // Get all published articles
  const articles = await Post.find({
    type: 'article',
    status: 'published',
    isDeleted: false
  }).select('slug updatedAt publishedAt');
  
  articles.forEach(article => {
    urls.push({
      loc: `${baseUrl}/articles/${article.slug}`,
      lastmod: (article.updatedAt || article.publishedAt || new Date()).toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.7'
    });
  });
  
  // Get all published events
  const events = await Post.find({
    type: 'event',
    status: 'published',
    isDeleted: false
  }).select('slug eventNumber updatedAt publishedAt eventData.startDate');
  
  events.forEach(event => {
    const isPast = event.eventData?.startDate < new Date();
    const eventPath = event.eventNumber != null ? `/evenement/${event.eventNumber}` : `/evenement/${event.slug}`;
    urls.push({
      loc: `${baseUrl}${eventPath}`,
      lastmod: (event.updatedAt || event.publishedAt || new Date()).toISOString().split('T')[0],
      changefreq: isPast ? 'monthly' : 'daily',
      priority: isPast ? '0.4' : '0.8'
    });
  });
  
  // Get all active categories
  const categories = await Category.find({ isActive: true }).select('title');
  
  categories.forEach(category => {
    const slug = category.title.toLowerCase().replace(/\s+/g, '-');
    urls.push({
      loc: `${baseUrl}/categories/${slug}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'weekly',
      priority: '0.6'
    });
  });
  
  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  
  return xml;
};

/**
 * Generate iCal format for an event
 * @param {Object} event - Event post object
 * @param {string} baseUrl - The base URL of the site
 * @returns {string} iCal content
 */
const generateICalEvent = (event, baseUrl = 'https://mahdiablueandgreen.tn') => {
  if (event.type !== 'event' || !event.eventData) {
    throw new Error('Invalid event');
  }
  
  const formatICalDate = (date) => {
    return date.toISOString().replace(/-|:|\.\d{3}/g, '').slice(0, -1) + 'Z';
  };
  
  const escapeICalText = (text) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };
  
  const startDate = event.eventData.startDate ? formatICalDate(event.eventData.startDate) : '';
  const endDate = event.eventData.endDate ? formatICalDate(event.eventData.endDate) : startDate;
  const location = event.eventData.isOnline 
    ? (event.eventData.meetingLink || 'Online Event')
    : `${event.eventData.venue || ''}, ${event.eventData.location || ''}`.trim();
  
  const uid = `${event._id}@mahdiablueandgreen.tn`;
  const now = formatICalDate(new Date());
  
  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Mahdia Blue and Green//Events//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${escapeICalText(event.title)}
DESCRIPTION:${escapeICalText(event.body.substring(0, 500))}
LOCATION:${escapeICalText(location)}
URL:${baseUrl}/evenements/${event.slug}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;
  
  return ical;
};

/**
 * Generate robots.txt content
 * @param {string} baseUrl - The base URL of the site
 * @returns {string} robots.txt content
 */
const generateRobotsTxt = (baseUrl = 'https://mahdiablueandgreen.tn') => {
  return `# Robots.txt for Mahdia Blue and Green
User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /api/admin/
Disallow: /api/auth/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay (optional, be nice to the server)
Crawl-delay: 1
`;
};

module.exports = {
  generateSitemap,
  generateICalEvent,
  generateRobotsTxt
};
