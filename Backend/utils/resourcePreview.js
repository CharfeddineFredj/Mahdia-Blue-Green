const zlib = require('zlib');

/**
 * Aperçus des ressources, calculés côté serveur (aucun service externe) :
 * - lien : image de partage du site (balise og:image) ;
 * - Word (.docx), Excel (.xlsx), CSV : début du texte du fichier.
 */

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_HTML_BYTES = 300 * 1024;
const TIMEOUT_MS = 8000;
const TEXT_MAX = 420;

function withTimeout(ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, done: () => clearTimeout(t) };
}

async function readLimited(res, maxBytes) {
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/** Lit une entrée d'une archive ZIP (docx / xlsx sont des ZIP). */
function readZipEntry(buf, name) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const entry = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (entry === name) {
      const lnLen = buf.readUInt16LE(localOff + 26);
      const leLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lnLen + leLen;
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return data;
      if (method === 8) return zlib.inflateRawSync(data);
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const decodeEntities = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function clip(text) {
  const t = String(text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return t.length > TEXT_MAX ? `${t.slice(0, TEXT_MAX - 1).trimEnd()}…` : t;
}

/** Image de partage d'une page web (og:image), résolue en URL absolue. */
async function linkPreviewImage(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) return null;
  const t = withTimeout(TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: t.signal, redirect: 'follow', headers: { 'User-Agent': 'MahdiaBlueGreenSite/1.0' } });
    if (!res.ok) return null;
    const html = (await readLimited(res, MAX_HTML_BYTES)).toString('utf8');
    const m = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i);
    if (!m) return null;
    return new URL(decodeEntities(m[1]), res.url || url).toString();
  } catch (e) {
    return null;
  } finally {
    t.done();
  }
}

/** Début du texte d'un fichier Word, Excel ou CSV. */
async function filePreviewText(url, ext) {
  const kind = String(ext || '').replace(/^\./, '').toLowerCase();
  if (!['docx', 'xlsx', 'csv'].includes(kind)) return null;
  const t = withTimeout(TIMEOUT_MS * 2);
  try {
    const res = await fetch(url, { signal: t.signal, redirect: 'follow' });
    if (!res.ok) return null;
    const buf = await readLimited(res, MAX_FILE_BYTES);
    if (kind === 'csv') {
      return clip(buf.toString('utf8').split(/\r?\n/).slice(0, 8).join('\n'));
    }
    if (kind === 'docx') {
      const xml = readZipEntry(buf, 'word/document.xml');
      if (!xml) return null;
      const text = decodeEntities(xml.toString('utf8')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<[^>]+>/g, ''));
      return clip(text);
    }
    // xlsx : textes partagés (cellules), puis contenu des premières lignes
    const shared = readZipEntry(buf, 'xl/sharedStrings.xml');
    if (!shared) return null;
    const strings = [...shared.toString('utf8').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeEntities(m[1]));
    return clip(strings.slice(0, 40).join(' · '));
  } catch (e) {
    return null;
  } finally {
    t.done();
  }
}

/**
 * Calcule l'aperçu d'une ressource selon son type.
 * @returns {{ previewImage: string|null, previewText: string|null }}
 */
async function computeResourcePreview(resource) {
  const type = String(resource?.type || '').toLowerCase();
  const ext = String(resource?.fileExtension || (String(resource?.url || '').split('?')[0].match(/\.([a-z0-9]+)$/i) || [])[1] || '');
  if (type === 'link') {
    return { previewImage: await linkPreviewImage(resource.url), previewText: null };
  }
  if (type === 'document' || type === 'file') {
    return { previewImage: null, previewText: await filePreviewText(resource.url, ext) };
  }
  return { previewImage: null, previewText: null };
}

/** Calcule l'aperçu et l'enregistre sur la ressource (appelé à la création et à la modification). */
async function applyResourcePreview(resource) {
  const p = await computeResourcePreview(resource);
  resource.previewImage = p.previewImage;
  resource.previewText = p.previewText;
  resource.previewUpdatedAt = new Date();
  await resource.save();
  return resource;
}

module.exports = { computeResourcePreview, applyResourcePreview, readZipEntry, clip };
