/**
 * Input Sanitization Utilities
 * Provides secure input validation and sanitization functions
 */

/**
 * Escapes special regex characters to prevent NoSQL injection
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized input safe for regex
 */
function escapeRegexInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Escape special regex characters
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// This function is now implemented at the end with the new comprehensive version

/**
 * Validates MongoDB ObjectId format
 * @param {string} id - Potential ObjectId
 * @returns {boolean} - True if valid ObjectId format
 */
function isValidObjectId(id) {
  if (!id || typeof id !== 'string') {
    return false;
  }
  
  // MongoDB ObjectId is 24 character hex string
  const objectIdPattern = /^[0-9a-fA-F]{24}$/;
  return objectIdPattern.test(id);
}

/**
 * Sanitizes message type input
 * @param {string} messageType - Message type from user
 * @returns {Object} - { isValid: boolean, sanitized: string, error?: string }
 */
function sanitizeMessageType(messageType) {
  if (!messageType || typeof messageType !== 'string') {
    return { isValid: false, sanitized: '', error: 'Message type must be a string' };
  }
  
  const validTypes = ['user', 'ai', 'system'];
  const trimmed = messageType.trim().toLowerCase();
  
  if (!validTypes.includes(trimmed)) {
    return { isValid: false, sanitized: '', error: 'Invalid message type' };
  }
  
  return { isValid: true, sanitized: trimmed, error: null };
}

/**
 * Validates and sanitizes date input
 * @param {string} dateString - Date string from user
 * @returns {Object} - { isValid: boolean, sanitized: Date, error?: string }
 */
function sanitizeDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return { isValid: false, sanitized: null, error: 'Date must be a string' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { isValid: false, sanitized: null, error: 'Invalid date format' };
  }
  
  // Check for reasonable date range (not too far in past/future)
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  if (date < oneYearAgo || date > oneYearFromNow) {
    return { isValid: false, sanitized: null, error: 'Date must be within one year range' };
  }
  
  return { isValid: true, sanitized: date, error: null };
}

/**
 * General input sanitization for text fields
 * @param {string} input - Raw text input
 * @param {Object} options - Sanitization options
 * @returns {Object} - { isValid: boolean, sanitized: string, error?: string }
 */
