const mongoose = require('mongoose');
const TeamMember = require('../models/TeamMember');
require('dotenv').config();

const avatarMap = {
  'Ala Amara': '/images/team/ala-amara.jpg',
  'Mohamed Aziz Jlassi': '/images/team/mohamed-aziz-jlassi.jpg',
  'Zied Fatnassi': '/images/team/zied-fatnassi.jpeg',
  'Rourou Mokhtar': '/images/team/mokhtar-rourou.jpg',
  'Amri Aidh': '/images/team/amri-aidh.png',
  'Oussema Chandoul': '/images/team/oussema-chandoul.jpeg',
  'Mohamed Harbi': '/images/team/mohamed-harbi.jpg',
  'Ranya Hammami': '/images/team/ranya-hammami.jpg',
  'Israa Ayadi': '/images/team/ayadi-israa.png',
  'Molka Tlili': '/images/team/molka-tlili.png',
  'Mohamed Ali Heni': '/images/team/mohamed-ali-heni.jpg',
  'Ihsen Ben Brahim': '/images/team/ihsen-ben-brahim.png',
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    let updated = 0;
    for (const [name, avatar] of Object.entries(avatarMap)) {
      const result = await TeamMember.updateOne(
        { name, $or: [{ avatar: { $exists: false } }, { avatar: '' }, { avatar: null }] },
        { $set: { avatar } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  + ${name} -> ${avatar}`);
        updated++;
      }
    }

    console.log(`\n${updated} membre(s) mis a jour.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
