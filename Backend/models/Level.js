const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: [true, 'Level number is required'],
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Level name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Static method to get level by number
levelSchema.statics.getLevel = async function(levelNumber) {
  return await this.findOne({ level: levelNumber });
};

module.exports = mongoose.model('Level', levelSchema);
