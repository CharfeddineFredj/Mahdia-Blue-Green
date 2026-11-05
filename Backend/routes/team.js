const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const { protect, authorize } = require('../middleware/auth');

function parseExpertise(body) {
  if (Array.isArray(body.expertise)) {
    return body.expertise.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof body.expertise === 'string') {
    return body.expertise.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// Liste publique (page À propos, etc.)
router.get('/', async (req, res) => {
  try {
    const data = await TeamMember.find()
      .sort({ sortOrder: 1, externalId: 1, createdAt: 1 })
      .lean();
    res.json({ success: true, data });
  } catch (e) {
    console.error('team list', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

function strOrEmpty(v) {
  if (v == null) return '';
  return String(v).trim();
}

router.post('/', protect, authorize('superadmin', 'moderator'), async (req, res) => {
  try {
    const { name, role, organization, bio, fullBio, contact, email, externalId } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Le nom est requis' });
    }
    const emailStr = strOrEmpty(email);
    const contactStr = strOrEmpty(contact);
    const doc = await TeamMember.create({
      name: String(name).trim(),
      role: strOrEmpty(role),
      organization: strOrEmpty(organization),
      bio: strOrEmpty(bio),
      fullBio: strOrEmpty(fullBio),
      expertise: parseExpertise(req.body),
      contact: contactStr || emailStr,
      email: emailStr || contactStr,
      avatar: strOrEmpty(req.body.avatar),
      linkedin: strOrEmpty(req.body.linkedin),
      github: strOrEmpty(req.body.github),
      facebook: strOrEmpty(req.body.facebook),
      instagram: strOrEmpty(req.body.instagram),
      twitter: strOrEmpty(req.body.twitter),
      sortOrder: req.body.sortOrder != null && req.body.sortOrder !== '' ? Number(req.body.sortOrder) : 999,
      externalId: externalId != null && externalId !== '' ? Number(externalId) : undefined,
    });
    res.status(201).json({ success: true, data: doc });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Ce nom existe déjà' });
    }
    console.error('team create', e);
    res.status(500).json({ success: false, message: e.message || 'Erreur création' });
  }
});

router.put('/:id', protect, authorize('superadmin', 'moderator'), async (req, res) => {
  try {
    const m = await TeamMember.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Membre introuvable' });
    const { name, role, organization, bio, fullBio, contact, email, externalId } = req.body;
    if (name != null) m.name = String(name).trim();
    if (role !== undefined) m.role = strOrEmpty(role);
    if (organization !== undefined) m.organization = strOrEmpty(organization);
    if (bio !== undefined) m.bio = strOrEmpty(bio);
    if (fullBio !== undefined) m.fullBio = strOrEmpty(fullBio);
    if (contact !== undefined) m.contact = strOrEmpty(contact);
    if (email !== undefined) m.email = strOrEmpty(email);
    if (req.body.avatar !== undefined) m.avatar = strOrEmpty(req.body.avatar);
    if (req.body.linkedin !== undefined) m.linkedin = strOrEmpty(req.body.linkedin);
    if (req.body.github !== undefined) m.github = strOrEmpty(req.body.github);
    if (req.body.facebook !== undefined) m.facebook = strOrEmpty(req.body.facebook);
    if (req.body.instagram !== undefined) m.instagram = strOrEmpty(req.body.instagram);
    if (req.body.twitter !== undefined) m.twitter = strOrEmpty(req.body.twitter);
    if (req.body.sortOrder !== undefined) {
      m.sortOrder =
        req.body.sortOrder != null && req.body.sortOrder !== ''
          ? Number(req.body.sortOrder)
          : 999;
    }
    if (req.body.expertise !== undefined) m.expertise = parseExpertise(req.body);
    if (externalId !== undefined) m.externalId = externalId != null && externalId !== '' ? Number(externalId) : undefined;
    await m.save();
    res.json({ success: true, data: m });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ success: false, message: 'Ce nom existe déjà' });
    }
    console.error('team update', e);
    res.status(500).json({ success: false, message: 'Erreur mise à jour' });
  }
});

router.delete('/:id', protect, authorize('superadmin', 'moderator'), async (req, res) => {
  try {
    const m = await TeamMember.findById(req.params.id);
    if (!m) return res.status(404).json({ success: false, message: 'Membre introuvable' });
    await m.deleteOne();
    res.json({ success: true, message: 'Membre supprimé' });
  } catch (e) {
    console.error('team delete', e);
    res.status(500).json({ success: false, message: 'Erreur suppression' });
  }
});

module.exports = router;
