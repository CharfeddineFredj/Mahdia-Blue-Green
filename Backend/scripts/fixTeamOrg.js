const mongoose = require('mongoose');
const TeamMember = require('../models/TeamMember');
require('dotenv').config();

const replacements = [
  { from: 'Backend Team',  to: "Membre de l'équipe backend" },
  { from: 'Frontend Team', to: "Membre de l'équipe frontend" },
  { from: 'Full Stack Developer', to: "Membre de l'équipe full stack" },
  { from: 'Full Stack Technicien supérieur en informatique', to: "Membre de l'équipe full stack" },
];

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Connected');

  let total = 0;
  for (const r of replacements) {
    const res = await TeamMember.updateMany(
      { organization: r.from },
      { $set: { organization: r.to } }
    );
    if (res.modifiedCount > 0) {
      console.log(`  "${r.from}" -> "${r.to}" : ${res.modifiedCount} membre(s)`);
      total += res.modifiedCount;
    }
  }

  console.log(`\n${total} membre(s) mis a jour.`);
  process.exit(0);
})();
