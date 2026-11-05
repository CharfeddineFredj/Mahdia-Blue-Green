const User = require('../models/User');
const ReactivationRequest = require('../models/ReactivationRequest');
const Questionnaire = require('../models/Questionnaire');
const Question = require('../models/Question');
const { sortQuestionnaireQuestions } = require('../utils/questionnaireSchedule');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendEmailVerificationCode } = require('../utils/emailService');
const { registerNewsletterSubscriber } = require('../utils/newsletterMail');
const bcrypt = require('bcryptjs');
const {
  normalizeIdentifier,
  findUserByIdentifier,
  isUsernameTaken,
  validateUsername
} = require('../utils/userIdentifier');

// Hash factice : la durée de réponse est la même que l'utilisateur existe ou non
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equalizer-not-a-password', 10);
const INVALID_CREDENTIALS_MESSAGE = 'Identifiant ou mot de passe incorrect.';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// Generate temporary token for questionnaire completion (short-lived)
const generateTempToken = (id) => {
  return jwt.sign({ id, temp: true }, process.env.JWT_SECRET, {
    expiresIn: '1h' // 1 hour to complete questionnaire
  });
};

// @desc    Register user - Step 1: create account + send verification email
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const username = normalizeIdentifier(req.body.username);
    const email = normalizeIdentifier(req.body.email).toLowerCase();
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom d’utilisateur, e-mail et mot de passe sont obligatoires.'
      });
    }

    // Le nom d'utilisateur sert aussi d'identifiant de connexion : pas de « @ », pas d'espace
    const usernameError = validateUsername(username);
    if (usernameError) {
      return res.status(400).json({ success: false, message: usernameError });
    }

    // Check if user exists (nom d'utilisateur comparé sans tenir compte de la casse)
    if (await User.exists({ email })) {
      return res.status(400).json({
        success: false,
        message: 'Un compte existe déjà avec cette adresse e-mail.'
      });
    }
    if (await isUsernameTaken(username)) {
      return res.status(400).json({
        success: false,
        message: 'Ce nom d’utilisateur est déjà pris.'
      });
    }

    // Create user — not verified, questionnaire not completed
    const user = await User.create({
      username,
      email,
      password,
      questionnaireCompleted: false,
      isEmailVerified: false
    });

    // Generate + send verification code (awaited so errors surface)
    const verificationCode = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    const emailResult = await sendEmailVerificationCode(user, verificationCode);
    if (!emailResult.success) {
      // Clean up user so they can retry registration
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de l'envoi de l'email de vérification. Vérifiez votre adresse email."
      });
    }

    // Return minimal info — user must verify email before anything else
    res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      message: 'Compte créé ! Vérifiez votre email pour continuer.',
      data: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    // `identifier` = e-mail ou nom d'utilisateur (`email` accepté pour compatibilité)
    const identifier = normalizeIdentifier(req.body.identifier ?? req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez saisir votre e-mail ou nom d’utilisateur et votre mot de passe.'
      });
    }

    const user = await findUserByIdentifier(identifier, '+password');

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MESSAGE
      });
    }

    // Compte Google/Microsoft sans mot de passe
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: `Ce compte utilise ${user.authProvider}. Veuillez vous connecter avec ${user.authProvider}.`
      });
    }

    // Le mot de passe est vérifié AVANT de révéler l'état du compte (désactivé, e-mail non vérifié)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: INVALID_CREDENTIALS_MESSAGE
      });
    }

    // Connexion par e-mail/mot de passe : la méthode affichée devient "local"
    if (user.authProvider !== 'local') {
      await User.updateOne({ _id: user._id }, { $set: { authProvider: 'local' } });
      user.authProvider = 'local';
    }

    // Check if user is active — allow explicit reactivation flow on the client
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message:
          'Ce compte est désactivé. Vous pouvez envoyer une demande de réactivation à l’administrateur.',
        canRequestReactivation: true,
        email: user.email
      });
    }

    // Block login if email not verified (local accounts only, staff roles exempted)
    const staffRoles = ['superadmin', 'analyst', 'moderator'];
    if (user.authProvider === 'local' && !user.isEmailVerified && !staffRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        message: 'Veuillez vérifier votre adresse email avant de vous connecter.',
        email: user.email
      });
    }

    // Check if user has 2FA enabled
    if (user.twoFactorEnabled) {
      return res.status(200).json({
        success: true,
        message: 'Code 2FA requis',
        requires2FA: true,
        email: user.email
      });
    }

    // Check if user has completed the registration questionnaire
    if (!user.questionnaireCompleted) {
      // Get the registration questionnaire
      const registrationQuestionnaire = await Questionnaire.findOne({
        isRegistrationQuestionnaire: true,
        isActive: true,
        isDeleted: false
      }).populate('questions');

      if (registrationQuestionnaire) {
        sortQuestionnaireQuestions(registrationQuestionnaire);
        // Generate temporary token for questionnaire completion
        const tempToken = generateTempToken(user._id);

        return res.status(200).json({
          success: true,
          message: 'Please complete the registration questionnaire to continue',
          requiresQuestionnaire: true,
          tempToken,
          questionnaire: registrationQuestionnaire,
          data: {
            id: user._id,
            username: user.username,
            email: user.email
          }
        });
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      requiresQuestionnaire: false,
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture || '',
        questionnaireCompleted: user.questionnaireCompleted
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};

// @desc    Logout user
// @route   GET /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Passer en compte « complet » si le questionnaire d'inscription n'existe plus (jeton temporaire)
// @route   POST /auth/finalize-registration
// @access  Private (temp JWT)
exports.finalizeRegistrationIfNoQuestionnaire = async (req, res) => {
  try {
    if (!req.user.temp) {
      return res.status(400).json({
        success: false,
        message: 'Session invalide pour cette étape. Reconnectez-vous ou complétez le questionnaire.'
      });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    const questionnaire = await Questionnaire.findOne({
      isRegistrationQuestionnaire: true,
      isActive: true,
      isDeleted: false
    });

    if (questionnaire) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez compléter le questionnaire d’inscription.'
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Inscription finalisée',
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        questionnaireCompleted: user.questionnaireCompleted
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// @desc    Request account reactivation (local accounts — password required)
// @route   POST /api/auth/request-reactivation
// @access  Public
exports.requestReactivation = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est déjà actif.'
      });
    }

    if (!user.password || user.authProvider !== 'local') {
      return res.status(400).json({
        success: false,
        message:
          'Ce compte ne se connecte pas par mot de passe. Utilisez le formulaire « Email du compte Google » ci-dessous.'
      });
    }

    const match = await user.comparePassword(password);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    const existing = await ReactivationRequest.findOne({ user: user._id, status: 'pending' });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Une demande est déjà en cours de traitement par un administrateur.'
      });
    }

    try {
      await ReactivationRequest.create({ user: user._id, status: 'pending' });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(200).json({
          success: true,
          message: 'Une demande est déjà en cours de traitement par un administrateur.'
        });
      }
      throw e;
    }

    res.status(201).json({
      success: true,
      message:
        'Demande envoyée. Si un administrateur accepte, votre compte sera réactivé et vous pourrez vous connecter.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l’envoi de la demande',
      error: error.message
    });
  }
};

