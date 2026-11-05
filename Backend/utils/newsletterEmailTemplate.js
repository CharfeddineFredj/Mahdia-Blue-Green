/**
 * Gabarit HTML newsletter — signature type NAVIRIS (2 colonnes, séparateur vertical, logo circulaire).
 * Logo en CID : Backend/assets/email/newsletter-logo.png
 */

const path = require('path');
const fs = require('fs');

const NEWSLETTER_BRAND_TITLE = 'Newsletter de Mahdia Blue & Green';

const NEWSLETTER_LOGO_CID = 'newsletter-logo@mbg';

/** Ligne « contexte » sous la baseline dans la signature (change selon le type d’e-mail). */
const EMAIL_CONTEXT = {
  newsletter: NEWSLETTER_BRAND_TITLE,
  platform: 'Plateforme — Mahdia Blue & Green',
  contactReply: 'Réponse — Mahdia Blue & Green',
  contact: 'Message — Mahdia Blue & Green',
  event: 'Événements — Mahdia Blue & Green',
  welcome: 'Bienvenue — Mahdia Blue & Green',
  authVerify: 'Compte — Mahdia Blue & Green',
  security: 'Sécurité — Mahdia Blue & Green',
};

function getFrontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function getDefaultLogoFilePath() {
  const envPath = (process.env.NEWSLETTER_LOGO_PATH || '').trim();
  if (envPath && fs.existsSync(envPath)) return envPath;
  return path.join(__dirname, '../assets/email/newsletter-logo.png');
}

function hasInlineLogoFile() {
  return fs.existsSync(getDefaultLogoFilePath());
}

function getLogoUrl() {
  const custom = (process.env.NEWSLETTER_LOGO_URL || '').trim();
  if (custom) return custom;
  return `${getFrontendBase()}/newsletter-logo.png`;
}

function getLogoImgSrc() {
  if (hasInlineLogoFile()) {
    return `cid:${NEWSLETTER_LOGO_CID}`;
  }
  return getLogoUrl();
}

function getSignatureLines() {
  return {
    location: process.env.NEWSLETTER_CONTACT_LOCATION || 'Mahdia, Tunisie',
    email: process.env.NEWSLETTER_CONTACT_EMAIL || 'contact@mahdia-bg.tn',
    phone: process.env.NEWSLETTER_CONTACT_PHONE || '+216 73 123 456',
  };
}

