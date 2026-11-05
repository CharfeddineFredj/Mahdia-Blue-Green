// SEO Helper Utilities for Mahdia Blue & Green

/**
 * Generate meta tags object for a page
 */
const generateMetaTags = ({ title, description, url, image, type = 'website', locale = 'fr_TN' }) => {
  const siteName = 'Mahdia Blue & Green';
  const defaultImage = '/images/mahdia-og-image.jpg';

  return {
    title: title ? `${title} | ${siteName}` : siteName,
    description: description || 'Plateforme dédiée à l\'économie bleue, verte et circulaire de Mahdia, Tunisie.',
    openGraph: {
      title: title || siteName,
      description: description || 'Plateforme dédiée à l\'économie bleue, verte et circulaire de Mahdia, Tunisie.',
      url: url || process.env.FRONTEND_URL,
      siteName,
      type,
      locale,
      image: image || defaultImage
    },
    twitter: {
      card: 'summary_large_image',
      title: title || siteName,
      description: description || 'Plateforme dédiée à l\'économie bleue, verte et circulaire de Mahdia, Tunisie.',
      image: image || defaultImage
    }
  };
};

/**
 * Generate a URL-friendly slug from a title
 */
const generateSlug = (title) => {
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // Replace spaces with -
    .replace(/[àáâãäå]/g, 'a')     // Handle accented chars
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^\w\-]+/g, '')      // Remove all non-word chars
    .replace(/\-\-+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')            // Trim - from start
    .replace(/-+$/, '');           // Trim - from end
};

/**
 * Generate structured data (JSON-LD) for an article
 */
const generateArticleSchema = (article) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.articleData?.summary || article.body?.substring(0, 160),
    image: article.articleData?.featuredImage,
    datePublished: article.publishedAt || article.createdAt,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Person',
      name: article.author?.username
    },
    publisher: {
      '@type': 'Organization',
      name: 'Mahdia Blue & Green',
      url: process.env.FRONTEND_URL
    }
  };
};

/**
 * Generate structured data (JSON-LD) for an event
 */
const generateEventSchema = (event) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.body?.substring(0, 160),
    startDate: event.eventData?.startDate,
    endDate: event.eventData?.endDate,
    organizer: {
      '@type': 'Organization',
      name: 'Mahdia Blue & Green',
      url: process.env.FRONTEND_URL
    }
  };

  if (event.eventData?.isOnline) {
    schema.eventAttendanceMode = 'https://schema.org/OnlineEventAttendanceMode';
    schema.location = {
      '@type': 'VirtualLocation',
      url: event.eventData.meetingLink
    };
  } else if (event.eventData?.location) {
    schema.eventAttendanceMode = 'https://schema.org/OfflineEventAttendanceMode';
    schema.location = {
      '@type': 'Place',
      name: event.eventData.venue || event.eventData.location,
      address: event.eventData.location
    };
  }

  return schema;
};

/**
 * Generate canonical URL
 */
const getCanonicalUrl = (path) => {
  const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
};

module.exports = {
  generateMetaTags,
  generateSlug,
  generateArticleSchema,
  generateEventSchema,
  getCanonicalUrl
};