// @desc    Request reactivation for OAuth-only (or no password) inactive accounts
// @route   POST /api/auth/request-reactivation-oauth
// @access  Public
exports.requestReactivationOAuth = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message:
          'Si un compte désactivé correspond à cet email, une demande a été transmise aux administrateurs.'
      });
    }

    if (user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte est déjà actif.'
      });
    }

    if (user.authProvider === 'local' && user.password) {
      return res.status(400).json({
        success: false,
        message: 'Utilisez le formulaire avec mot de passe pour ce compte.'
      });
    }

    const existing = await ReactivationRequest.findOne({ user: user._id, status: 'pending' });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Une demande est déjà en cours de traitement.'
      });
    }

    try {
      await ReactivationRequest.create({ user: user._id, status: 'pending' });
    } catch (e) {
      if (e.code === 11000) {
        return res.status(200).json({
          success: true,
          message: 'Une demande est déjà en cours de traitement.'
        });
      }
      throw e;
    }

    res.status(201).json({
      success: true,
      message:
        'Demande envoyée. Un administrateur pourra réactiver votre compte après vérification.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l’envoi de la demande',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password').populate('personalInfo');
    const data = user.toObject();
    data.hasPassword = !!data.password;
    delete data.password;

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};

// @desc    Complete registration questionnaire and get full access token
// @route   POST /api/auth/complete-questionnaire
// @access  Private (with temp token)
exports.completeQuestionnaire = async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user.id;

    // Verify this is being called with the temp token
    if (!req.user.temp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already completed
    if (user.questionnaireCompleted) {
      const token = generateToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'Questionnaire already completed',
        token,
        data: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    }

    // Get the registration questionnaire
    const questionnaire = await Questionnaire.findOne({
      isRegistrationQuestionnaire: true,
      isActive: true,
      isDeleted: false
    }).populate('questions');

    if (!questionnaire) {
      return res.status(404).json({
        success: false,
        message: 'Registration questionnaire not found'
      });
    }

    sortQuestionnaireQuestions(questionnaire);

    // Validate all required questions are answered
    const requiredQuestions = questionnaire.questions.filter(q => q.isRequired);
    const answeredQuestionIds = answers.map(a => a.question.toString());
    
    const missingRequired = requiredQuestions.filter(
      q => !answeredQuestionIds.includes(q._id.toString())
    );

    if (missingRequired.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Please answer all required questions',
        missingQuestions: missingRequired.map(q => ({
          id: q._id,
          text: q.text
        }))
      });
    }

    // Create or update response (handles retry if previous attempt partially failed)
    const Response = require('../models/Response');
    const PersonalInfo = require('../models/PersonalInfo');

    // Delete any existing response for this user+questionnaire (retry scenario)
    await Response.deleteMany({ user: userId, questionnaire: questionnaire._id });

    const response = await Response.create({
      user: userId,
      questionnaire: questionnaire._id,
      answers
    });

    // Extract PersonalInfo from answers
    const personalInfoData = extractPersonalInfoFromAnswers(questionnaire.questions, answers);
    
    // Create or update PersonalInfo (delete old one if exists from partial retry)
    if (user.personalInfo) {
      await PersonalInfo.findByIdAndDelete(user.personalInfo);
    }
    const personalInfo = await PersonalInfo.create(personalInfoData);

    // Update response with personalInfo reference
    response.personalInfo = personalInfo._id;
    await response.save();

    // Update user
    user.personalInfo = personalInfo._id;
    user.questionnaireCompleted = true;
    await user.save();

    /** Opt-in newsletter (question « Souhaitez-vous recevoir notre newsletter ? ») — même flux que la page d’accueil */
    const wantsNewsletter = !!(
      personalInfoData.preferences &&
      personalInfoData.preferences.newsletter === true
    );
    if (wantsNewsletter && user.email) {
      registerNewsletterSubscriber(user.email, 'registration').catch((err) =>
        console.warn('[newsletter] inscription depuis questionnaire:', err?.message || err)
      );
    }

    // Generate full access token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Questionnaire completed successfully. Welcome!',
      token,
      data: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        questionnaireCompleted: true,
        personalInfo
      }
    });
  } catch (error) {
    console.error('completeQuestionnaire error:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing questionnaire',
      error: error.message
    });
  }
};

