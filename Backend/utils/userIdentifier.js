const User = require('../models/User');

/** Comparaison insensible à la casse et aux accents pour les noms d'utilisateur */
const USERNAME_COLLATION = { locale: 'fr', strength: 1 };

/**
 * Normalise l'identifiant de connexion (e-mail ou nom d'utilisateur).
 * Toute valeur non textuelle (ex. objet `{ $ne: null }`) est rejetée.
 */
function normalizeIdentifier(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

/** Un identifiant contenant « @ » est traité comme un e-mail (interdit dans les noms d'utilisateur). */
function isEmailIdentifier(identifier) {
  return identifier.includes('@');
}

/**
 * Trouve un utilisateur par e-mail ou par nom d'utilisateur.
 * - e-mail : comparaison en minuscules (stockage en minuscules dans le modèle)
 * - nom d'utilisateur : correspondance exacte, sinon insensible à la casse si elle est unique
 * @param {string} identifier
 * @param {string} [select] champs supplémentaires (ex. '+password')
 */
async function findUserByIdentifier(identifier, select = '') {
  const id = normalizeIdentifier(identifier);
  if (!id) return null;

  if (isEmailIdentifier(id)) {
    return User.findOne({ email: id.toLowerCase() }).select(select);
  }

  const exact = await User.findOne({ username: id }).select(select);
  if (exact) return exact;

  // Anciens comptes : « Ali » et « ali » peuvent coexister — on refuse l'ambiguïté
  const matches = await User.find({ username: id })
    .collation(USERNAME_COLLATION)
    .limit(2)
    .select(select);
  return matches.length === 1 ? matches[0] : null;
}

/** Le nom d'utilisateur est-il déjà pris (insensible à la casse et aux accents) ? */
async function isUsernameTaken(username) {
  const found = await User.findOne({ username: normalizeIdentifier(username) })
    .collation(USERNAME_COLLATION)
    .select('_id')
    .lean();
  return !!found;
}

/** @returns {string} message d'erreur, ou '' si valide */
function validateUsername(username) {
  const u = normalizeIdentifier(username);
  if (u.length < 3) return 'Le nom d’utilisateur doit contenir au moins 3 caractères.';
  if (u.length > 30) return 'Le nom d’utilisateur ne peut pas dépasser 30 caractères.';
  if (!/^[\p{L}\p{N}._-]+$/u.test(u)) {
    return 'Le nom d’utilisateur ne peut contenir que des lettres, chiffres, points, tirets et « _ » (sans espace ni « @ »).';
  }
  return '';
}

module.exports = {
  USERNAME_COLLATION,
  normalizeIdentifier,
  isEmailIdentifier,
  findUserByIdentifier,
  isUsernameTaken,
  validateUsername,
};