function getTagline() {
  return (
    process.env.NEWSLETTER_TAGLINE ||
    'Votre partenaire pour l’économie bleue, verte et circulaire — des idées concrètes à Mahdia.'
  );
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeImgSrc(logoSrc) {
  const s = logoSrc || getLogoImgSrc();
  if (String(s).startsWith('cid:')) return s;
  return escapeHtml(s);
}

/** Petite pastille noire (style icône) pour les lignes de contact */
function iconDotHtml() {
  return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#0f172a;vertical-align:middle;margin-right:10px;"></span>`;
}

function footerLegalNewsletterHtml() {
  const t = escapeHtml(NEWSLETTER_BRAND_TITLE);
  return `<p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#64748b;">Vous recevez cet e-mail car vous êtes inscrit(e) à la <strong style="color:#475569;">${t}</strong>.</p>`;
}

function footerLegalGenericHtml() {
  return `<p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.5;color:#64748b;">Cet e-mail a été envoyé par <strong style="color:#475569;">Mahdia Blue &amp; Green</strong>.</p>`;
}

/**
 * Signature 2 colonnes : gauche logo rond + nom, séparateur vertical, droite titre + baseline + ligne contexte + contacts.
 * @param {string} logoSrc
 * @param {{ contextLine?: string, footerLegalHtml?: string }} [options]
 */
function signatureBlockTwoColumnHtml(logoSrc, options = {}) {
  const src = safeImgSrc(logoSrc);
  const { location, email, phone } = getSignatureLines();
  const tagline = escapeHtml(getTagline());
  const contextLine = escapeHtml(options.contextLine ?? NEWSLETTER_BRAND_TITLE);
  const footerLegalHtml = options.footerLegalHtml != null ? options.footerLegalHtml : footerLegalGenericHtml();
  const dot = iconDotHtml();

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eceff1;">
      <tr>
        <td align="center" style="padding:28px 16px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #d8dee4;">
            <tr>
              <!-- Colonne gauche : logo cercle + marque -->
              <td valign="top" style="width:42%;padding:28px 20px 28px 24px;text-align:center;background:#f8fafc;">
                <div style="width:96px;height:96px;margin:0 auto 16px;border-radius:50%;overflow:hidden;border:3px solid #007d90;background:#f0fdfa;">
                  <img src="${src}" alt="Mahdia Blue &amp; Green" width="96" height="96" style="display:block;width:96px;height:96px;border:0;border-radius:50%;margin:0;padding:0;" />
                </div>
                <p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:18px;font-weight:800;letter-spacing:0.04em;color:#1e293b;line-height:1.2;">
                  MAHDIA
                </p>
                <p style="margin:8px 0 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.12em;color:#64748b;">
                  — BLUE &amp; GREEN —
                </p>
              </td>
              <!-- Séparateur vertical -->
              <td valign="top" style="width:1px;background:#c5cdd6;padding:0;line-height:0;font-size:0;">&nbsp;</td>
              <!-- Colonne droite : coordonnées -->
              <td valign="top" style="padding:28px 24px 28px 22px;background:#ffffff;">
                <p style="margin:0 0 10px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:800;letter-spacing:0.05em;color:#0f172a;text-transform:uppercase;line-height:1.25;">
                  Mahdia Blue &amp; Green
                </p>
                <p style="margin:0 0 18px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-style:italic;line-height:1.55;color:#475569;">
                  ${tagline}
                </p>
                <p style="margin:0 0 6px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#0d9488;">
                  ${contextLine}
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:14px;">
                  <tr>
                    <td style="padding:5px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.45;">
                      ${dot}<span style="vertical-align:middle;">${escapeHtml(phone)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.45;">
                      ${dot}<a href="mailto:${escapeHtml(email)}" style="color:#007d90;text-decoration:none;font-weight:600;vertical-align:middle;">${escapeHtml(email)}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;color:#1e293b;line-height:1.45;">
                      ${dot}<span style="vertical-align:middle;">${escapeHtml(location)}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td colspan="3" style="padding:14px 20px 18px;background:#f1f5f9;border-top:1px solid #e2e8f0;text-align:center;">
                ${footerLegalHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

/** Bandeau d’en-tête (titre selon le type d’e-mail). */
function emailHeaderStripHtml(headerTitle) {
  const title = escapeHtml(headerTitle ?? NEWSLETTER_BRAND_TITLE);
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#007d90 0%,#0d9488 100%);">
      <tr>
        <td align="center" style="padding:18px 24px;">
          <p style="margin:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#ecfdf5;">
            ${title}
          </p>
        </td>
      </tr>
    </table>`;
}

/**
 * Gabarit commun : bandeau + corps + signature (logo CID). Utilisé par la newsletter et tous les e-mails transactionnels.
 * @param {string} innerBodyHtml
 * @param {{ headerTitle: string, contextLine: string, footerLegalHtml?: string, logoSrc?: string, includeNewsletterMsgStyles?: boolean }} options
 */
function wrapBrandedEmailHtml(innerBodyHtml, options) {
  const logoSrc = options.logoSrc != null ? options.logoSrc : getLogoImgSrc();
  const headerTitle = options.headerTitle ?? NEWSLETTER_BRAND_TITLE;
  const contextLine = options.contextLine ?? NEWSLETTER_BRAND_TITLE;
  const footerLegalHtml = options.footerLegalHtml != null ? options.footerLegalHtml : footerLegalGenericHtml();
  const msgStyles = options.includeNewsletterMsgStyles
    ? `<style type="text/css">
    .newsletter-msg-html img { max-width:100% !important; height:auto !important; display:block; margin:12px auto; border-radius:8px; }
    .newsletter-msg-html p { margin:0.5em 0; }
    .newsletter-msg-html ul, .newsletter-msg-html ol { margin:0.5em 0; padding-left:1.25em; }
  </style>`
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  ${msgStyles}
</head>
<body style="margin:0;padding:0;background:#dfe7ea;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#dfe7ea;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(15,23,42,0.12);">
          <tr>
            <td style="padding:0;">
              ${emailHeaderStripHtml(headerTitle)}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 36px 28px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.65;color:#1e293b;">
              ${innerBodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${signatureBlockTwoColumnHtml(logoSrc, { contextLine, footerLegalHtml })}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * E-mails newsletter (contenu HTML riche + pied d’abonnement).
 * @param {string} innerBodyHtml
 * @param {{ logoSrc?: string }} [options]
 */
function wrapNewsletterHtml(innerBodyHtml, options = {}) {
  const logoSrc = options.logoSrc != null ? options.logoSrc : getLogoImgSrc();
  return wrapBrandedEmailHtml(innerBodyHtml, {
    headerTitle: NEWSLETTER_BRAND_TITLE,
    contextLine: EMAIL_CONTEXT.newsletter,
    footerLegalHtml: footerLegalNewsletterHtml(),
    logoSrc,
    includeNewsletterMsgStyles: true,
  });
}

/** Pièces jointes nodemailer pour le logo (tous les e-mails avec gabarit marque). */
function buildLogoCidAttachments() {
  const p = getDefaultLogoFilePath();
  if (!p || !fs.existsSync(p)) return [];
  return [
    {
      filename: 'mahdia-logo-signature.png',
      path: p,
      cid: NEWSLETTER_LOGO_CID,
    },
  ];
}

/** Pied de page texte brut (hors newsletter). */
function buildPlainTextFooterGeneric(contextLine) {
  const { location, email, phone } = getSignatureLines();
  const first = contextLine ? `${contextLine}\n` : '';
  return `\n\n—\n${first}Mahdia Blue & Green\n${location}\n${email}\n${phone}`;
}

/** Texte d’introduction (envoi groupé) — ton professionnel, objet mis en avant dans le corps. */
function getBroadcastIntroParagraphHtml(escapedSubject) {
  return `
    <p style="margin:0 0 18px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.7;color:#334155;">
      Nous vous présentons ci-dessous les dernières nouvelles de notre plateforme
      <strong style="color:#0f766e;">Mahdia Blue &amp; Green</strong>
      concernant l’objet suivant&nbsp;:
    </p>
    <p style="margin:0 0 26px;padding:14px 18px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;color:#0f766e;line-height:1.45;background:#f0fdfa;border-left:4px solid #007d90;border-radius:0 10px 10px 0;">
      «&nbsp;${escapedSubject}&nbsp;»
    </p>`;
}

/**
 * Corps HTML pour envoi groupé admin : accroche pro + message (HTML éditeur, déjà sanitizé).
 */
function buildBroadcastInnerHtml(safeSubject, messageHtmlSanitized) {
  const subj = escapeHtml(safeSubject);
  return `
    <p style="margin:0 0 20px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:600;line-height:1.5;color:#0f172a;">Bonjour,</p>
    ${getBroadcastIntroParagraphHtml(subj)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;">
      <tr>
        <td style="padding:0;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.75;color:#334155;">
          <div class="newsletter-msg-html" style="max-width:100%;overflow-wrap:break-word;">
            ${messageHtmlSanitized}
          </div>
        </td>
      </tr>
    </table>`;
}

/** Version texte brut de l’introduction (alignée sur le HTML). */
function buildBroadcastIntroPlainText(safeSubject) {
  return `Bonjour,

Nous vous présentons ci-dessous les dernières nouvelles de notre plateforme Mahdia Blue & Green concernant l'objet suivant :

« ${safeSubject} »

Vous trouverez le détail de notre message ci-dessous.`;
}

function buildPlainTextSignature() {
  const { location, email, phone } = getSignatureLines();
  return `\n\n—\n${NEWSLETTER_BRAND_TITLE}\nMahdia Blue & Green\n${location}\n${email}\n${phone}`;
}

/**
 * Objet affiché dans le corps de l’e-mail : sans le préfixe « Newsletter de Mahdia Blue & Green — »
 * (le préfixe reste uniquement sur la ligne Objet SMTP si ajouté automatiquement).
 */
function getBroadcastSubjectForBody(rawTrimmed) {
  const prefix = `${NEWSLETTER_BRAND_TITLE} — `;
  let s = String(rawTrimmed || '').trim();
  if (s.toLowerCase().startsWith(prefix.toLowerCase())) {
    const rest = s.slice(prefix.length).trim();
    return rest || s;
  }
  return s;
}

module.exports = {
  wrapNewsletterHtml,
  wrapBrandedEmailHtml,
  signatureBlockTwoColumnHtml,
  buildLogoCidAttachments,
  buildPlainTextFooterGeneric,
  EMAIL_CONTEXT,
  buildBroadcastInnerHtml,
  buildBroadcastIntroPlainText,
  getBroadcastSubjectForBody,
  buildPlainTextSignature,
  escapeHtml,
  getFrontendBase,
  getLogoUrl,
  getLogoImgSrc,
  getDefaultLogoFilePath,
  hasInlineLogoFile,
  getSignatureLines,
  NEWSLETTER_BRAND_TITLE,
  NEWSLETTER_LOGO_CID,
};
