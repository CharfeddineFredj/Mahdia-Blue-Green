const express = require('express');
const router = express.Router();
const NewsletterSubscriber = require('../models/NewsletterSubscriber');
const { protect, authorize } = require('../middleware/auth');
const { broadcastToAllSubscribers, registerNewsletterSubscriber } = require('../utils/newsletterMail');
const { verifyToken } = require('../utils/newsletterUnsubscribe');

// Inscription depuis le site (public)
router.post('/subscribe', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Adresse e-mail invalide' });
    }
    const result = await registerNewsletterSubscriber(email, req.body.source);
    if (!result.success && result.skipped) {
      return res.status(400).json({ success: false, message: 'Adresse e-mail invalide' });
    }
    if (result.alreadySubscribed) {
      return res.status(200).json({
        success: true,
        message: 'Cette adresse est déjà inscrite à la newsletter.',
        alreadySubscribed: true,
      });
    }
    return res.status(201).json({
      success: true,
      message: 'Inscription enregistrée',
      data: { _id: result._id, email: result.email },
    });
  } catch (e) {
    console.error('newsletter subscribe', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Désabonnement (public) : lien signé présent dans chaque newsletter
router.get('/unsubscribe', async (req, res) => {
  const page = (title, text) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;font-family:Segoe UI,Roboto,Arial,sans-serif;background:#f1f5f9;color:#0f172a;">
<div style="max-width:480px;margin:60px auto;padding:28px;background:#fff;border-radius:12px;text-align:center;">
<h1 style="font-size:20px;margin:0 0 12px;">${title}</h1><p style="margin:0;color:#475569;line-height:1.6;">${text}</p></div></body></html>`;
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || !verifyToken(email, req.query.token)) {
      return res.status(400).type('html').send(page('Lien invalide', 'Ce lien de désabonnement n’est pas valide.'));
    }
    await NewsletterSubscriber.updateOne(
      { email },
      { $set: { status: 'unsubscribed', unsubscribedAt: new Date() } }
    );
    return res.type('html').send(page('Désabonnement confirmé', 'Vous ne recevrez plus la newsletter de Mahdia Blue &amp; Green.'));
  } catch (e) {
    console.error('newsletter unsubscribe', e);
    return res.status(500).type('html').send(page('Erreur', 'Le désabonnement n’a pas pu être enregistré. Réessayez plus tard.'));
  }
});

/** Envoi groupé (admin) — même logique SMTP que les réponses contact */
router.post(
  '/broadcast',
  protect,
  authorize('superadmin', 'moderator'),
  async (req, res) => {
    try {
      const subject = String(req.body.subject || '').trim();
      const message = String(req.body.message || '').trim();
      if (!subject || !message) {
        return res.status(400).json({ success: false, message: 'Sujet et message sont requis' });
      }
      if (subject.length > 200 || message.length > 120000) {
        return res.status(400).json({ success: false, message: 'Sujet ou message trop long' });
      }
      const result = await broadcastToAllSubscribers({ subject, message });
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message || 'Requête invalide' });
      }
      res.json({
        success: true,
        message: `Envoi terminé : ${result.sent} réussi(s), ${result.failed} échec(s) sur ${result.total} abonné(s)`,
        data: result,
      });
    } catch (e) {
      console.error('newsletter broadcast', e);
      res.status(500).json({ success: false, message: e.message || 'Erreur envoi' });
    }
  }
);

router.get('/', protect, authorize('superadmin', 'moderator'), async (req, res) => {
  try {
    const data = await NewsletterSubscriber.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data, count: data.length });
  } catch (e) {
    console.error('newsletter list', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.put('/:id', protect, authorize('superadmin', 'moderator'), async (req, res) => {
  try {
    const s = await NewsletterSubscriber.findById(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Introuvable' });
    if (req.body.email != null) s.email = String(req.body.email).trim().toLowerCase();
    if (req.body.source !== undefined) s.source = String(req.body.source || '').slice(0, 80);
    if (req.body.status === 'active' || req.body.status === 'unsubscribed') {
      s.status = req.body.status;
      s.unsubscribedAt = req.body.status === 'unsubscribed' ? new Date() : null;
    }
    await s.save();
    res.json({ success: true, data: s });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Cet email existe déjà' });
    }
    console.error('newsletter update', e);
    res.status(500).json({ success: false, message: 'Erreur mise à jour' });
  }
});

router.delete('/:id', protect, authorize('superadmin', 'moderator'), async (req, res) => {
  try {
    const s = await NewsletterSubscriber.findById(req.params.id);
    if (!s) return res.status(404).json({ success: false, message: 'Introuvable' });
    await s.deleteOne();
    res.json({ success: true, message: 'Abonné supprimé' });
  } catch (e) {
    console.error('newsletter delete', e);
    res.status(500).json({ success: false, message: 'Erreur suppression' });
  }
});

module.exports = router;