function sanitizeTextInput(input, options = {}) {
  const {
    maxLength = 1000,
    minLength = 0,
    allowHtml = false,
    trimWhitespace = true
  } = options;
  
  if (!input || typeof input !== 'string') {
    return { isValid: false, sanitized: '', error: 'Input must be a string' };
  }
  
  let sanitized = trimWhitespace ? input.trim() : input;
  
  // Length validation
  if (sanitized.length < minLength) {
    return { isValid: false, sanitized: '', error: `Input too short (min ${minLength} characters)` };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, sanitized: '', error: `Input too long (max ${maxLength} characters)` };
  }
  
  // HTML/script injection prevention
  if (!allowHtml) {
    // Remove potential HTML/script tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    // Check for script injection attempts
    const scriptPatterns = [
      /javascript:/i,
      /on\w+\s*=/i,
      /<script/i,
      /eval\(/i,
      /function\s*\(/i
    ];
    
    for (const pattern of scriptPatterns) {
      if (pattern.test(sanitized)) {
        return { isValid: false, sanitized: '', error: 'Input contains invalid content' };
      }
    }
  }
  
  return { isValid: true, sanitized, error: null };
}

/**
 * Removes MongoDB operators from search queries to prevent NoSQL injection
 * @param {string} query - Raw search query
 * @returns {string} - Sanitized query string
 */
function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') {
    return { isValid: false, sanitized: '', error: 'Search query must be a string' };
  }
  
  // Basic length validation
  if (query.length > 500) {
    return { isValid: false, sanitized: '', error: 'Search query too long (max 500 characters)' };
  }
  
  // Convert to string and trim
  let sanitized = String(query).trim();
  
  if (sanitized.length === 0) {
    return { isValid: false, sanitized: '', error: 'Search query cannot be empty' };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, sanitized: '', error: 'Search query must be at least 2 characters' };
  }
  
  // Remove MongoDB operators and dangerous patterns
  const mongoOperators = [
    /\$ne/gi, /\$gt/gi, /\$lt/gi, /\$gte/gi, /\$lte/gi,
    /\$in/gi, /\$nin/gi, /\$exists/gi, /\$regex/gi, /\$where/gi,
    /\$or/gi, /\$and/gi, /\$not/gi, /\$nor/gi, /\$size/gi,
    /\$all/gi, /\$elemMatch/gi, /\$mod/gi, /\$type/gi
  ];
  
  mongoOperators.forEach(operator => {
    sanitized = sanitized.replace(operator, '');
  });
  
  // Remove JSON-like structures and dangerous characters
  sanitized = sanitized.replace(/[{}]/g, '');
  sanitized = sanitized.replace(/["'`]/g, '');
  
  const result = sanitized.trim();
  
  if (result.length === 0) {
    return { isValid: false, sanitized: '', error: 'Search query contains only invalid characters' };
  }
  
  return { isValid: true, sanitized: result, error: null };
}

/**
 * Sanitizes general user input with various options
 * @param {string} input - Raw user input
 * @param {string} type - Type of input (email, message, filename, etc.)
 * @returns {string} - Sanitized input
 */
function sanitizeUserInput(input, type = 'general') {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  let sanitized = input.trim();
  
  switch (type) {
    case 'email':
      return sanitized.toLowerCase();
    case 'filename':
      return sanitizeFilename(sanitized);
    case 'message':
      return sanitizeHtml(sanitized);
    default:
      return sanitizeHtml(sanitized);
  }
}

/**
 * Sanitizes filename to prevent path traversal and dangerous extensions
 * @param {string} filename - Raw filename
 * @returns {string} - Sanitized filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return '';
  }
  
  let sanitized = filename.trim();
  
  // Check for Windows reserved names first
  const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])\./i;
  if (reservedNames.test(sanitized)) {
    sanitized = 'safe_' + sanitized; // Prefix to make it safe
  }
  
  // Remove path traversal attempts completely - more comprehensive
  // Handle multiple variations of path traversal
  sanitized = sanitized.replace(/\.\.[\/\\]/g, '');
  sanitized = sanitized.replace(/\.\.+/g, '.'); // Replace multiple dots
  sanitized = sanitized.replace(/^[\/\\]+/, '');
  
  // Remove dangerous system paths like /etc/, /bin/, C:\Windows\, etc.
  sanitized = sanitized.replace(/(\/etc\/|\\etc\\|C:\\Windows\\|C:\\System32\\)/gi, '');
  
  // Remove remaining path separators from the beginning
  sanitized = sanitized.replace(/^[\/\\]+/, '');
  
  // Check for dangerous extensions and replace them
  const dangerousExts = /\.(exe|bat|scr|pif|com|cmd|vbs)$/i;
  if (dangerousExts.test(sanitized)) {
    sanitized = sanitized.replace(dangerousExts, '.txt'); // Change to safe extension
  }
  
  // Remove dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');
  
  // Limit length
  sanitized = sanitized.substring(0, 255);
  
  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 * @param {string} email - Raw email input
 * @returns {Object} - {isValid: boolean, sanitized: string}
 */
function validateAndSanitizeEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, sanitized: null };
  }
  
  const sanitized = email.trim().toLowerCase();
  
  // Basic email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized: null };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Sanitizes HTML content by removing dangerous tags and attributes
 * @param {string} html - Raw HTML input
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized HTML
 */