// Helper function to extract PersonalInfo from questionnaire answers
const extractPersonalInfoFromAnswers = (questions, answers) => {
  const personalInfo = {};
  
  // Create a map of question IDs to their personalInfoField
  const questionMap = {};
  questions.forEach(q => {
    if (q.personalInfoField) {
      questionMap[q._id.toString()] = q.personalInfoField;
    }
  });
  
  // Map answers to PersonalInfo fields
  answers.forEach(answer => {
    const field = questionMap[answer.question.toString()];
    
    if (!field) return;
    
    // Handle nested fields (e.g., 'address.street')
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      personalInfo[parent] = personalInfo[parent] || {};
      
      if (parent === 'preferences') {
        personalInfo[parent][child] = answer.value === 'true' || answer.value === true;
      } else {
        personalInfo[parent][child] = answer.value;
      }
    } else {
      if (field === 'dateOfBirth') {
        personalInfo[field] = new Date(answer.value);
      } else {
        personalInfo[field] = answer.value;
      }
    }
  });
  
  return personalInfo;
};

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD  (Facebook-style: email → 6-digit code)
// ─────────────────────────────────────────────────────────────

// @desc    Send password reset code to email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Veuillez fournir une adresse email' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return 200 to avoid email enumeration.
    // Les comptes Google/Microsoft peuvent aussi récupérer un mot de passe : le code permet d'en définir un.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'Si un compte existe avec cet email, un code vous a été envoyé.'
      });
    }

    // Block if email not verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        requiresEmailVerification: true,
        message: 'Veuillez d\'abord vérifier votre adresse email.',
        email: user.email
      });
    }

    const code = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const result = await sendPasswordResetEmail(user, code);
    if (!result.success) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: "Erreur lors de l'envoi de l'email" });
    }

    res.status(200).json({
      success: true,
      message: 'Si un compte existe avec cet email, un code vous a été envoyé.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Verify reset code + set new password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, code et nouveau mot de passe requis' });
    }
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!pwdRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un symbole.'
      });
    }

    const hashedCode = crypto.createHash('sha256').update(code.trim()).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: hashedCode,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    // Le code e-mail prouve la possession de l'adresse : le compte passe en connexion e-mail/mot de passe.
    // googleId est conservé, donc la connexion Google reste possible.
    user.authProvider = 'local';
    user.isEmailVerified = true;
    user.isVerified = true;
    await user.save();

    res.status(200).json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD  (authenticated user, knows current password)
