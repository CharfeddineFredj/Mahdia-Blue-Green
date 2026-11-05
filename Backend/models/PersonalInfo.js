const mongoose = require('mongoose');

const personalInfoSchema = new mongoose.Schema({
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  bio: {
    type: String,
    maxlength: 500
  },
  profession: {
    type: String,
    trim: true
  },
  sector: {
    type: String,
    trim: true
  },
  educationLevel: {
    type: String,
    trim: true
  },
  institution: {
    type: String,
    trim: true
  },
  avatar: {
    type: String // URL to avatar image
  },
  socialLinks: {
    website: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    github: { type: String }
  },
  preferences: {
    newsletter: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Virtual for full name
personalInfoSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

module.exports = mongoose.model('PersonalInfo', personalInfoSchema);
