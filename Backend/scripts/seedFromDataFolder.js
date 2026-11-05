/**
 * Seed everything from Backend/data into MongoDB.
 *
 * Run with:
 *   node scripts/seedFromDataFolder.js
 *
 * This will upsert:
 * - Categories + Levels (via existing seed script logic)
 * - Initial content (articles/events/resources)
 * - Team members
 * - Partners
 * - FAQ
 * - Platform info (singleton)
 * - Economy definitions (singleton)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = require('../config/database');
const ensureSuperAdmin = require('../utils/ensureSuperAdmin');
const seedDataFolder = require('../utils/seedDataFolder');
const User = require('../models/User');

async function main() {
  await connectDB();
  await ensureSuperAdmin();

  const superadmin = await User.findOne({ role: 'superadmin' });
  if (!superadmin) throw new Error('Superadmin not found');

  const result = await seedDataFolder({ authorId: superadmin._id });

  console.log('✅ Seed from data folder done.');
  console.log(`- Posts created: ${result.createdPosts}`);
  console.log(`- Resources created: ${result.createdResources}`);
  console.log(`- Team upserted: ${result.seededTeam}`);
  console.log(`- Partners upserted: ${result.seededPartners}`);
  console.log(`- FAQ upserted: ${result.seededFaq}`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Seed failed:', err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

