const errorHandler = (err, req, res, next) => {
  // Enhanced error logging with more context
  const timestamp = new Date().toISOString();
  const errorId = Math.random().toString(36).substr(2, 9); // Generate unique error ID
  
  // Sanitize request body to remove sensitive information
  const sanitizeBody = (body) => {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'api_key', 'secret', 'key', 'auth'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  };

  console.error(`
🚨 ERROR [${errorId}] - ${timestamp}
📍 Route: ${req.method} ${req.originalUrl}
👤 User: ${req.user?.email || 'Anonymous'} (${req.user?.uid || 'N/A'})
📊 Status: ${err.status || 500}
💬 Message: ${err.message}
📋 Stack: ${process.env.NODE_ENV === 'development' ? err.stack : '[Stack trace hidden in production]'}
🔍 Request Body: ${JSON.stringify(sanitizeBody(req.body), null, 2)}
🌐 IP: ${req.ip || req.connection.remoteAddress}
🔧 User Agent: ${req.get('User-Agent') || 'Unknown'}
  `);

  // Default error response
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
    errorId: errorId,
    timestamp: timestamp
  };

  // Handle specific error types with better messages
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    error = {
      message: 'Validation failed',
      status: 400,
      details: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message,
        value: e.value
      })),
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.name === 'CastError') {
    // MongoDB ObjectId cast error
    error = {
      message: `Invalid ${err.path}: ${err.value}`,
      status: 400,
      field: err.path,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    const field = Object.keys(err.keyPattern)[0];
    error = {
      message: `${field} already exists`,
      status: 409,
      field: field,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.name === 'JsonWebTokenError') {
    // JWT error
    error = {
      message: 'Invalid authentication token',
      status: 401,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.name === 'TokenExpiredError') {
    // JWT expired
    error = {
      message: 'Authentication token has expired',
      status: 401,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.name === 'MongoTimeoutError') {
    // MongoDB timeout
    error = {
      message: 'Database operation timed out',
      status: 504,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.name === 'MongoNetworkError') {
    // MongoDB network error
    error = {
      message: 'Database connection error',
      status: 503,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.name === 'MulterError') {
    // File upload error
    let message = 'File upload error';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files';
    }
    error = {
      message: message,
      status: 400,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.type === 'entity.parse.failed') {
    // JSON parsing error
    error = {
      message: 'Invalid JSON in request body',
      status: 400,
      errorId: errorId,
      timestamp: timestamp
    };
  } else if (err.type === 'entity.too.large') {
    // Request too large
    error = {
      message: 'Request body too large',
      status: 413,
      errorId: errorId,
      timestamp: timestamp
    };
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
    delete error.details;
  }

  // Log critical errors for monitoring
  if (error.status >= 500) {
    console.error(`🚨 CRITICAL ERROR [${errorId}]: ${error.message}`);
  }

  res.status(error.status).json({
    success: false,
    error: error.message,
    errorId: error.errorId,
    timestamp: error.timestamp,
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, originalError: err.message })
  });
};

// Handle 404 errors
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`);
  error.status = 404;
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};