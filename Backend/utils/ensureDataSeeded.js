const SeedState = require('../models/SeedState');
const User = require('../models/User');
const seedDataFolder = require('./seedDataFolder');

/**
 * Ensure the DB is seeded once after a reset.
 * Uses SeedState marker to avoid reseeding on every boot.
 */
const ensureDataSeeded = async () => {
  const seedKey = 'data-folder-v1';

  const already = await SeedState.findOne({ key: seedKey });
  if (already) {
    return { seeded: false };
  }

  const superadmin = await User.findOne({ role: 'superadmin' });
  if (!superadmin) {
    throw new Error('Superadmin not found for seeding');
  }

  const result = await seedDataFolder({ authorId: superadmin._id });

  await SeedState.create({
    key: seedKey,
    meta: {
      createdPosts: result.createdPosts,
      createdResources: result.createdResources,
      seededTeam: result.seededTeam,
      seededPartners: result.seededPartners,
      seededEntrepreneurs: result.seededEntrepreneurs,
      seededFaq: result.seededFaq
    }
  });

  return { seeded: true, result };
};

module.exports = ensureDataSeeded;

