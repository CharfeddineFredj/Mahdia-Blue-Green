const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema({
    // Visitor identification (anonymous)
    visitorId: {
        type: String,
        required: true,
        index: true
    },
    // IP address (hashed for privacy)
    ipHash: {
        type: String
    },
    // Page visited
    page: {
        type: String,
        default: '/'
    },
    // User agent
    userAgent: {
        type: String
    },
    // Referrer
    referrer: {
        type: String
    },
    // Timestamp
    visitedAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Index for date-based queries
visitSchema.index({ visitedAt: -1 });

module.exports = mongoose.model('Visit', visitSchema);
