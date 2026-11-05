const mongoose = require('mongoose');

const Category = require('../models/Category');
const Level = require('../models/Level');

const TeamMember = require('../models/TeamMember');
const Partner = require('../models/Partner');
const Entrepreneur = require('../models/Entrepreneur');
const FaqItem = require('../models/FaqItem');
const PlatformInfo = require('../models/PlatformInfo');
const EconomyDefinitions = require('../models/EconomyDefinitions');

const equipeDevSeed = require('../data/equipeDevSeed');
const partners = require('../data/partners');
const entrepreneurs = require('../data/entrepreneurs');
const faq = require('../data/faq');
const platformInfo = require('../data/platformInfo');
const economyDefinitions = require('../data/economyDefinitions');

const economyTitles = ['Économie Bleue', 'Économie Verte', 'Économie Circulaire'];

const upsertManyByUnique = async (Model, items, uniqueField) => {
  let createdOrUpdated = 0;
  for (const item of items) {
    const filter = { [uniqueField]: item[uniqueField] };
    await Model.updateOne(filter, { $set: item }, { upsert: true });
    createdOrUpdated += 1;
  }
  return createdOrUpdated;
};

async function seedCategoriesAndLevels() {
  for (const title of economyTitles) {
    const existing = await Category.findOne({ title });
    if (!existing) {
      await Category.create({ title, description: title, isActive: true });
    }
  }

  const levelNames = [
    { level: 1, name: 'Découverte' },
    { level: 2, name: 'Initiation' },
    { level: 3, name: 'Exploration' },
    { level: 4, name: 'Développement' },
    { level: 5, name: 'Expert' }
  ];

  for (const l of levelNames) {
    const existing = await Level.findOne({ level: l.level });
    if (!existing) {
      await Level.create({ level: l.level, name: l.name, description: l.name });
    }
  }
}

async function seedKnowledgeBase() {
  const seededTeam = await upsertManyByUnique(
    TeamMember,
    equipeDevSeed.map((t) => ({
      externalId: t.id,
      sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : t.id,
      name: t.name,
      role: t.role != null ? String(t.role) : '',
      organization: t.organization != null ? String(t.organization) : '',
      bio: '',
      fullBio: '',
      expertise: [],
      contact: t.contact != null ? String(t.contact) : '',
      email: t.email != null ? String(t.email) : t.contact != null ? String(t.contact) : '',
      avatar: t.avatar != null ? String(t.avatar) : '',
      linkedin: t.linkedin != null ? String(t.linkedin) : '',
      github: t.github != null ? String(t.github) : '',
      facebook: t.facebook != null ? String(t.facebook) : '',
      instagram: t.instagram != null ? String(t.instagram) : '',
      twitter: t.twitter != null ? String(t.twitter) : '',
    })),
    'name'
  );

  const seededPartners = await upsertManyByUnique(
    Partner,
    partners.map((p) => ({
      externalId: p.id,
      name: p.name,
      shortName: p.shortName,
      description: p.description,
      role: p.role,
      logo: p.logo,
      website: p.website,
      collaboration: p.collaboration,
      sortOrder: p.sortOrder ?? 999
    })),
    'name'
  );

  const seededEntrepreneurs = await upsertManyByUnique(
    Entrepreneur,
    entrepreneurs.map((e) => ({
      externalId: e.id,
      name: e.name,
      role: e.role != null ? String(e.role) : '',
      organization: e.organization != null ? String(e.organization) : '',
      quote: e.quote != null ? String(e.quote) : '',
      avatar: e.avatar != null ? String(e.avatar) : '',
      sortOrder: e.sortOrder ?? 999
    })),
    'name'
  );

  const seededFaq = await upsertManyByUnique(
    FaqItem,
    faq.map((f) => ({
      externalId: f.id,
      category: f.category,
      question: f.question,
      answer: f.answer
    })),
    'question'
  );

  await PlatformInfo.updateOne(
    { key: 'default' },
    { $set: { key: 'default', ...platformInfo } },
    { upsert: true }
  );

  await EconomyDefinitions.updateOne(
    { key: 'default' },
    { $set: { key: 'default', ...economyDefinitions } },
    { upsert: true }
  );

  return { seededTeam, seededPartners, seededEntrepreneurs, seededFaq };
}

/**
 * Seed data folder content (idempotent).
 * @param {{ authorId: mongoose.Types.ObjectId }} args
 */
async function seedDataFolder({ authorId }) {
  await seedCategoriesAndLevels();
  const kb = await seedKnowledgeBase();

  return { createdPosts: 0, createdResources: 0, ...kb };
}

module.exports = seedDataFolder;

