const crypto = require('crypto');

/**
 * Désabonnement de la newsletter : lien signé (HMAC) par adresse e-mail.
 * Le lien ne peut être construit que par le serveur, donc personne ne peut désabonner une autre adresse.
 */
const PLACEHOLDER = '__UNSUBSCRIBE_URL__';

function secret() {
  return process.env.JWT_SECRET || 'newsletter-dev-secret';
}

function tokenFor(email) {
  return crypto.createHmac('sha256', secret()).update(String(email).trim().toLowerCase()).digest('hex');
}

function apiBase() {
  return (process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
}

function unsubscribeUrl(email) {
  return `${apiBase()}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${tokenFor(email)}`;
}

function verifyToken(email, token) {
  const expected = tokenFor(email);
  const given = String(token || '');
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Bloc de pied de newsletter (le lien est remplacé pour chaque destinataire) */
function unsubscribeBlockHtml() {
  return `<p style="margin:28px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
    Vous ne souhaitez plus recevoir nos e-mails ? <a href="${PLACEHOLDER}" style="color:#64748b;">Se désabonner</a>
  </p>`;
}

function unsubscribeTextLine() {
  return `\n\nSe désabonner de la newsletter : ${PLACEHOLDER}`;
}

/** Remplace le marqueur par le lien propre à l'adresse du destinataire */
function personalize(content, email) {
  return String(content).split(PLACEHOLDER).join(unsubscribeUrl(email));
}

module.exports = {
  PLACEHOLDER,
  unsubscribeUrl,
  verifyToken,
  unsubscribeBlockHtml,
  unsubscribeTextLine,
  personalize,
};