// ─────────────────────────────────────────────────────────────

// @desc    Change password (logged-in user)
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe actuel et le nouveau mot de passe sont requis.'
      });
    }

    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!pwdRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '8 car. min. avec majuscule, minuscule, chiffre et symbole.'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte n’a pas de mot de passe. Ajoutez-en un depuis la page Compte.'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Le mot de passe actuel est incorrect.'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Mot de passe modifié avec succès !' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Add a password to an OAuth-only account (keeps the same account and provider link)
// @route   POST /api/auth/set-password
// @access  Private
exports.setPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!newPassword || !pwdRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: '8 car. min. avec majuscule, minuscule, chiffre et symbole.'
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    if (user.password) {
      return res.status(400).json({
        success: false,
        message: 'Ce compte a déjà un mot de passe. Utilisez « Changer de mot de passe ».'
      });
    }

    user.password = newPassword;
    // Le compte passe en connexion e-mail/mot de passe ; l'e-mail Google est déjà vérifié.
    // googleId est conservé : la connexion Google reste possible sur le même compte.
    user.authProvider = 'local';
    user.isEmailVerified = true;
    user.isVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      authProvider: 'local',
      message: 'Mot de passe ajouté. Vous pouvez maintenant vous connecter avec votre e-mail et ce mot de passe.'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────
// EMAIL VERIFICATION  (sent after registration)
// ─────────────────────────────────────────────────────────────

// @desc    Send (or resend) email verification code
// @route   POST /api/auth/send-verification
// @access  Public (email in body) or Private
exports.sendVerificationEmail = async (req, res) => {
  try {
    const email = req.body.email || req.user?.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({ success: true, message: 'Si le compte existe, un code a été envoyé.' });
    }
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email déjà vérifié' });
    }

    const code = user.getEmailVerificationToken();
    await user.save({ validateBeforeSave: false });

    await sendEmailVerificationCode(user, code);

    res.status(200).json({ success: true, message: 'Code de vérification envoyé' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// @desc    Verify email with 6-digit code → then return questionnaire
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email et code requis' });
    }

    const hashedCode = crypto.createHash('sha256').update(code.trim()).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailVerificationToken: hashedCode,
      emailVerificationExpire: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
    }

    user.isEmailVerified = true;
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save({ validateBeforeSave: false });

    // After email verified → check if questionnaire needs to be completed
    const questionnaire = await Questionnaire.findOne({
      isRegistrationQuestionnaire: true,
      isActive: true,
      isDeleted: false
    }).populate('questions');

    if (questionnaire && !user.questionnaireCompleted) {
      sortQuestionnaireQuestions(questionnaire);
      const tempToken = generateTempToken(user._id);
      return res.status(200).json({
        success: true,
        message: 'Email vérifié ! Complétez votre profil.',
        requiresQuestionnaire: true,
        tempToken,
        questionnaire: {
          id: questionnaire._id,
          title: questionnaire.title,
          description: questionnaire.description,
          questions: questionnaire.questions
        },
        data: { id: user._id, username: user.username, email: user.email }
      });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: 'Email vérifié avec succès',
      token,
      data: { id: user._id, username: user.username, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, profilePicture: user.profilePicture || '' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
