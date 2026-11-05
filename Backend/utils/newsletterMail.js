const Post = require('../models/Post');
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { sendEmail } = require('./emailService');
const {
  wrapNewsletterHtml,
  buildBroadcastInnerHtml,
  buildBroadcastIntroPlainText,
  getBroadcastSubjectForBody,
  buildPlainTextSignature,
  escapeHtml,
  getFrontendBase,
  NEWSLETTER_BRAND_TITLE,
  buildLogoCidAttachments,
} = require('./newsletterEmailTemplate');
const {
  sanitizeNewsletterMessageHtml,
  newsletterHtmlToPlainText,
} = require('./sanitizeNewsletterHtml');
const { embedNewsletterRemoteImagesAsCid } = require('./embedNewsletterImagesAsCid');
const { unsubscribeBlockHtml, unsubscribeTextLine, personalize } = require('./newsletterUnsubscribe');

/** Seuls les abonnés actifs reçoivent les newsletters */
const ACTIVE_SUBSCRIBERS = { status: { $ne: 'unsubscribed' } };

function hasMeaningfulNewsletterBody(html) {
  const s = String(html || '').trim();
  if (!s) return false;
  if (/<img[\s>]/i.test(s)) return true;
  return newsletterHtmlToPlainText(s).replace(/\s+/g, ' ').trim().length > 0;
}

/** Pièce jointe inline : logo signature (identique partout). */
function buildNewsletterAttachments() {
  return buildLogoCidAttachments();
}

async function sendNewsletterEmail({ to, subject, html, text, extraAttachments = [] }) {
  const base = buildNewsletterAttachments();
  const merged = [...base, ...(extraAttachments || [])];
  return sendEmail({
    to,
    subject,
    html,
    text,
    attachments: merged.length ? merged : undefined,
  });
}

function buildPublicUrl(post) {
  const base = getFrontendBase();
  if (post.type === 'article') {
    const seg = post.slug || String(post._id);
    return `${base}/article/${encodeURIComponent(seg)}`;
  }
  if (post.type === 'event') {
    const seg = post.eventNumber != null ? String(post.eventNumber) : post.slug || String(post._id);
    return `${base}/evenement/${encodeURIComponent(seg)}`;
  }
  return base;
}

/**
 * Email de bienvenue à l’inscription (ne bloque pas l’API si SMTP indisponible).
 */
const NEWSLETTER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Enregistre un e-mail dans la liste newsletter et envoie l’accusé (même logique que POST /newsletter/subscribe).
 * @param {string} rawEmail
 * @param {string} [source] — ex. home, registration
 * @returns {Promise<{ success: boolean, skipped?: boolean, created?: boolean, alreadySubscribed?: boolean, email?: string, _id?: import('mongoose').Types.ObjectId }>}
 */
async function registerNewsletterSubscriber(rawEmail, source = 'home') {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email || !NEWSLETTER_EMAIL_RE.test(email)) {
    return { success: false, skipped: true };
  }
  const src = String(source || 'home').slice(0, 80);
  try {
    const doc = await NewsletterSubscriber.create({
      email,
      source: src,
    });
    sendNewsletterWelcomeEmail(doc.email).catch((err) =>
      console.warn('newsletter welcome email:', err?.message || err)
    );
    return { success: true, created: true, email: doc.email, _id: doc._id };
  } catch (e) {
    if (e.code === 11000) {
      // Ancien désabonné qui se réinscrit : on réactive l'abonnement
      const back = await NewsletterSubscriber.updateOne(
        { email, status: 'unsubscribed' },
        { $set: { status: 'active', unsubscribedAt: null } }
      );
      if (back.modifiedCount) return { success: true, created: true, reactivated: true, email };
      return { success: true, alreadySubscribed: true, email };
    }
    throw e;
  }
}

async function sendNewsletterWelcomeEmail(email) {
  const site = 'Mahdia Blue & Green';
  const homeUrl = getFrontendBase();
  const inner = `
    <p style="margin:0 0 18px;font-size:17px;font-weight:600;color:#0f766e;">Merci pour votre inscription</p>
    <p style="margin:0 0 16px;">Bonjour,</p>
    <p style="margin:0 0 16px;color:#334155;">
      Vous êtes bien inscrit(e) à notre <strong>newsletter</strong>. Vous recevrez nos actualités sur l’économie
      bleue, verte et circulaire à Mahdia : nouveaux articles, événements et ressources.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#007d90,#0d9488);">
          <a href="${escapeHtml(homeUrl)}" style="display:inline-block;padding:14px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Découvrir la plateforme
          </a>
        </td>
      </tr>
    </table>
  `;
  const html = wrapNewsletterHtml(inner + unsubscribeBlockHtml());
  const text = `Merci pour votre inscription à la ${NEWSLETTER_BRAND_TITLE} (${site}).${buildPlainTextSignature()}${unsubscribeTextLine()}`;
  return sendNewsletterEmail({
    to: email,
    subject: `${NEWSLETTER_BRAND_TITLE} — Inscription confirmée`,
    html: personalize(html, email),
    text: personalize(text, email),
  });
}

/**
 * Diffusion manuelle (admin) : HTML éditeur (TipTap), nettoyé côté serveur.
 */
