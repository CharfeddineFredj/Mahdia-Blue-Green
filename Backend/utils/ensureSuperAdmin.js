const User = require('../models/User');

// Aucune valeur par défaut : le superadmin n'est créé que si les trois
// variables suivantes sont définies dans le fichier .env.
const ensureSuperAdmin = async () => {
  const existing = await User.findOne({ role: 'superadmin' });
  if (existing) {
    return { created: false, user: existing };
  }

  const { SUPERADMIN_EMAIL, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD } = process.env;
  if (!SUPERADMIN_EMAIL || !SUPERADMIN_USERNAME || !SUPERADMIN_PASSWORD) {
    console.warn('Superadmin non créé : définissez SUPERADMIN_EMAIL, SUPERADMIN_USERNAME et SUPERADMIN_PASSWORD dans .env');
    return { created: false, user: null };
  }

  const createdUser = await User.create({
    email: SUPERADMIN_EMAIL,
    username: SUPERADMIN_USERNAME,
    password: SUPERADMIN_PASSWORD,
    role: 'superadmin',
    isActive: true,
    questionnaireCompleted: true,
    authProvider: 'local',
    isVerified: true,
    isEmailVerified: true,
  });

  return { created: true, user: createdUser };
};

module.exports = ensureSuperAdmin;
