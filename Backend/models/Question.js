const mongoose = require('mongoose');

/**
 * Question Schema
 * 
 * For registration questionnaires, the 'personalInfoField' maps the answer
 * to the corresponding PersonalInfo field.
 * 
 * Valid personalInfoField values:
 * - firstName, lastName, dateOfBirth, gender, phone, bio, avatar
 * - address.street, address.city, address.state, address.country, address.zipCode
 * - socialLinks.website, socialLinks.twitter, socialLinks.linkedin, socialLinks.github
 * - preferences.newsletter, preferences.notifications
 */
const questionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'multiple_choice', 'single_choice', 'rating', 'boolean', 'date'],
    default: 'text'
  },
  options: [{
    type: String,
    trim: true
  }],
  order: {
    type: Number,
    default: 0
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  // Category for grouping questions (e.g., 'personal', 'contact', 'preferences')
  category: {
    type: String,
    trim: true
  },
  // Maps this question's answer to a PersonalInfo field (for registration questionnaires)
  personalInfoField: {
    type: String,
    enum: [
      null,
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'phone', 'bio', 'avatar',
      'profession', 'sector', 'educationLevel', 'institution',
      'address.street', 'address.city', 'address.state', 'address.country', 'address.zipCode',
      'socialLinks.website', 'socialLinks.twitter', 'socialLinks.linkedin', 'socialLinks.github',
      'preferences.newsletter', 'preferences.notifications'
    ],
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);
