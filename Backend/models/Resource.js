const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Resource title is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['document', 'video', 'link', 'image', 'file'],
    required: true
  },
  url: {
    type: String,
    required: [true, 'Resource URL is required']
  },
  description: {
    type: String,
    trim: true
  },
  fileExtension: {
    type: String,
    trim: true,
    lowercase: true
  },
  mimeType: {
    type: String,
    trim: true,
    lowercase: true
  },
  originalName: {
    type: String,
    trim: true
  },
  fileKind: {
    type: String,
    enum: ['pdf', 'word', 'excel', 'powerpoint', 'text', 'archive', 'image', 'video', 'other'],
    default: 'other'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  /** Aperçu calculé côté serveur : image du site (lien) ou début du texte (Word / Excel / CSV) */
  previewImage: { type: String, default: null },
  previewText: { type: String, default: null },
  previewUpdatedAt: { type: Date, default: null },
  /** Nombre de clics (téléchargement ou ouverture) enregistrés */
  downloadsCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resource', resourceSchema);
