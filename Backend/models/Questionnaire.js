const mongoose = require('mongoose');

const questionnaireSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Questionnaire title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isRegistrationQuestionnaire: {
    type: Boolean,
    default: false
  },
  targetProfessions: {
    type: [String],
    default: []
  },
  opensAt: {
    type: Date,
    default: null
  },
  closesAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Questionnaire', questionnaireSchema);
