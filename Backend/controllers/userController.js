const User = require('../models/User');
const PersonalInfo = require('../models/PersonalInfo');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role } = req.query;
    
    const query = {};
    if (role) query.role = role;

    const users = await User.find(query)
      .select('-password')
      .populate('personalInfo')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('personalInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    // Le nom d'utilisateur et l'e-mail servent d'identifiants de connexion :
    // un utilisateur ne peut pas les modifier lui-même (comme dans « Informations personnelles »)
    if (!['superadmin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Le nom d’utilisateur et l’adresse e-mail ne peuvent pas être modifiés.'
      });
    }

    const { username, email } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
};

// @desc    Update user profile (personal info)
// @route   PUT /api/users/profile/update
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      bio,
      city,
      profilePicture,
      personalInfoData
    } = req.body;

    // Email changes are intentionally blocked from this endpoint.
    const safeUserUpdates = {};
    if (typeof firstName === 'string') safeUserUpdates.firstName = firstName.trim();
    if (typeof lastName === 'string') safeUserUpdates.lastName = lastName.trim();
    if (typeof profilePicture === 'string') safeUserUpdates.profilePicture = profilePicture;

    if (Object.keys(safeUserUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user.id, safeUserUpdates, { new: true, runValidators: true });
    }

    const normalizedPersonalInfo =
      personalInfoData && typeof personalInfoData === 'object'
        ? personalInfoData
        : {
            ...(typeof firstName === 'string' ? { firstName: firstName.trim() } : {}),
            ...(typeof lastName === 'string' ? { lastName: lastName.trim() } : {}),
            ...(typeof bio === 'string' ? { bio } : {}),
            ...(typeof city === 'string' ? { address: { city } } : {})
          };

    let personalInfo;

    if (req.user.personalInfo) {
      // Update existing personal info
      personalInfo = await PersonalInfo.findByIdAndUpdate(
        req.user.personalInfo,
        normalizedPersonalInfo,
        { new: true, runValidators: true }
      );
    } else {
      // Create new personal info
      personalInfo = await PersonalInfo.create(normalizedPersonalInfo);
      
      // Link to user
      await User.findByIdAndUpdate(req.user.id, {
        personalInfo: personalInfo._id
      });
    }

    const user = await User.findById(req.user.id).select('-password').populate('personalInfo');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

// @desc    Delete current user's profile (self deactivation)
// @route   DELETE /api/users/profile
// @access  Private
exports.deleteProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent superadmin from deleting/deactivating their own account
    if (user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Superadmin account cannot be deactivated'
      });
    }

    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting profile',
      error: error.message
    });
  }
};