function sanitizeHtml(html, options = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  let sanitized = html;
  
  // Remove dangerous tags
  const dangerousTags = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^>]*>/gi,
    /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
    /<meta\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
  ];
  
  dangerousTags.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove dangerous attributes
  sanitized = sanitized.replace(/\son\w+\s*=/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  if (options.allowBasicFormatting) {
    // Keep only safe tags - use a different approach
    sanitized = sanitized.replace(/<(?!\/?(?:b|i|strong|em|u|a)\b)[^>]*>/gi, '');
  } else {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  return sanitized;
}

/**
 * Sanitizes MongoDB query objects to prevent NoSQL injection
 * @param {Object} query - MongoDB query object
 * @param {Set} visited - Set to track circular references
 * @returns {Object} - Sanitized query object
 */
function sanitizeMongoQuery(query, visited = new Set()) {
  if (!query || typeof query !== 'object') {
    return {};
  }
  
  // Handle circular references
  if (visited.has(query)) {
    return {};
  }
  visited.add(query);
  
  const sanitized = {};
  
  for (const [key, value] of Object.entries(query)) {
    // Skip MongoDB operators
    if (key.startsWith('$')) {
      continue;
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively sanitize nested objects, but remove operators
      const nestedSanitized = {};
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (!nestedKey.startsWith('$')) {
          if (typeof nestedValue === 'object' && nestedValue !== null) {
            // Handle deeper nesting with circular reference protection
            const deepSanitized = sanitizeMongoQuery(nestedValue, visited);
            if (Object.keys(deepSanitized).length > 0) {
              nestedSanitized[nestedKey] = deepSanitized;
            }
          } else {
            nestedSanitized[nestedKey] = nestedValue;
          }
        }
      }
      // Always preserve the key structure, even if nested object becomes empty
      sanitized[key] = nestedSanitized;
    } else {
      sanitized[key] = value;
    }
  }
  
  visited.delete(query); // Clean up for potential reuse
  return sanitized;
}

/**
 * Sanitizes thread data for safe storage and processing
 * @param {Object} threadData - Raw thread data from client
 * @returns {Object} - Sanitized thread data
 */
function sanitizeThreadData(threadData) {
  if (!threadData || typeof threadData !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  // Sanitize title
  if (threadData.title) {
    sanitized.title = sanitizeHtml(threadData.title);
  }
  
  // Sanitize description
  if (threadData.description) {
    sanitized.description = sanitizeHtml(threadData.description);
  }
  
  // Sanitize boolean fields
  if (typeof threadData.isPublic === 'boolean') {
    sanitized.isPublic = threadData.isPublic;
  } else if (typeof threadData.isPublic === 'string') {
    sanitized.isPublic = threadData.isPublic.toLowerCase() === 'true';
  }
  
  // Sanitize tags array
  if (Array.isArray(threadData.tags)) {
    sanitized.tags = threadData.tags
      .map(tag => sanitizeHtml(tag))
      .filter(tag => tag && tag.length > 0)
      .slice(0, 10); // Limit to 10 tags
  }
  
  return sanitized;
}

/**
 * Sanitizes message data for safe storage and processing
 * @param {Object} messageData - Raw message data from client
 * @returns {Object} - Sanitized message data
 */
function sanitizeMessageData(messageData) {
  if (!messageData || typeof messageData !== 'object') {
    throw new Error('Invalid message data');
  }
  
  const sanitized = {};
  
  // Sanitize content
  if (messageData.content) {
    sanitized.content = sanitizeHtml(messageData.content);
  }
  
  // Validate and sanitize threadId
  if (messageData.threadId) {
    if (!isValidObjectId(messageData.threadId)) {
      throw new Error('Invalid thread ID format');
    }
    sanitized.threadId = messageData.threadId;
  }
  
  // Sanitize sender email
  if (messageData.sender) {
    const emailResult = validateAndSanitizeEmail(messageData.sender);
    if (!emailResult.isValid) {
      throw new Error('Invalid sender email');
    }
    sanitized.sender = emailResult.sanitized;
  }
  
  // Sanitize metadata
  if (messageData.metadata && typeof messageData.metadata === 'object') {
    sanitized.metadata = sanitizeMongoQuery(messageData.metadata);
  }
  
  return sanitized;
}

module.exports = {
  escapeRegexInput,
  sanitizeSearchQuery,
  sanitizeUserInput,
  sanitizeFilename,
  validateAndSanitizeEmail,
  sanitizeHtml,
  sanitizeMongoQuery,
  isValidObjectId,
  sanitizeThreadData,
  sanitizeMessageData,
  sanitizeMessageType,
  sanitizeDate,
  sanitizeTextInput
};