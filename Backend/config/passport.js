const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { getGoogleRedirectUri } = require('../utils/googleOAuthRedirectUri');

/** Ne pas conserver l’URL photo Google (affichage souvent incorrect / bloqué) — initiales côté client. */
function isGoogleHostedProfileImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const u = url.toLowerCase();
  return u.includes('googleusercontent.com') || u.includes('ggpht.com');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth — redirect_uri absolue uniquement (évite redirect_uri_mismatch avec proxy Vite / Host variable).
// Doit être identique à l’URI « Autorisée » dans Google Cloud Console et à l’origine utilisée par le bouton Google (VITE_OAUTH_BACKEND_ORIGIN / port API).
const googleClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
const googleClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
const googleCallbackURL = getGoogleRedirectUri();

// Google OAuth Strategy
if (googleClientId && googleClientSecret) {
  console.log(
    '[OAuth] Copiez cette URI dans Google Cloud → Identifiants → URI de redirection autorisées :',
    googleCallbackURL
  );
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackURL,
        proxy: true,
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Extract profile information from Google
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const firstName = profile.name?.givenName || '';
          const lastName = profile.name?.familyName || '';
          const displayName = profile.displayName || `${firstName} ${lastName}`.trim() || email?.split('@')[0];

          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            let needsUpdate = false;

            // Connexion Google : la méthode affichée redevient "google"
            if (user.authProvider !== 'google') {
              user.authProvider = 'google';
              needsUpdate = true;
            }

            if (firstName && user.firstName !== firstName) {
              user.firstName = firstName;
              needsUpdate = true;
            }
            if (lastName && user.lastName !== lastName) {
              user.lastName = lastName;
              needsUpdate = true;
            }
            if (isGoogleHostedProfileImageUrl(user.profilePicture)) {
              user.profilePicture = '';
              needsUpdate = true;
            }
            if (!user.isEmailVerified) {
              user.isEmailVerified = true;
              user.isVerified = true;
              needsUpdate = true;
            }

            if (needsUpdate) {
              await user.save();
            }
            return done(null, user);
          }

          if (email) {
            user = await User.findOne({ email });
            if (user) {
              user.googleId = profile.id;
              user.authProvider = 'google';
              user.isEmailVerified = true;
              user.isVerified = true;
              user.firstName = firstName || user.firstName;
              user.lastName = lastName || user.lastName;
              if (isGoogleHostedProfileImageUrl(user.profilePicture)) {
                user.profilePicture = '';
              }
              await user.save();
              return done(null, user);
            }
          }

          const newUser = new User({
            email: email,
            username: displayName,
            googleId: profile.id,
            authProvider: 'google',
            isVerified: true,
            isEmailVerified: true,
            questionnaireCompleted: false,
            firstName: firstName,
            lastName: lastName,
            profilePicture: '',
            role: 'user'
          });

          await newUser.save();
          done(null, newUser);
        } catch (error) {
          console.error('Google OAuth error:', error);
          done(error, null);
        }
      }
    )
  );
}

module.exports = passport;
