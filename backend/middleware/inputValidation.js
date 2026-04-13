const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

/**
 * Middleware to handle validation results
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
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

/**
 * Custom validators
 */
const customValidators = {
  // Validate MongoDB ObjectId
  isObjectId: (value) => {
    return /^[0-9a-fA-F]{24}$/.test(value);
  },

  // Validate that string doesn't contain potentially harmful content
  isSafeText: (value) => {
    if (typeof value !== 'string') return false;
    
    // Check for basic XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /<link/gi,
      /<meta/gi
    ];

    return !xssPatterns.some(pattern => pattern.test(value));
  },

  // Validate thread title
  isValidThreadTitle: (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length >= 3 && trimmed.length <= 200;
  },

  // Validate message content
  isValidMessageContent: (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed.length >= 1 && trimmed.length <= 10000;
  },

  // Validate email format
  isValidEmail: (value) => {
    return validator.isEmail(value);
  },

  // Validate URL format
  isValidURL: (value) => {
    return validator.isURL(value, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  },

  // Validate tags array
  isValidTagsArray: (value) => {
    if (!Array.isArray(value)) return false;
    if (value.length > 10) return false;
    
    return value.every(tag => 
      typeof tag === 'string' && 
      tag.trim().length > 0 && 
      tag.trim().length <= 30
    );
  }
};

/**
 * Sanitization functions
 */
const sanitizers = {
  // Sanitize HTML content
  sanitizeHTML: (content) => {
    if (typeof content !== 'string') return content;
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre', 'br', 'p'],
      ALLOWED_ATTR: []
    });
  },

  // Sanitize plain text
  sanitizeText: (text) => {
    if (typeof text !== 'string') return text;
    return text
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  },

  // Sanitize array of strings
  sanitizeStringArray: (arr) => {
    if (!Array.isArray(arr)) return arr;
    return arr
      .filter(item => typeof item === 'string')
      .map(item => sanitizers.sanitizeText(item))
      .filter(item => item.length > 0);
  }
};

/**
 * Validation rules for different endpoints
 */
const validationRules = {
  // Thread creation validation
  createThread: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 200 })
      .withMessage('Title must be between 3 and 200 characters')
      .custom(customValidators.isSafeText)
      .withMessage('Title contains invalid characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description cannot exceed 1000 characters')
      .custom(customValidators.isSafeText)
      .withMessage('Description contains invalid characters'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    
    body('category')
      .optional()
      .custom(value => !value || customValidators.isObjectId(value))
      .withMessage('Invalid category ID'),
    
    body('tags')
      .optional()
      .custom(customValidators.isValidTagsArray)
      .withMessage('Tags must be an array of strings (max 10 items, 30 chars each)'),
    
    handleValidationErrors
  ],

  // Message creation validation
  createMessage: [
    param('threadId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid thread ID'),
    
    body('content')
      .trim()
      .isLength({ min: 1, max: 10000 })
      .withMessage('Message content must be between 1 and 10000 characters')
      .custom(customValidators.isSafeText)
      .withMessage('Message contains invalid characters'),
    
    handleValidationErrors
  ],

  // Thread ID validation (for params)
  validateThreadId: [
    param('threadId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid thread ID'),
    
    handleValidationErrors
  ],

  // Message ID validation (for params)
  validateMessageId: [
    param('messageId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid message ID'),
    
    handleValidationErrors
  ],

  // Search query validation
  validateSearch: [
    query('query')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Page must be a positive integer (max 1000)'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    
    handleValidationErrors
  ],

  // File upload validation
  validateFileUpload: [
    param('threadId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid thread ID'),
    
    body('content')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('File description cannot exceed 1000 characters'),
    
    handleValidationErrors
  ],

  // Reaction validation
  addReaction: [
    param('messageId')
      .custom(customValidators.isObjectId)
      .withMessage('Invalid message ID'),
    
    body('emoji')
      .trim()
      .isLength({ min: 1, max: 10 })
      .withMessage('Emoji must be between 1 and 10 characters')
      .matches(/^[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]$/u)
      .withMessage('Invalid emoji format'),
    
    handleValidationErrors
  ],

  // User profile validation
  updateProfile: [
    body('displayName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Display name must be between 1 and 50 characters')
      .custom(customValidators.isSafeText)
      .withMessage('Display name contains invalid characters'),
    
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters')
      .custom(customValidators.isSafeText)
      .withMessage('Bio contains invalid characters'),
    
    body('interests')
      .optional()
      .custom(customValidators.isValidTagsArray)
      .withMessage('Interests must be an array of strings (max 10 items, 30 chars each)'),
    
    handleValidationErrors
  ]
};

/**
 * Middleware to sanitize request body
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      for (const [key, value] of Object.entries(req.body)) {
        if (typeof value === 'string') {
          req.body[key] = sanitizers.sanitizeText(value);
        } else if (Array.isArray(value)) {
          req.body[key] = sanitizers.sanitizeStringArray(value);
        }
      }
    }

    // Sanitize query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string') {
          req.query[key] = sanitizers.sanitizeText(value);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error in input sanitization:', error);
    res.status(500).json({
      success: false,
      message: 'Input processing failed',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  validationRules,
  customValidators,
  sanitizers,
  sanitizeInput,
  handleValidationErrors
};