const mongoose = require('mongoose');

const partnerSchema = new mongoose.Schema(
  {
    externalId: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true },
    description: { type: String, trim: true },
    role: { type: String, trim: true },
    logo: { type: String, trim: true },
    website: { type: String, trim: true },
    collaboration: { type: String, trim: true },
    sortOrder: { type: Number, default: 999 }
  },
  { timestamps: true }
);

partnerSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Partner', partnerSchema);

