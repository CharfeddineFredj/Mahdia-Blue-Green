const mongoose = require('mongoose');

const economyBlockSchema = new mongoose.Schema(
  {
    name: String,
    definition: String,
    sectors: [String],
    principles: [String],
    examples: [String],
    tunisiaContext: String,
    mahdiaSpecific: String,
    mahdiaInitiatives: [String]
  },
  { _id: false }
);

const economyDefinitionsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    blueEconomy: economyBlockSchema,
    blueCircularEconomy: economyBlockSchema,
    greenEconomy: economyBlockSchema,
    circularEconomy: economyBlockSchema
  },
  { timestamps: true }
);

module.exports = mongoose.model('EconomyDefinitions', economyDefinitionsSchema);

