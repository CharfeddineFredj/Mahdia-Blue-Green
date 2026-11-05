const Entrepreneur = require('../models/Entrepreneur');
const entrepreneurs = require('../data/entrepreneurs');

/**
 * Ensure legacy entrepreneurs are present in DB.
 * This is safe to run on every startup (upsert by unique name).
 */
const ensureEntrepreneursSeeded = async () => {
  const existingCount = await Entrepreneur.countDocuments();
  if (existingCount > 0) {
    return { seeded: false, reason: 'already-has-data' };
  }

  if (!Array.isArray(entrepreneurs) || entrepreneurs.length === 0) {
    return { seeded: false, reason: 'no-seed-data' };
  }

  const docs = entrepreneurs.map((item) => ({
    externalId: item.id,
    name: item.name,
    role: item.role != null ? String(item.role) : '',
    organization: item.organization != null ? String(item.organization) : '',
    quote: item.quote != null ? String(item.quote) : '',
    avatar: item.avatar != null ? String(item.avatar) : '',
    sortOrder: item.sortOrder ?? 999,
  }));

  await Entrepreneur.insertMany(docs, { ordered: false });
  return { seeded: true, count: docs.length };
};

module.exports = ensureEntrepreneursSeeded;
