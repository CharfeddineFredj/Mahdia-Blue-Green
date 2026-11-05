const mongoose = require('mongoose');
const TeamMember = require('../models/TeamMember');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await TeamMember.updateMany(
    { role: 'Developer' },
    { $set: { role: 'Technicien supérieur en informatique' } }
  );
  console.log(r.modifiedCount + ' membre(s) mis a jour.');
  process.exit(0);
})();
