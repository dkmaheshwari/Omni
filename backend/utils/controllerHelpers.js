/**
 * 🎯 Controller Helper Functions
 * Standardized response handling, error management, and utilities for PeerGenius controllers
 */

const mongoose = require('mongoose');
const { sanitizeHtml, isValidObjectId } = require('./inputSanitizer');

/**
 * Standard API response structure
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - Success indicator
 * @param {string} message - Response message
 * @param {any} data - Response data
 * @param {Object} meta - Additional metadata
 */
const sendResponse = (res, statusCode, success, message, data = null, meta = {}) => {
  const response = {
    success,
    message: sanitizeHtml(message),
    timestamp: new Date().toISOString(),
    ...meta
  };

  if (data !== null) {
    response.data = data;
  }

  // Add pagination info if present
  if (meta.pagination) {
    response.pagination = meta.pagination;
  }

  // Add performance metrics in development
  if (process.env.NODE_ENV === 'development' && meta.executionTime) {
    response.executionTime = `${meta.executionTime}ms`;
  }

  return res.status(statusCode).json(response);
};

/**
 * Success response helpers
 */
const responses = {
  /**
   * 200 OK - Success with data
   */
  success: (res, message, data = null, meta = {}) => {
    return sendResponse(res, 200, true, message, data, meta);
  },

  /**
   * 201 Created - Resource created successfully
   */
  created: (res, message, data = null, meta = {}) => {
    return sendResponse(res, 201, true, message, data, meta);
  },

  /**
   * 204 No Content - Success without content
   */
  noContent: (res) => {
    return res.status(204).send();
  },

  /**
   * 400 Bad Request - Client error
   */
  badRequest: (res, message, errors = null) => {
    const meta = errors ? { errors } : {};
    return sendResponse(res, 400, false, message, null, meta);
  },

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (res, message = 'Authentication required') => {
    return sendResponse(res, 401, false, message);
  },

  /**
   * 403 Forbidden - Access denied
   */
  forbidden: (res, message = 'Access denied') => {
    return sendResponse(res, 403, false, message);
  },

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (res, message = 'Resource not found') => {
    return sendResponse(res, 404, false, message);
  },

  /**
   * 409 Conflict - Resource conflict
   */
  conflict: (res, message = 'Resource conflict') => {
    return sendResponse(res, 409, false, message);
  },

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  rateLimited: (res, message = 'Rate limit exceeded', retryAfter = null) => {
    const meta = retryAfter ? { retryAfter } : {};
    return sendResponse(res, 429, false, message, null, meta);
  },

  /**
   * 500 Internal Server Error - Server error
   */
  serverError: (res, message = 'Internal server error', error = null) => {
    const meta = {};
    
    // Include error details in development
    if (process.env.NODE_ENV === 'development' && error) {
      meta.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    return sendResponse(res, 500, false, message, null, meta);
  }
};

/**
 * Async error handler wrapper
 * Wraps async controller functions to handle errors automatically
 * @param {Function} asyncFn - Async function to wrap
 */
const asyncHandler = (asyncFn) => {
  return (req, res, next) => {
    Promise.resolve(asyncFn(req, res, next)).catch(next);
  };
};

/**
 * Database error handler
 * Converts MongoDB errors to user-friendly messages
 * @param {Error} error - Database error
 * @param {Object} res - Express response object
 */
const handleDatabaseError = (error, res) => {
  console.error('Database Error:', error);
  
  // MongoDB validation error
  if (error.name === 'ValidationError') {
    const validationErrors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    return responses.badRequest(res, 'Validation failed', validationErrors);
  }
  
  // MongoDB cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return responses.badRequest(res, `Invalid ${error.path}: ${error.value}`);
  }
  
  // MongoDB duplicate key error
  if (error.code === 11000) {
    const duplicateField = Object.keys(error.keyValue)[0];
    return responses.conflict(res, `${duplicateField} already exists`);
  }
  
  // MongoDB connection error
  if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
    return responses.serverError(res, 'Database connection error');
  }
  
  // Generic database error
  return responses.serverError(res, 'Database operation failed', error);
};

/**
 * Validation helpers
 */
const validation = {
  /**
   * Validate ObjectId parameter
   * @param {string} id - ID to validate
   * @param {string} fieldName - Field name for error message
   */
  validateObjectId: (id, fieldName = 'ID') => {
    if (!id || !isValidObjectId(id)) {
      throw new Error(`Invalid ${fieldName} format`);
    }
    return true;
  },

  /**
   * Validate required fields
   * @param {Object} data - Data object to validate
   * @param {Array} requiredFields - Array of required field names
   */
  validateRequiredFields: (data, requiredFields) => {
    const missingFields = requiredFields.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    return true;
  },

  /**
   * Validate pagination parameters
   * @param {Object} query - Query parameters
   */
  validatePagination: (query) => {
    const limit = parseInt(query.limit) || 20;
    const offset = parseInt(query.offset) || 0;
    
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }
    
    return { limit, offset };
  }
};

