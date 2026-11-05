/**
 * Seed Script for SuperAdmin User
 *
 * Crée le compte superadmin à partir des variables SUPERADMIN_EMAIL,
 * SUPERADMIN_USERNAME et SUPERADMIN_PASSWORD (fichier .env).
 *
 * Run with: node scripts/seedSuperAdmin.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const connectDB = require('../config/database');

const SUPERADMIN_DATA = {
  email: process.env.SUPERADMIN_EMAIL,
  username: process.env.SUPERADMIN_USERNAME,
  password: process.env.SUPERADMIN_PASSWORD,
  role: 'superadmin',
  isActive: true,
  questionnaireCompleted: true,
  isEmailVerified: true
};

const seedSuperAdmin = async () => {
  if (!SUPERADMIN_DATA.email || !SUPERADMIN_DATA.username || !SUPERADMIN_DATA.password) {
    console.error('❌ Définissez SUPERADMIN_EMAIL, SUPERADMIN_USERNAME et SUPERADMIN_PASSWORD dans .env');
    process.exit(1);
  }

  try {
    await connectDB();

    console.log('🔍 Checking for existing superadmin...');
    const existingSuperAdmin = await User.findOne({
      $or: [
        { email: SUPERADMIN_DATA.email },
        { username: SUPERADMIN_DATA.username },
        { role: 'superadmin' }
      ]
    });

    if (existingSuperAdmin) {
      console.log('⚠️  SuperAdmin already exists:');
      console.log(`   Email: ${existingSuperAdmin.email}`);
      console.log(`   Username: ${existingSuperAdmin.username}`);
      console.log(`   Role: ${existingSuperAdmin.role}`);
      console.log('\n✅ Using existing superadmin account.');
      process.exit(0);
    }

    console.log('📝 Creating new superadmin account...');
    await User.create(SUPERADMIN_DATA);

    console.log('\n✅ SuperAdmin account created successfully!');
    console.log(`Email:    ${SUPERADMIN_DATA.email}`);
    console.log(`Username: ${SUPERADMIN_DATA.username}`);
    console.log('Password: (défini par SUPERADMIN_PASSWORD)');
    console.log('⚠️  Change the password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding superadmin:', error.message);
    process.exit(1);
  }
};

seedSuperAdmin();
