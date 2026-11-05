/**
 * Une seule source pour redirect_uri Google (Passport + routes d’aide).
 * Doit correspondre byte à byte à une entrée « URI de redirection autorisées » dans Google Cloud Console.
 */
function getGoogleRedirectUri() {
  const port = (process.env.PORT || '5000').toString();
  const fromEnv = (process.env.GOOGLE_CALLBACK_URL || '').trim();
  if (fromEnv) return fromEnv;
  return `http://localhost:${port}/api/oauth/google/callback`;
}

module.exports = { getGoogleRedirectUri };
