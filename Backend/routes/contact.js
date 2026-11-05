const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { protect, authorize } = require('../middleware/auth');
const { sendContactReply } = require('../utils/emailService');

// @desc    Submit contact form
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            subject,
            message,
            name,
            profile,
            interests,
            phone,
            city,
            organization
        } = req.body;

        // Validate required fields
        if (!email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Email et message sont requis'
            });
        }

        const interestList = Array.isArray(interests)
            ? interests.map((s) => String(s).trim()).filter(Boolean)
            : (typeof interests === 'string' && interests.trim()
                ? interests.split(',').map((s) => s.trim()).filter(Boolean)
                : []);

        // Create contact
        const contact = await Contact.create({
            firstName,
            lastName,
            name: (name && String(name).trim()) || [firstName, lastName].filter(Boolean).join(' ').trim() || 'Anonyme',
            email,
            subject,
            message: String(message).trim(),
            profile: profile ? String(profile).trim() : undefined,
            interests: interestList,
            phone: phone ? String(phone).trim() : undefined,
            city: city ? String(city).trim() : undefined,
            organization: organization ? String(organization).trim() : undefined
        });

        res.status(201).json({
            success: true,
            data: contact
        });
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi du message'
        });
    }
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private (Admin only)
router.get('/', protect, authorize('superadmin', 'moderator', 'analyst'), async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: contacts,
            count: contacts.length
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des messages'
        });
    }
});

// @desc    Create contact entry from admin (manual)
// @route   POST /api/contact/entries
// @access  Private — superadmin, moderator
router.post('/entries', protect, authorize('superadmin', 'moderator'), async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            name,
            email,
            subject,
            message,
            profile,
            interests,
            phone,
            city,
            organization
        } = req.body;

        if (!email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Email et message sont requis'
            });
        }

        const interestList = Array.isArray(interests)
            ? interests.map((s) => String(s).trim()).filter(Boolean)
            : (typeof interests === 'string' && interests.trim()
                ? interests.split(',').map((s) => s.trim()).filter(Boolean)
                : []);

        const contact = await Contact.create({
            firstName,
            lastName,
            name: (name && String(name).trim()) || [firstName, lastName].filter(Boolean).join(' ').trim() || 'Sans nom',
            email: String(email).trim().toLowerCase(),
            subject: subject ? String(subject).trim() : undefined,
            message: String(message).trim(),
            profile: profile ? String(profile).trim() : undefined,
            interests: interestList,
            phone: phone ? String(phone).trim() : undefined,
            city: city ? String(city).trim() : undefined,
            organization: organization ? String(organization).trim() : undefined
        });

        res.status(201).json({ success: true, data: contact });
    } catch (error) {
        console.error('Error creating contact (admin):', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Erreur lors de la création'
        });
    }
});

// @desc    Update contact message
// @route   PUT /api/contact/:id
// @access  Private — superadmin, moderator
router.put('/:id', protect, authorize('superadmin', 'moderator'), async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        const allowed = [
            'firstName', 'lastName', 'name', 'email', 'subject', 'message',
            'phone', 'city', 'organization', 'profile', 'interests'
        ];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] === undefined) continue;
            if (key === 'interests') {
                const v = req.body.interests;
                update.interests = Array.isArray(v)
                    ? v.map((s) => String(s).trim()).filter(Boolean)
                    : String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
            } else if (key === 'email') {
                update.email = String(req.body.email).trim().toLowerCase();
            } else if (key === 'message') {
                update.message = String(req.body.message).trim();
            } else {
                update[key] = req.body[key] == null ? '' : String(req.body[key]).trim();
            }
        }

        Object.assign(contact, update);
        await contact.save();

        res.status(200).json({ success: true, data: contact });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la mise à jour'
        });
    }
});

// @desc    Delete contact message
// @route   DELETE /api/contact/:id
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('superadmin', 'moderator'), async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        await contact.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Message supprimé avec succès'
        });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la suppression du message'
        });
    }
});

// @desc    Reply to contact message
// @route   POST /api/contact/:id/reply
// @access  Private (Admin only)
router.post('/:id/reply', protect, authorize('superadmin', 'moderator', 'analyst'), async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Le message de réponse est requis'
            });
        }

        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Message non trouvé'
            });
        }

        const emailResult = await sendContactReply(contact, message);
        if (!emailResult.success) {
            return res.status(500).json({
                success: false,
                message: emailResult.error || 'Erreur lors de l\'envoi de la réponse',
            });
        }

        // Update contact with reply info
        contact.repliedAt = new Date();
        contact.repliedBy = req.user._id;
        await contact.save();

        res.status(200).json({
            success: true,
            message: 'Réponse envoyée avec succès'
        });
    } catch (error) {
        console.error('Error sending reply:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de l\'envoi de la réponse'
        });
    }
});

module.exports = router;