async function broadcastToAllSubscribers({ subject, message }) {
  const subs = await NewsletterSubscriber.find(ACTIVE_SUBSCRIBERS).select('email').lean();
  if (subs.length === 0) {
    return { success: true, sent: 0, failed: 0, total: 0, message: 'Aucun abonné actif' };
  }
  let safeSubject = String(subject || '').trim().slice(0, 200);
  const rawBody = String(message || '').trim();
  if (!safeSubject || !rawBody) {
    return { success: false, sent: 0, failed: 0, total: subs.length, message: 'Sujet et message requis' };
  }
  const sanitizedBody = sanitizeNewsletterMessageHtml(rawBody);
  if (!hasMeaningfulNewsletterBody(sanitizedBody)) {
    return { success: false, sent: 0, failed: 0, total: subs.length, message: 'Message vide ou invalide' };
  }
  const subjectForBody = getBroadcastSubjectForBody(safeSubject);
  const subLower = safeSubject.toLowerCase();
  if (!subLower.startsWith('newsletter de mahdia') && !subLower.includes('newsletter de mahdia blue')) {
    safeSubject = `${NEWSLETTER_BRAND_TITLE} — ${safeSubject}`.slice(0, 200);
  }
  const inner = buildBroadcastInnerHtml(subjectForBody, sanitizedBody) + unsubscribeBlockHtml();
  let html = wrapNewsletterHtml(inner);
  /** Images déjà sur Cloudinary (éditeur) → re-téléchargement + CID comme le logo pour affichage dans le client mail. */
  let inlineAttachments = [];
  try {
    const embedded = await embedNewsletterRemoteImagesAsCid(html);
    html = embedded.html;
    inlineAttachments = embedded.attachments;
  } catch (e) {
    console.warn('[newsletter] embed CID images:', e?.message || e);
  }
  const plainMsg = newsletterHtmlToPlainText(sanitizedBody);
  const text = `${buildBroadcastIntroPlainText(subjectForBody)}

Votre message :
${plainMsg}${buildPlainTextSignature()}${unsubscribeTextLine()}`;
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    const r = await sendNewsletterEmail({
      to: s.email,
      subject: safeSubject,
      html: personalize(html, s.email),
      text: personalize(text, s.email),
      extraAttachments: inlineAttachments,
    });
    if (r.success) sent += 1;
    else failed += 1;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return { success: true, sent, failed, total: subs.length };
}

/**
 * Email automatique lors du passage à « published » (article ou événement).
 * Désactiver : NEWSLETTER_AUTO_ON_PUBLISH=false
 */
async function notifySubscribersNewPublication(postId) {
  try {
    if (process.env.NEWSLETTER_AUTO_ON_PUBLISH === 'false') {
      return { skipped: true, reason: 'disabled' };
    }

    const post = await Post.findById(postId);
    if (!post || post.status !== 'published' || post.isDeleted) return { skipped: true };
    if (post.newsletterSentAt) return { skipped: true, reason: 'already-sent' };

    const subscribers = await NewsletterSubscriber.find(ACTIVE_SUBSCRIBERS).select('email').lean();
    if (subscribers.length === 0) return { skipped: true, reason: 'no-subscribers' };

    const url = buildPublicUrl(post);
    const summary =
      post.type === 'article'
        ? (post.articleData?.summary || post.body || '').slice(0, 320)
        : (post.body || '').slice(0, 320);

    const typeLabel = post.type === 'article' ? 'Nouvel article' : 'Nouvel événement';
    const subject = `${NEWSLETTER_BRAND_TITLE} — ${typeLabel} : ${post.title}`.slice(0, 200);

    const badge = post.type === 'article' ? 'Article' : 'Événement';

    const inner = `
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#0d9488;">
        ${escapeHtml(badge)}
      </p>
      <h1 style="margin:0 0 18px;font-size:22px;line-height:1.35;font-weight:700;color:#0f172a;">
        ${escapeHtml(post.title)}
      </h1>
      <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.65;">
        ${escapeHtml(typeLabel)} disponible sur Mahdia Blue &amp; Green.
      </p>
      ${
        summary
          ? `<p style="margin:0 0 24px;padding:16px 18px;background:#f1f5f9;border-left:4px solid #007d90;border-radius:0 10px 10px 0;color:#475569;font-size:15px;line-height:1.6;">
        ${escapeHtml(summary)}
      </p>`
          : ''
      }
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="border-radius:12px;background:linear-gradient(135deg,#007d90,#0d9488);">
            <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 32px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
              Voir en ligne
            </a>
          </td>
        </tr>
      </table>
    `;

    const html = wrapNewsletterHtml(inner + unsubscribeBlockHtml());
    const text = `${post.title}\n\n${url}${buildPlainTextSignature()}${unsubscribeTextLine()}`;

    let sent = 0;
    for (const sub of subscribers) {
      const r = await sendNewsletterEmail({
        to: sub.email,
        subject,
        html: personalize(html, sub.email),
        text: personalize(text, sub.email),
      });
      if (r.success) sent += 1;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }

    post.newsletterSentAt = new Date();
    await post.save();

    console.log(`[newsletter] Auto-notify post ${postId}: ${sent}/${subscribers.length} emails`);
    return { sent, total: subscribers.length };
  } catch (e) {
    console.error('[newsletter] notifySubscribersNewPublication', e);
    return { error: e.message };
  }
}

function queueNotifyPostPublished(postId) {
  if (!postId) return;
  setImmediate(() => {
    notifySubscribersNewPublication(postId);
  });
}

module.exports = {
  sendNewsletterWelcomeEmail,
  registerNewsletterSubscriber,
  broadcastToAllSubscribers,
  notifySubscribersNewPublication,
  queueNotifyPostPublished,
};