/**
 * Pagination helper
 * @param {Array} data - Data array
 * @param {number} total - Total count
 * @param {number} limit - Items per page
 * @param {number} offset - Current offset
 * @param {string} baseUrl - Base URL for pagination links
 */
const createPaginationMeta = (data, total, limit, offset, baseUrl = '') => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;
  
  return {
    pagination: {
      currentPage,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      prevPage: hasPrevPage ? currentPage - 1 : null,
      startIndex: offset + 1,
      endIndex: Math.min(offset + limit, total)
    }
  };
};

/**
 * Search and filter helpers
 */
const search = {
  /**
   * Build MongoDB search query
   * @param {string} searchTerm - Search term
   * @param {Array} searchFields - Fields to search in
   */
  buildSearchQuery: (searchTerm, searchFields = ['title', 'content', 'description']) => {
    if (!searchTerm) return {};
    
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    return {
      $or: searchFields.map(field => ({
        [field]: { $regex: searchRegex }
      }))
    };
  },

  /**
   * Build sort query
   * @param {string} sortField - Field to sort by
   * @param {string} sortOrder - Sort order (asc/desc)
   */
  buildSortQuery: (sortField = 'createdAt', sortOrder = 'desc') => {
    const allowedFields = ['createdAt', 'updatedAt', 'title', 'name', 'relevance'];
    const field = allowedFields.includes(sortField) ? sortField : 'createdAt';
    const order = sortOrder.toLowerCase() === 'asc' ? 1 : -1;
    
    return { [field]: order };
  },

  /**
   * Build filter query from request parameters
   * @param {Object} query - Request query parameters
   * @param {Array} allowedFilters - Allowed filter fields
   */
  buildFilterQuery: (query, allowedFilters = []) => {
    const filters = {};
    
    allowedFilters.forEach(filter => {
      if (query[filter] !== undefined) {
        // Handle boolean filters
        if (query[filter] === 'true' || query[filter] === 'false') {
          filters[filter] = query[filter] === 'true';
        }
        // Handle array filters
        else if (Array.isArray(query[filter])) {
          filters[filter] = { $in: query[filter] };
        }
        // Handle string filters
        else {
          filters[filter] = query[filter];
        }
      }
    });
    
    return filters;
  }
};

/**
 * Data transformation helpers
 */
const transform = {
  /**
   * Remove sensitive fields from user object
   * @param {Object} user - User object
   */
  sanitizeUser: (user) => {
    if (!user) return null;
    
    const sanitized = { ...user };
    delete sanitized.password;
    delete sanitized.refreshToken;
    delete sanitized.__v;
    
    return sanitized;
  },

  /**
   * Transform MongoDB document to plain object
   * @param {Object} doc - MongoDB document
   */
  toPlainObject: (doc) => {
    if (!doc) return null;
    return doc.toObject ? doc.toObject() : doc;
  },

  /**
   * Transform array of documents
   * @param {Array} docs - Array of MongoDB documents
   * @param {Function} transformer - Transformation function
   */
  transformArray: (docs, transformer = transform.toPlainObject) => {
    if (!Array.isArray(docs)) return [];
    return docs.map(transformer);
  }
};

/**
 * Performance monitoring helper
 * @param {Function} operation - Operation to monitor
 * @param {string} operationName - Name of the operation
 */
const withPerformanceMonitoring = async (operation, operationName = 'operation') => {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const executionTime = Date.now() - startTime;
    
    // Log slow operations (> 1 second)
    if (executionTime > 1000) {
      console.warn(`Slow ${operationName}: ${executionTime}ms`);
    }
    
    return { result, executionTime };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`Failed ${operationName} after ${executionTime}ms:`, error);
    throw error;
  }
};

/**
 * Cache helpers for frequently accessed data
 */
const cache = {
  // Simple in-memory cache (replace with Redis in production)
  _cache: new Map(),
  _ttl: new Map(),

  /**
   * Get value from cache
   * @param {string} key - Cache key
   */
  get: (key) => {
    const ttl = cache._ttl.get(key);
    if (ttl && Date.now() > ttl) {
      cache._cache.delete(key);
      cache._ttl.delete(key);
      return null;
    }
    return cache._cache.get(key) || null;
  },

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set: (key, value, ttlMs = 5 * 60 * 1000) => {
    cache._cache.set(key, value);
    cache._ttl.set(key, Date.now() + ttlMs);
  },

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete: (key) => {
    cache._cache.delete(key);
    cache._ttl.delete(key);
  },

  /**
   * Clear all cache
   */
  clear: () => {
    cache._cache.clear();
    cache._ttl.clear();
  }
};

module.exports = {
  sendResponse,
  responses,
  asyncHandler,
  handleDatabaseError,
  validation,
  createPaginationMeta,
  search,
  transform,
  withPerformanceMonitoring,
  cache
};