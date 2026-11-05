const mongoose = require('mongoose');
const TeamMember = require('../models/TeamMember');
require('dotenv').config();

const newMembers = [
  {
    externalId: 13,
    sortOrder: 13,
    name: 'Jilani Messaoud',
    organization: 'Dev Team',
    role: 'Developer',
    email: '',
    contact: '',
    avatar: '/images/team/jilani-messaoud.jpg',
    linkedin: '',
    github: '',
    facebook: '',
  },
  {
    externalId: 14,
    sortOrder: 14,
    name: 'Charfeddine Fredj',
    organization: 'Dev Team',
    role: 'Developer',
    email: '',
    contact: '',
    avatar: '/images/team/charfeddine-fredj.jpeg',
    linkedin: '',
    github: '',
    facebook: '',
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    for (const member of newMembers) {
      const exists = await TeamMember.findOne({ name: member.name });
      if (exists) {
        console.log(`  ~ ${member.name} existe deja, skip.`);
        continue;
      }
      await TeamMember.create(member);
      console.log(`  + ${member.name} ajoute avec succes.`);
    }

    console.log('\nTermine.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
