const mongoose = require('mongoose');

const programSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    themes: [String]
  },
  { _id: false }
);

const platformInfoSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    name: String,
    tagline: String,
    mission: String,
    description: String,
    objectives: [String],
    programs: [programSchema],
    howToParticipate: String,
    contact: {
      email: String,
      phone: String,
      address: String,
      socialMedia: {
        facebook: String,
        linkedin: String
      }
    },
    location: String,
    targetAudience: [String]
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformInfo', platformInfoSchema);

