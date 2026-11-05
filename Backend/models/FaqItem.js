const mongoose = require('mongoose');

const faqItemSchema = new mongoose.Schema(
  {
    externalId: { type: Number, index: true },
    category: { type: String, trim: true, index: true },
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

faqItemSchema.index({ question: 1 }, { unique: true });

module.exports = mongoose.model('FaqItem', faqItemSchema);

