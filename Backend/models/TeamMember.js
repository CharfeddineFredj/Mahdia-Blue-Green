const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema(
  {
    externalId: { type: Number, index: true },
    sortOrder: { type: Number, default: 999 },
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    organization: { type: String, trim: true },
    bio: { type: String, trim: true },
    fullBio: { type: String, trim: true },
    expertise: [{ type: String, trim: true }],
    contact: { type: String, trim: true },
    email: { type: String, trim: true },
    avatar: { type: String, trim: true },
    linkedin: { type: String, trim: true },
    github: { type: String, trim: true },
    facebook: { type: String, trim: true },
    instagram: { type: String, trim: true },
    twitter: { type: String, trim: true },
  },
  { timestamps: true }
);

teamMemberSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);

