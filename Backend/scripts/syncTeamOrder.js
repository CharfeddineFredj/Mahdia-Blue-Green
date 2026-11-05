const mongoose = require('mongoose');
const TeamMember = require('../models/TeamMember');
require('dotenv').config();

const updates = [
  { name: 'Jilani Messaoud',       sortOrder: 1,  externalId: 1,  organization: 'Full Stack Developer', role: 'Ingénieur informatique', email: 'naviristech@gmail.com', contact: '90131297', avatar: '/images/team/jilani-messaoud.jpg', linkedin: 'https://www.linkedin.com/in/jilani-messaoud-bb7794166/', github: 'https://www.linkedin.com/in/jilani-messaoud-bb7794166/', facebook: 'https://www.facebook.com/D9J6O' },
  { name: 'Charfeddine Fredj',     sortOrder: 2,  externalId: 2,  organization: 'Full Stack Developer', role: 'Ingénieur informatique', email: 'fradjcharf@gmail.com', contact: '50989069', avatar: '/images/team/charfeddine-fredj.jpeg', linkedin: 'https://www.linkedin.com/in/charfeddine-fredj-b30635141/', github: 'https://github.com/CharfeddineFredj', facebook: 'https://www.facebook.com/charf1998' },
  { name: 'Ala Amara',             sortOrder: 3,  externalId: 3  },
  { name: 'Mohamed Aziz Jlassi',   sortOrder: 4,  externalId: 4  },
  { name: 'Zied Fatnassi',         sortOrder: 5,  externalId: 5  },
  { name: 'Rourou Mokhtar',        sortOrder: 6,  externalId: 6  },
  { name: 'Amri Aidh',             sortOrder: 7,  externalId: 7  },
  { name: 'Oussema Chandoul',      sortOrder: 8,  externalId: 8  },
  { name: 'Mohamed Harbi',         sortOrder: 9,  externalId: 9  },
  { name: 'Ranya Hammami',         sortOrder: 10, externalId: 10 },
  { name: 'Israa Ayadi',           sortOrder: 11, externalId: 11 },
  { name: 'Molka Tlili',           sortOrder: 12, externalId: 12 },
  { name: 'Mohamed Ali Heni',      sortOrder: 13, externalId: 13 },
  { name: 'Ihsen Ben Brahim',      sortOrder: 14, externalId: 14 },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    for (const u of updates) {
      const { name, ...fields } = u;
      const result = await TeamMember.updateOne(
        { name },
        { $set: fields },
        { upsert: true }
      );
      const action = result.upsertedCount ? 'CREATED' : (result.modifiedCount ? 'UPDATED' : 'OK');
      console.log(`  ${action.padEnd(7)} #${fields.sortOrder.toString().padStart(2)} ${name}`);
    }

    console.log('\nSynchronisation terminee.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

run();
