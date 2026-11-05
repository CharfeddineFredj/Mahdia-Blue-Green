const Partner = require('../models/Partner');

exports.getAll = async (req, res) => {
  try {
    const partners = await Partner.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: partners });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partenaire introuvable' });
    res.json({ success: true, data: partner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const partner = await Partner.create(req.body);
    res.status(201).json({ success: true, data: partner });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Un partenaire avec ce nom existe déjà.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!partner) return res.status(404).json({ success: false, message: 'Partenaire introuvable' });
    res.json({ success: true, data: partner });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Un partenaire avec ce nom existe déjà.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const partner = await Partner.findByIdAndDelete(req.params.id);
    if (!partner) return res.status(404).json({ success: false, message: 'Partenaire introuvable' });
    res.json({ success: true, message: 'Partenaire supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
