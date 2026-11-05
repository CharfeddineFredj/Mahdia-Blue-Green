const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del',
  'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'hr', 'span', 'div',
];

/**
 * HTML issu de l’éditeur TipTap (newsletter) : balises / attributs limités, pas de JS.
 */
function sanitizeNewsletterMessageHtml(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  return sanitizeHtml(s, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'name'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      p: ['style'],
      span: ['style'],
      div: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      li: ['style'],
      blockquote: ['style'],
    },
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        'background-color': [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/],
        'font-size': [/^\d+(?:px|em|rem|%)$/],
        'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
        'text-decoration': [/^[\w\s-]+$/],
        'font-weight': [/^\d+$/, /^bold$/, /^normal$/],
        'font-style': [/^italic$/, /^normal$/],
        width: [/^\d+(?:px|%|em|rem)?$/],
        'max-width': [/^\d+(?:px|%|em|rem)?$/],
        height: [/^\d+(?:px|em|rem)?$/],
        display: [/^block$/, /^inline$/, /^inline-block$/],
        margin: [/^[\d\spx.%a-z,-]+$/i],
        'margin-left': [/^[\d\spx.%a-z,-]+$/i],
        'margin-right': [/^[\d\spx.%a-z,-]+$/i],
        'margin-top': [/^[\d\spx.%a-z,-]+$/i],
        'margin-bottom': [/^[\d\spx.%a-z,-]+$/i],
        'line-height': [/^\d+(?:\.\d+)?$/],
        'border-radius': [/^\d+px$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      img: ['http', 'https'],
    },
  });
}

function newsletterHtmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-3]|div|li|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  sanitizeNewsletterMessageHtml,
  newsletterHtmlToPlainText,
};
