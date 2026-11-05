const mongoose = require('mongoose');

const seedStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    meta: { type: mongoose.Schema.Types.Mixed }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SeedState', seedStateSchema);

