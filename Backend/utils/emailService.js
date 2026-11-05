const nodemailer = require('nodemailer');
const {
  wrapBrandedEmailHtml,
  buildLogoCidAttachments,
  buildPlainTextFooterGeneric,
  EMAIL_CONTEXT,
  escapeHtml,
} = require('./newsletterEmailTemplate');

const logoAttachments = () => buildLogoCidAttachments();

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const sendEmail = async ({ to, subject, html, text, attachments }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html,
      text,
      ...(attachments && attachments.length ? { attachments } : {}),
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

const sendWelcomeEmail = async (user) => {
  const name = escapeHtml(user.firstName || user.username || '');
  const inner = `
    <p style="margin:0 0 18px;font-size:17px;font-weight:600;color:#0f766e;">Bienvenue sur Mahdia Blue &amp; Green</p>
    <p style="margin:0 0 16px;">Bonjour ${name},</p>
    <p style="margin:0 0 16px;color:#334155;">Votre compte a été créé avec succès. Nous sommes ravis de vous accueillir sur notre plateforme dédiée à l’économie bleue et verte de Mahdia.</p>
    <p style="margin:0;color:#334155;">Explorez nos articles, participez aux événements et contribuez à la communauté.</p>`;
  const text = `Bonjour ${user.firstName || user.username || ''},

Votre compte a été créé avec succès sur Mahdia Blue & Green.${buildPlainTextFooterGeneric(EMAIL_CONTEXT.welcome)}`;
  return sendEmail({
    to: user.email,
    subject: 'Bienvenue sur Mahdia Blue & Green !',
    html: wrapBrandedEmailHtml(inner, {
      headerTitle: 'Bienvenue — Mahdia Blue & Green',
      contextLine: EMAIL_CONTEXT.welcome,
    }),
    text,
    attachments: logoAttachments(),
  });
};

const sendContactReply = async (contact, replyMessage) => {
  const name = escapeHtml(contact.name || contact.firstName || '');
  const safeReply = escapeHtml(String(replyMessage || '')).replace(/\n/g, '<br>');
  const safeOriginal = escapeHtml(String(contact.message || '')).replace(/\n/g, '<br>');
  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${name},</p>
    <div style="margin:0 0 24px;color:#334155;line-height:1.65;">${safeReply}</div>
    <div style="padding:16px 18px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#64748b;">Votre message initial</p>
      <div style="color:#475569;font-size:15px;line-height:1.6;">${safeOriginal}</div>
    </div>`;
  const text = `Bonjour ${contact.name || contact.firstName || ''},

${String(replyMessage || '').trim()}

— Votre message initial —
${String(contact.message || '').trim()}${buildPlainTextFooterGeneric(EMAIL_CONTEXT.contactReply)}`;
  return sendEmail({
    to: contact.email,
    subject: `Re: ${contact.subject || 'Votre message de contact'}`,
    html: wrapBrandedEmailHtml(inner, {
      headerTitle: 'Réponse — Mahdia Blue & Green',
      contextLine: EMAIL_CONTEXT.contactReply,
    }),
    text,
    attachments: logoAttachments(),
  });
};

const sendEventReminder = async (user, event) => {
  const name = escapeHtml(user.firstName || user.username || '');
  const title = escapeHtml(event.title || '');
  const start = event.eventData?.startDate
    ? new Date(event.eventData.startDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
  const loc = event.eventData?.location ? escapeHtml(event.eventData.location) : '';
  const link = event.eventData?.meetingLink ? escapeHtml(event.eventData.meetingLink) : '';
  const inner = `
    <p style="margin:0 0 16px;">Bonjour ${name},</p>
    <p style="margin:0 0 16px;color:#334155;">Vous avez un événement à venir :</p>
    <div style="background:#f0fdfa;padding:18px;border-radius:12px;border:1px solid #ccfbf1;margin:0 0 8px;">
      <h2 style="margin:0 0 12px;font-size:20px;color:#0f766e;">${title}</h2>
      <p style="margin:8px 0;color:#334155;"><strong>Date :</strong> ${escapeHtml(start)}</p>
      ${loc ? `<p style="margin:8px 0;color:#334155;"><strong>Lieu :</strong> ${loc}</p>` : ''}
      ${
        event.eventData?.isOnline && link
          ? `<p style="margin:8px 0;color:#334155;"><strong>Lien :</strong> <a href="${link}" style="color:#007d90;">${link}</a></p>`
          : ''
      }
    </div>`;
  const text = `Bonjour ${user.firstName || user.username || ''},

Rappel : ${event.title || ''}
Date : ${start}${loc ? `\nLieu : ${event.eventData.location}` : ''}${buildPlainTextFooterGeneric(EMAIL_CONTEXT.event)}`;
  return sendEmail({
    to: user.email,
    subject: `Rappel : ${event.title}`,
    html: wrapBrandedEmailHtml(inner, {
      headerTitle: 'Rappel événement — Mahdia Blue & Green',
      contextLine: EMAIL_CONTEXT.event,
    }),
    text,
    attachments: logoAttachments(),
  });
};

const sendPasswordResetEmail = async (user, code) => {
  const name = escapeHtml(user.firstName || user.username || '');
  const inner = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#0f766e;">Réinitialisation du mot de passe</h2>
    <p style="margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
    <p style="margin:0 0 16px;color:#334155;">Utilisez ce code pour réinitialiser votre mot de passe :</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:#007d90;color:#fff;font-size:2rem;font-weight:700;letter-spacing:0.4rem;padding:14px 28px;border-radius:12px;">
        ${escapeHtml(String(code))}
      </div>
    </div>
    <p style="margin:0;color:#64748b;font-size:14px;">Ce code expire dans <strong>15 minutes</strong>. Si vous n’avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>`;
  const text = `Réinitialisation du mot de passe — Mahdia Blue & Green

Bonjour ${user.firstName || user.username || ''},

Code : ${code}
(valide 15 minutes)${buildPlainTextFooterGeneric(EMAIL_CONTEXT.security)}`;
  return sendEmail({
    to: user.email,
    subject: `${code} est votre code de réinitialisation — Mahdia Blue & Green`,
    html: wrapBrandedEmailHtml(inner, {
      headerTitle: 'Sécurité — Mahdia Blue & Green',
      contextLine: EMAIL_CONTEXT.security,
    }),
    text,
    attachments: logoAttachments(),
  });
};

const sendEmailVerificationCode = async (user, code) => {
  const name = escapeHtml(user.firstName || user.username || '');
  const inner = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#0f766e;">Confirmez votre adresse e-mail</h2>
    <p style="margin:0 0 16px;">Bonjour <strong>${name}</strong>,</p>
    <p style="margin:0 0 16px;color:#334155;">Entrez ce code pour confirmer votre adresse e-mail :</p>
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:#007d90;color:#fff;font-size:2rem;font-weight:700;letter-spacing:0.4rem;padding:14px 28px;border-radius:12px;">
        ${escapeHtml(String(code))}
      </div>
    </div>
    <p style="margin:0;color:#64748b;font-size:14px;">Ce code expire dans <strong>24 heures</strong>.</p>`;
  const text = `Confirmation e-mail — Mahdia Blue & Green

Bonjour ${user.firstName || user.username || ''},

Code : ${code}
(valide 24 h)${buildPlainTextFooterGeneric(EMAIL_CONTEXT.authVerify)}`;
  return sendEmail({
    to: user.email,
    subject: `${code} — Confirmez votre adresse e-mail — Mahdia Blue & Green`,
    html: wrapBrandedEmailHtml(inner, {
      headerTitle: 'Vérification — Mahdia Blue & Green',
      contextLine: EMAIL_CONTEXT.authVerify,
    }),
    text,
    attachments: logoAttachments(),
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendContactReply,
  sendEventReminder,
  sendPasswordResetEmail,
  sendEmailVerificationCode,
};
