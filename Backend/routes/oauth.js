const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');
const twoFactorController = require('../controllers/twoFactorController');
const { getGoogleRedirectUri } = require('../utils/googleOAuthRedirectUri');

function maskClientId(id) {
  if (!id || id.length < 24) return '(non défini)';
  return `${id.slice(0, 12)}…${id.slice(-18)}`;
}

// Page simple : copier-coller l’URI dans Google Cloud (redirect_uri_mismatch)
router.get('/google/setup', (req, res) => {
  const uri = getGoogleRedirectUri();
  const cid = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Google OAuth — URI de redirection</title>
<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem}pre{background:#f4f4f5;padding:1rem;overflow:auto;word-break:break-all;border-radius:8px}code{font-size:0.9rem}.ok{color:#15803d}.warn{color:#b45309}ol{line-height:1.6}a{color:#2563eb}</style></head><body>
<h1>Configurer Google Cloud (erreur redirect_uri_mismatch)</h1>
<p class="warn"><strong>Copiez cette URI exactement</strong> (sans espace avant/après, sans slash en trop) :</p>
<pre id="uri">${uri.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>
<p><button type="button" id="copy">Copier l’URI</button></p>
<p>Client ID utilisé par le serveur (vérifiez que c’est le même dans la console) : <code>${maskClientId(cid).replace(/</g, '&lt;')}</code></p>
<h2>Étapes</h2>
<ol>
<li><a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Google Cloud → APIs et services → Identifiants</a></li>
<li>Ouvrez le client OAuth de type <strong>Application Web</strong> dont le <strong>ID client</strong> correspond à votre <code>.env</code> (<code>GOOGLE_CLIENT_ID</code>).</li>
<li>Section <strong>URI de redirection autorisées</strong> → <strong>+ Ajouter une URI</strong> → collez la valeur du cadre ci-dessus → <strong>Enregistrer</strong>.</li>
<li>Attendez 1–5 minutes, puis réessayez en navigation privée.</li>
</ol>
<p>Doc Google : <a href="https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors-redirect-uri-mismatch" target="_blank" rel="noopener">redirect_uri_mismatch</a></p>
<p><a href="/api/oauth/google/diagnostic">Diagnostic JSON</a></p>
<script>document.getElementById('copy').onclick=function(){navigator.clipboard.writeText(${JSON.stringify(uri)}).then(function(){alert('Copié');});};</script>
</body></html>`;
  res.type('html').send(html);
});

router.get('/google/diagnostic', (req, res) => {
  const redirectUri = getGoogleRedirectUri();
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  res.json({
    redirect_uri_used_by_this_server: redirectUri,
    client_id_masked: maskClientId(clientId),
    client_id_is_web_format: /\.apps\.googleusercontent\.com$/.test(clientId),
    google_cloud_console_credentials: 'https://console.cloud.google.com/apis/credentials',
    doc_redirect_uri_mismatch:
      'https://developers.google.com/identity/protocols/oauth2/web-server#authorization-errors-redirect-uri-mismatch',
    checklist: [
      'Le client OAuth doit être de type « Application Web », pas Android / iOS / Ordinateur.',
      'L’URI ci-dessus doit apparaître telle quelle sous « URI de redirection autorisées » du MÊME client que GOOGLE_CLIENT_ID.',
      'Sur l’écran d’erreur Google, « Error details » affiche redirect_uri=... : il doit être identique à redirect_uri_used_by_this_server.',
      'localhost et 127.0.0.1 sont deux URI différentes : enregistrez celle que le serveur envoie vraiment.'
    ]
  });
});

router.get('/google/expected-redirect-uri', (req, res) => {
  const uri = getGoogleRedirectUri();
  res.json({
    authorizedRedirectUri: uri,
    setup_page: '/api/oauth/google/setup',
    message:
      'Ajoutez exactement authorizedRedirectUri dans Google Cloud Console → Identifiants → client OAuth (Application Web) → URI de redirection autorisées.'
  });
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth?error=google_auth_failed`
  }),
  async (req, res) => {
    try {
      if (!req.user.isActive) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth?error=account_deactivated`);
      }

      if (req.user.twoFactorEnabled) {
        return res.redirect(`${process.env.FRONTEND_URL}/auth/2fa?email=${encodeURIComponent(req.user.email)}&temp=true`);
      }

      if (!req.user.questionnaireCompleted) {
        const Questionnaire = require('../models/Questionnaire');
        const registrationQ = await Questionnaire.findOne({
          isRegistrationQuestionnaire: true,
          isActive: true,
          isDeleted: false
        });

        if (registrationQ) {
          const tempToken = jwt.sign(
            { id: req.user._id, temp: true },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
          );
          return res.redirect(
            `${process.env.FRONTEND_URL}/auth/callback?tempToken=${tempToken}&requiresQuestionnaire=true`
          );
        }

      }

      const token = jwt.sign(
        { id: req.user._id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/auth?error=token_generation_failed`);
    }
  }
);

// 2FA routes
router.post('/2fa/enable', protect, twoFactorController.enable2FA);
router.post('/2fa/verify-setup', protect, twoFactorController.verifySetup);
router.post('/2fa/disable', protect, twoFactorController.disable2FA);
router.post('/2fa/verify', twoFactorController.verify2FA);
router.post('/2fa/backup-codes', protect, twoFactorController.generateBackupCodes);
router.post('/2fa/use-backup-code', twoFactorController.useBackupCode);

module.exports = router;
