const Level = require('../models/Level');

// @desc    Get all levels
// @route   GET /api/levels
// @access  Public
exports.getLevels = async (req, res) => {
  try {
    const levels = await Level.find().sort({ level: 1 });

    res.status(200).json({
      success: true,
      count: levels.length,
      data: levels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching levels',
      error: error.message
    });
  }
};

