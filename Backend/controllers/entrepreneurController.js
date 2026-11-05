const Entrepreneur = require('../models/Entrepreneur');

exports.getAll = async (req, res) => {
  try {
    const items = await Entrepreneur.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const item = await Entrepreneur.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const item = await Entrepreneur.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Un profil avec ce nom existe déjà.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const item = await Entrepreneur.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    res.json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Un profil avec ce nom existe déjà.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await Entrepreneur.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    res.json({ success: true, message: 'Profil supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
