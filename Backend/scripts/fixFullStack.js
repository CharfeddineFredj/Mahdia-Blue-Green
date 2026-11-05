const mongoose = require('mongoose');
const TeamMember = require('../models/TeamMember');
require('dotenv').config();

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await TeamMember.updateMany(
    { organization: "Membre de l'équipe full stack" },
    { $set: { organization: "Membre de l'équipe Full Stack" } }
  );
  console.log(r.modifiedCount + ' membre(s) mis a jour.');
  process.exit(0);
})();
