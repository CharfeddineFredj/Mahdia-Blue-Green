const mongoose = require('mongoose');

const entrepreneurSchema = new mongoose.Schema(
  {
    externalId: { type: Number, index: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true },
    organization: { type: String, trim: true },
    quote: { type: String, trim: true },
    avatar: { type: String, trim: true },
    sortOrder: { type: Number, default: 999 }
  },
  { timestamps: true }
);

entrepreneurSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Entrepreneur', entrepreneurSchema);
