const { body, param, query, validationResult } = require('express-validator');
const { 
  sanitizeHtml, 
  sanitizeSearchQuery, 
  validateAndSanitizeEmail,
  isValidObjectId,
  sanitizeThreadData,
  sanitizeMessageData
} = require('../utils/inputSanitizer');

/**
 * Enhanced validation error handler with security focus
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Enhanced thread validation with security sanitization
 */
const validateCreateThread = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters')
    .custom((title) => {
      const sanitized = sanitizeHtml(title);
      if (sanitized !== title && sanitized.length < title.length * 0.8) {
        throw new Error('Thread title contains invalid content');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description must be 2000 characters or less')
    .custom((description) => {
      if (description) {
        const sanitized = sanitizeHtml(description);
        if (sanitized !== description && sanitized.length < description.length * 0.8) {
          throw new Error('Description contains invalid content');
        }
      }
      return true;
    }),
  body('category')
    .optional()
    .custom((value) => {
      // Allow empty string, null, undefined, or valid ObjectId
      if (!value || value === '') {
        return true;
      }
      if (!isValidObjectId(value)) {
        throw new Error('Category must be a valid ID');
      }
      return true;
    }),
  body('subject')
    .optional()
    .isIn(['Mathematics', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'General'])
    .withMessage('Subject must be one of the predefined academic subjects'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items')
    .custom((tags) => {
      if (tags) {
        const invalidTags = tags.filter(tag => 
          typeof tag !== 'string' || 
          tag.length > 50 || 
          sanitizeHtml(tag) !== tag
        );
        if (invalidTags.length > 0) {
          throw new Error('Tags must be strings with maximum 50 characters and no HTML');
        }
      }
      return true;
    }),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be boolean'),
  
  // Sanitize the request body after validation
  (req, res, next) => {
    if (req.body) {
      req.body = sanitizeThreadData(req.body);
    }
    next();
  },
  
  handleValidationErrors
];

/**
 * Enhanced message validation with security checks
 */
const validateCreateMessage = [
  param('threadId')
    .custom((threadId) => {
      if (!isValidObjectId(threadId)) {
        throw new Error('Invalid thread ID format');
      }
      return true;
    }),
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters')
    .custom((content) => {
      const sanitized = sanitizeHtml(content);
      if (sanitized.length === 0) {
        throw new Error('Message content cannot be empty after sanitization');
      }
      return true;
    }),
  body('type')
    .optional()
    .isIn(['user', 'ai', 'system'])
    .withMessage('Message type must be user, ai, or system'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be a valid object'),
  
  // Sanitize the request body after validation
  (req, res, next) => {
    try {
      if (req.body) {
        req.body = sanitizeMessageData(req.body);
      }
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Message data validation failed',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  },
  
  handleValidationErrors
];

/**
 * Enhanced user validation with secure email validation
 */
const validateUserSync = [
  body('uid')
    .trim()
    .isLength({ min: 1, max: 128 })
    .withMessage('Invalid user ID'),
  body('email')
    .isEmail()
    .normalizeEmail() 
    .withMessage('Valid email address is required')
    .custom(async (email) => {
      const result = validateAndSanitizeEmail(email);
      if (!result.isValid) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Authentication validation with password strength
 */
const validateAuth = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .custom(async (email) => {
      const result = validateAndSanitizeEmail(email);
      if (!result.isValid) {
        throw new Error('Invalid email format');
      }
      return true;
    }),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  handleValidationErrors
];

// Profile validation rules
const validateProfileUpdate = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Display name must be between 1 and 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must be 500 characters or less'),
  body('university')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('University must be 100 characters or less'),
  body('major')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Major must be 100 characters or less'),
  body('year')
    .optional()
    .isIn(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'PhD', 'Other'])
    .withMessage('Invalid year selection'),
  body('interests')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Interests must be an array with maximum 10 items'),
  body('interests.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each interest must be between 1 and 50 characters'),
  body('avatar')
    .optional()
    .trim()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  handleValidationErrors
];

// Preferences validation rules
const validatePreferencesUpdate = [
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notification preference must be boolean'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notification preference must be boolean'),
  body('notifications.mentions')
    .optional()
    .isBoolean()
    .withMessage('Mentions notification preference must be boolean'),
  body('notifications.threadActivity')
    .optional()
    .isBoolean()
    .withMessage('Thread activity notification preference must be boolean'),
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),
  body('ai.enabled')
    .optional()
    .isBoolean()
    .withMessage('AI enabled preference must be boolean'),
  body('ai.responseStyle')
    .optional()
    .isIn(['concise', 'detailed', 'adaptive'])
    .withMessage('AI response style must be concise, detailed, or adaptive'),
  body('ai.autoRespond')
    .optional()
    .isBoolean()
    .withMessage('AI auto-respond preference must be boolean'),
  handleValidationErrors
];

/**
 * Enhanced ObjectId validation using our security utility
 */
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => {
      if (!isValidObjectId(value)) {
        throw new Error(`Invalid ${paramName} format`);
      }
      return true;
    }),
  handleValidationErrors
];

/**
 * Search query validation with sanitization
 */
const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search query must be between 1 and 200 characters')
    .custom((query) => {
      const sanitized = sanitizeSearchQuery(query);
      if (!sanitized || sanitized.length === 0) {
        throw new Error('Search query contains invalid content');
      }
      return true;
    }),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'relevance'])
    .withMessage('Sort field must be one of: createdAt, updatedAt, title, relevance'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  
  // Sanitize search query
  (req, res, next) => {
    if (req.query.q) {
      req.query.q = sanitizeSearchQuery(req.query.q);
    }
    next();
  },
  
  handleValidationErrors
];

/**
 * AI request validation
 */
const validateAIRequest = [
  body('message')
    .isLength({ min: 1, max: 1000 })
    .withMessage('AI request message must be between 1 and 1000 characters')
    .custom((message) => {
      const sanitized = sanitizeHtml(message);
      if (sanitized.length === 0) {
        throw new Error('AI request message cannot be empty after sanitization');
      }
      return true;
    }),
  
  body('context')
    .optional()
    .isObject()
    .withMessage('Context must be a valid object')
    .custom((context) => {
      if (context && typeof context === 'object') {
        // Validate context structure
        const allowedKeys = ['threadId', 'previousMessages', 'subject', 'difficulty'];
        const invalidKeys = Object.keys(context).filter(key => !allowedKeys.includes(key));
        if (invalidKeys.length > 0) {
          throw new Error(`Invalid context keys: ${invalidKeys.join(', ')}`);
        }
      }
      return true;
    }),
  
  body('threadId')
    .optional()
    .custom((threadId) => {
      if (threadId && !isValidObjectId(threadId)) {
        throw new Error('Invalid thread ID format');
      }
      return true;
    }),
  
  handleValidationErrors
];

/**
 * Rate limiting validation middleware
 */
const validateRateLimit = (limit = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier).filter(time => time > windowStart);
      requests.set(identifier, userRequests);
    }
    
    const userRequests = requests.get(identifier) || [];
    
    if (userRequests.length >= limit) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
    
    userRequests.push(now);
    requests.set(identifier, userRequests);
    
    next();
  };
};

module.exports = {
  // Enhanced validation functions
  handleValidationErrors,
  validateAuth,
  validateCreateThread,
  validateCreateMessage,
  validateUserSync,
  validateProfileUpdate,
  validatePreferencesUpdate,
  validateObjectId,
  validateSearch,
  validateAIRequest,
  validateRateLimit,
  
  // Legacy exports for backward compatibility
  validateThread: validateCreateThread,
  validateMessage: validateCreateMessage
};