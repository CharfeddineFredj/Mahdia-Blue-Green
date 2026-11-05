const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIdentifier, isEmailIdentifier, validateUsername } = require('../utils/userIdentifier');

describe('Identifiant de connexion', () => {
  test('normalise les chaînes et rejette les objets (injection NoSQL)', () => {
    assert.equal(normalizeIdentifier('  ali_dev  '), 'ali_dev');
    assert.equal(normalizeIdentifier({ $ne: null }), '');
    assert.equal(normalizeIdentifier(undefined), '');
    assert.equal(normalizeIdentifier(42), '');
  });

  test('« @ » distingue un e-mail d’un nom d’utilisateur', () => {
    assert.equal(isEmailIdentifier('ali@mahdia.tn'), true);
    assert.equal(isEmailIdentifier('ali_dev'), false);
  });
});

describe('validateUsername', () => {
  test('accepte lettres (accentuées), chiffres, point, tiret et underscore', () => {
    for (const u of ['ali', 'Ali_Dev', 'hamza.ghoul', 'naïma-2026', 'محمد']) {
      assert.equal(validateUsername(u), '', u);
    }
  });

  test('refuse « @ », espaces, longueur hors limites', () => {
    assert.notEqual(validateUsername('ali@dev'), '');
    assert.notEqual(validateUsername('ali dev'), '');
    assert.notEqual(validateUsername('al'), '');
    assert.notEqual(validateUsername('a'.repeat(31)), '');
    assert.notEqual(validateUsername(''), '');
  });
});
