const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Questionnaire = require('../models/Questionnaire');

// Protect routes - require full authentication
exports.protect = async (req, res, next) => {
  console.log('AUTH MIDDLEWARE START:', req.method, req.url);
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.temp) {
      return res.status(401).json({
        success: false,
        message: 'Please complete the registration questionnaire first'
      });
    }
    
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (!req.user.isActive) {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'User account is deactivated'
      });
    }

    if (!req.user.questionnaireCompleted) {
      const activeRegistrationQ = await Questionnaire.findOne({
        isRegistrationQuestionnaire: true,
        isActive: true,
        isDeleted: false
      }).select('_id').lean();

      if (activeRegistrationQ) {
        return res.status(403).json({
          success: false,
          message: 'Please complete the registration questionnaire to access this feature',
          requiresQuestionnaire: true
        });
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Protect routes with temp token - for questionnaire completion only
exports.protectTemp = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        code: 'ACCOUNT_DEACTIVATED',
        message: 'User account is deactivated'
      });
    }

    // Store temp flag in request
    req.user = user;
    req.user.temp = decoded.temp || false;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is any admin type
exports.isAdmin = (req, res, next) => {
  const adminRoles = ['superadmin', 'analyst', 'moderator'];
  if (!adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Check if user is superadmin
exports.isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin access required'
    });
  }
  next();
};

// Check if user is analyst (questionnaire admin)
exports.isAnalyst = (req, res, next) => {
  if (!['superadmin', 'analyst'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Analyst access required'
    });
  }
  next();
};

// Check if user is moderator (content supervisor)
exports.isModerator = (req, res, next) => {
  if (!['superadmin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Moderator access required'
    });
  }
  next();
};

/** Superadmin ou modérateur — gestion utilisateurs (sauf équipe admin côté contrôleur pour le modérateur) */
exports.isSuperAdminOrModerator = (req, res, next) => {
  if (!['superadmin', 'moderator'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé au super administrateur ou au modérateur.'
    });
  }
  next();
};
