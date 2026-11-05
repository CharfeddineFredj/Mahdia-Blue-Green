/**
 * Seed Script for Default Categories and Levels
 * 
 * Categories for Mahdia Blue and Green:
 * - Économie Bleue (Blue Economy)
 * - Économie Verte (Green Economy)
 * - Économie Circulaire (Circular Economy)
 * 
 * Levels represent user expertise/engagement levels
 * 
 * Run with: node scripts/seedCategories.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Category = require('../models/Category');
const Level = require('../models/Level');

// Default Categories as per Cahier des Charges
const defaultCategories = [
  {
    title: 'Économie Bleue',
    description: 'Économie bleue et développement durable des ressources marines et côtières de Mahdia. Pêche durable, aquaculture, tourisme côtier, énergies marines renouvelables.',
    isActive: true
  },
  {
    title: 'Économie Verte',
    description: 'Économie verte et transition écologique. Agriculture durable, énergies renouvelables, efficacité énergétique, gestion durable des déchets.',
    isActive: true
  },
  {
    title: 'Économie Circulaire',
    description: 'Économie circulaire et valorisation des ressources. Recyclage, réutilisation, éco-conception, symbiose industrielle.',
    isActive: true
  },
  {
    title: 'Actualités',
    description: 'Actualités et nouvelles du projet Mahdia Blue and Green.',
    isActive: true
  },
  {
    title: 'Événements',
    description: 'Événements, ateliers et formations organisés par le projet.',
    isActive: true
  },
  {
    title: 'Ressources',
    description: 'Guides pratiques, documentation et ressources pour entrepreneurs.',
    isActive: true
  }
];

// Subcategories for main economy types
const subCategories = {
  'Économie Bleue': [
    { title: 'Pêche Durable', description: 'Pratiques de pêche respectueuses de l\'environnement' },
    { title: 'Aquaculture', description: 'Élevage durable de poissons et fruits de mer' },
    { title: 'Tourisme Côtier', description: 'Écotourisme et tourisme balnéaire durable' },
    { title: 'Énergies Marines', description: 'Énergies renouvelables d\'origine marine' }
  ],
  'Économie Verte': [
    { title: 'Agriculture Durable', description: 'Agriculture biologique et agroécologie' },
    { title: 'Énergies Renouvelables', description: 'Solaire, éolien et autres énergies propres' },
    { title: 'Efficacité Énergétique', description: 'Réduction de la consommation énergétique' },
    { title: 'Gestion des Déchets', description: 'Traitement et valorisation des déchets' }
  ],
  'Économie Circulaire': [
    { title: 'Recyclage', description: 'Transformation des déchets en ressources' },
    { title: 'Réutilisation', description: 'Prolonger la vie des produits' },
    { title: 'Éco-conception', description: 'Conception de produits durables' },
    { title: 'Symbiose Industrielle', description: 'Mutualisation des ressources entre entreprises' }
  ]
};

// Default Levels for user progression
const defaultLevels = [
  {
    name: 'Découverte',
    level: 1,
    description: 'Niveau débutant - Découverte des concepts de base de l\'économie durable',
    minPoints: 0
  },
  {
    name: 'Initiation',
    level: 2,
    description: 'Niveau intermédiaire débutant - Premiers pas dans l\'entrepreneuriat vert/bleu',
    minPoints: 100
  },
  {
    name: 'Exploration',
    level: 3,
    description: 'Niveau intermédiaire - Exploration des opportunités et des ressources',
    minPoints: 250
  },
  {
    name: 'Développement',
    level: 4,
    description: 'Niveau avancé - Développement de projets concrets',
    minPoints: 500
  },
  {
    name: 'Expert',
    level: 5,
    description: 'Niveau expert - Expertise reconnue et capacité de mentorat',
    minPoints: 1000
  }
];

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing categories (optional - comment out if you want to keep existing)
    // await Category.deleteMany({});
    // console.log('🗑️  Cleared existing categories');

    // Seed main categories
    console.log('\n📂 Seeding main categories...');
    const createdCategories = {};
    
    for (const category of defaultCategories) {
      const existing = await Category.findOne({ title: category.title });
      if (existing) {
        console.log(`   ⏭️  Category "${category.title}" already exists`);
        createdCategories[category.title] = existing;
      } else {
        const created = await Category.create(category);
        console.log(`   ✅ Created category: ${category.title}`);
        createdCategories[category.title] = created;
      }
    }

    // Seed subcategories
    console.log('\n📁 Seeding subcategories...');
    for (const [parentTitle, subs] of Object.entries(subCategories)) {
      const parent = createdCategories[parentTitle];
      if (!parent) {
        console.log(`   ⚠️  Parent category "${parentTitle}" not found, skipping subcategories`);
        continue;
      }

      for (const subCat of subs) {
        const existing = await Category.findOne({ title: subCat.title });
        if (existing) {
          console.log(`   ⏭️  Subcategory "${subCat.title}" already exists`);
        } else {
          await Category.create({
            ...subCat,
            parentId: parent._id,
            isActive: true
          });
          console.log(`   ✅ Created subcategory: ${subCat.title} (under ${parentTitle})`);
        }
      }
    }

    // Check if Level model exists
    if (Level) {
      // Clear existing levels (optional)
      // await Level.deleteMany({});
      // console.log('🗑️  Cleared existing levels');

      // Seed levels
      console.log('\n📊 Seeding levels...');
      for (const level of defaultLevels) {
        const existing = await Level.findOne({ level: level.level });
        if (existing) {
          console.log(`   ⏭️  Level ${level.level} "${level.name}" already exists`);
        } else {
          await Level.create(level);
          console.log(`   ✅ Created level: ${level.level} - ${level.name}`);
        }
      }
    }

    console.log('\n🎉 Database seeding completed successfully!');
    
    // Display summary
    const categoryCount = await Category.countDocuments();
    const levelCount = Level ? await Level.countDocuments() : 0;
    console.log(`\n📈 Summary:`);
    console.log(`   - Total categories: ${categoryCount}`);
    console.log(`   - Total levels: ${levelCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();
