const { URL } = require('url');

const MAX_INLINE_IMAGES = 15;
const MAX_BYTES_PER_IMAGE = 2.5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25000;

/** Hôtes autorisés : URLs Cloudinary (upload éditeur) → même principe que le logo : CID + affichage dans le mail. */
function isAllowedImageUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'res.cloudinary.com' || h === 'media.cloudinary.com') return true;
    if (h.endsWith('.cloudinary.com')) return true;
    const extra = (process.env.NEWSLETTER_INLINE_IMAGE_HOSTS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return extra.includes(h);
  } catch {
    return false;
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extFromContentType(ct) {
  const m = String(ct || '').toLowerCase();
  if (m.includes('png')) return 'png';
  if (m.includes('gif')) return 'gif';
  if (m.includes('webp')) return 'webp';
  if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
  if (m.includes('svg')) return 'svg';
  return 'jpg';
}

async function fetchImageBuffer(urlStr) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(urlStr, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { Accept: 'image/*,*/*' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES_PER_IMAGE) throw new Error('image too large');
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return { buf, contentType };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Après upload Cloudinary dans l’éditeur, le HTML contient des <img src="https://…cloudinary…">.
 * On télécharge chaque fichier, on l’ajoute en pièce jointe inline (CID) comme le logo : affichage fiable dans Gmail.
 * En cas d’échec, l’URL Cloudinary HTTPS est conservée dans le HTML.
 *
 * @param {string} html
 * @returns {Promise<{ html: string, attachments: Array<{ filename: string, content: Buffer, cid: string }> }>}
 */
async function embedNewsletterRemoteImagesAsCid(html) {
  const base = String(html || '');
  const srcRe = /\bsrc\s*=\s*["']([^"']+)["']/gi;
  const urls = new Set();
  let m;
  while ((m = srcRe.exec(base)) !== null) {
    const u = m[1].trim();
    if (!u || u.toLowerCase().startsWith('cid:')) continue;
    if (isAllowedImageUrl(u)) urls.add(u);
  }

  if (urls.size === 0) {
    return { html: base, attachments: [] };
  }

  const urlList = [...urls].slice(0, MAX_INLINE_IMAGES);
  if (urls.size > MAX_INLINE_IMAGES) {
    console.warn(`[newsletter] ${urls.size} images distantes, seules les ${MAX_INLINE_IMAGES} premières sont en CID.`);
  }

  /** @type {Map<string, string>} */
  const urlToCid = new Map();
  const attachments = [];

  let idx = 0;
  for (const urlStr of urlList) {
    try {
      const { buf, contentType } = await fetchImageBuffer(urlStr);
      const ext = extFromContentType(contentType);
      const cid = `nl-inline-${idx}@mbg`;
      urlToCid.set(urlStr, cid);
      const mime = String(contentType || '')
        .split(';')[0]
        .trim();
      attachments.push({
        filename: `newsletter-inline-${idx}.${ext}`,
        content: buf,
        ...(mime ? { contentType: mime } : {}),
        cid,
      });
      idx += 1;
    } catch (e) {
      console.warn('[newsletter] impossible d’intégrer l’image en CID, URL conservée :', urlStr.slice(0, 120), e.message || e);
    }
  }

  let out = base;
  for (const [urlStr, cid] of urlToCid) {
    const esc = escapeRegex(urlStr);
    out = out.replace(
      new RegExp(`src=(["'])${esc}\\1`, 'g'),
      `src=$1cid:${cid}$1`,
    );
  }

  return { html: out, attachments };
}

module.exports = {
  embedNewsletterRemoteImagesAsCid,
  isAllowedImageUrl,
};
