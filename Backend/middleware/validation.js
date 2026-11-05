const { body, param, query, validationResult } = require('express-validator');

// Middleware to check validation results
const validate = (req, res, next) => {
  console.log('VALIDATE MIDDLEWARE - req.query:', req.query);
  console.log('VALIDATE MIDDLEWARE - req.query descriptor:', Object.getOwnPropertyDescriptor(req, 'query'));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validation rules
const registerRules = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain a number'),
  body('username')
    .trim()
    .isLength({ min: 3 }).withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
];

const loginRules = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// Post/Article validation rules
const postRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  body('body')
    .trim()
    .notEmpty().withMessage('Body content is required')
];

// Event validation rules
const eventRules = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required'),
  body('startDate')
    .notEmpty().withMessage('Start date is required')
    .isISO8601().withMessage('Invalid date format'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Location cannot exceed 500 characters')
];

// Contact form validation rules
const contactRules = [
  body('email')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
  body('message')
    .trim()
    .notEmpty().withMessage('Message is required')
    .isLength({ min: 10 }).withMessage('Message must be at least 10 characters')
    .isLength({ max: 5000 }).withMessage('Message cannot exceed 5000 characters'),
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Subject cannot exceed 200 characters')
];

// Questionnaire response validation
const questionnaireResponseRules = [
  body('answers')
    .isArray({ min: 1 }).withMessage('At least one answer is required'),
  body('answers.*.questionId')
    .notEmpty().withMessage('Question ID is required'),
  body('answers.*.answer')
    .notEmpty().withMessage('Answer is required')
];

// MongoDB ObjectId validation
const validateObjectId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format')
];

// Pagination validation
const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  postRules,
  eventRules,
  contactRules,
  questionnaireResponseRules,
  validateObjectId,
  paginationRules
};
