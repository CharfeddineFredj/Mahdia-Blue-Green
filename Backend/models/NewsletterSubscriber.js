const mongoose = require('mongoose');

const newsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    source: { type: String, trim: true, default: 'home' },
    /** active : reçoit la newsletter ; unsubscribed : désabonné (lien dans l'e-mail) */
    status: { type: String, enum: ['active', 'unsubscribed'], default: 'active', index: true },
    unsubscribedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

newsletterSubscriberSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
