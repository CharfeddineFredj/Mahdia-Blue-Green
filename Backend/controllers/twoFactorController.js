const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const crypto = require('crypto');

// Enable 2FA for a user
exports.enable2FA = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA est déjà activé' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${process.env.TWO_FA_ISSUER || 'Mahdia Blue & Green'} (${user.email})`,
      issuer: process.env.TWO_FA_ISSUER || 'Mahdia Blue & Green'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scannez le code QR avec votre application d\'authentification'
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'activation de 2FA' });
  }
};

// Verify 2FA setup
exports.verifySetup = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id || req.user.id;

    if (!token) {
      return res.status(400).json({ message: 'Code de vérification requis' });
    }

    const user = await User.findById(userId).select('+twoFactorSecret');

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ message: 'Aucune configuration 2FA en attente' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: parseInt(process.env.TWO_FA_WINDOW || '2')
    });

    if (!verified) {
      return res.status(400).json({ message: 'Code de vérification invalide' });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(5);

    // Enable 2FA
    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );
    await user.save();

    res.json({
      success: true,
      message: '2FA activé avec succès',
      backupCodes: backupCodes
    });
  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification de 2FA' });
  }
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const { password, token } = req.body;
    const userId = req.user._id || req.user.id;

    if (!password || !token) {
      return res.status(400).json({ message: 'Mot de passe et code requis' });
    }

    const user = await User.findById(userId).select('+password +twoFactorSecret');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA n\'est pas activé' });
    }

    // For OAuth users without password
    if (!user.password) {
      return res.status(400).json({
        message: 'Compte OAuth - utilisez votre fournisseur pour gérer la sécurité'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Verify 2FA token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: parseInt(process.env.TWO_FA_WINDOW || '2')
    });

    if (!verified) {
      return res.status(400).json({ message: 'Code de vérification invalide' });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.twoFactorBackupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: '2FA désactivé avec succès'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ message: 'Erreur lors de la désactivation de 2FA' });
  }
};

// Verify 2FA token during login
exports.verify2FA = async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ message: 'Email et code requis' });
    }

    const user = await User.findOne({ email }).select('+twoFactorSecret');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Ce compte est désactivé.'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA n\'est pas activé pour cet utilisateur' });
    }

    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: parseInt(process.env.TWO_FA_WINDOW || '2')
    });

    if (!verified) {
      return res.status(400).json({ message: 'Code de vérification invalide' });
    }

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Authentification réussie',
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture || '',
      }
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification de 2FA' });
  }
};

// Generate new backup codes
exports.generateBackupCodes = async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user._id || req.user.id;

    if (!password) {
      return res.status(400).json({ message: 'Mot de passe requis' });
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA n\'est pas activé' });
    }

    // For OAuth users without password
    if (!user.password) {
      return res.status(400).json({
        message: 'Compte OAuth - utilisez votre fournisseur pour gérer la sécurité'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(5);
    user.twoFactorBackupCodes = backupCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );
    await user.save();

    res.json({
      success: true,
      message: 'Nouveaux codes de secours générés',
      backupCodes: backupCodes
    });
  } catch (error) {
    console.error('Generate backup codes error:', error);
    res.status(500).json({ message: 'Erreur lors de la génération des codes de secours' });
  }
};

// Use backup code
exports.useBackupCode = async (req, res) => {
  try {
    const { email, backupCode } = req.body;

    if (!email || !backupCode) {
      return res.status(400).json({ message: 'Email et code de secours requis' });
    }

    const user = await User.findOne({ email }).select('+twoFactorBackupCodes');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Ce compte est désactivé.'
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA n\'est pas activé pour cet utilisateur' });
    }

    // Hash the provided backup code
    const hashedCode = crypto.createHash('sha256').update(backupCode).digest('hex');

    // Check if backup code exists
    const codeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);
    if (codeIndex === -1) {
      return res.status(400).json({ message: 'Code de secours invalide' });
    }

    // Remove used backup code
    user.twoFactorBackupCodes.splice(codeIndex, 1);
    await user.save();

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const jwtToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Authentification réussie avec code de secours',
      token: jwtToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture || '',
      },
      remainingBackupCodes: user.twoFactorBackupCodes.length
    });
  } catch (error) {
    console.error('Use backup code error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'utilisation du code de secours' });
  }
};

// Helper function to generate random backup codes
function generateBackupCodes(count) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}
