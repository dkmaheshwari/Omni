/**
 * 🛡️ Security Middleware Collection
 * Comprehensive security measures for PeerGenius backend
 */

const helmet = require('helmet');
const cors = require('cors');
const { responses } = require('../utils/controllerHelpers');

/**
 * CORS configuration for cross-origin requests
 * Configured for PeerGenius frontend communication
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // React dev server
      'https://peergenius.app', // Production domain
      'https://www.peergenius.app', // Production domain with www
    ];
    
    // Add development origins
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push(
        'http://localhost:5174', // Alternative Vite port
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
      );
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // Allow cookies and credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Client-Version'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
  maxAge: 86400 // 24 hours preflight cache
};

/**
 * Helmet security configuration
 * Comprehensive security headers for production
 */
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.groq.com", "wss:", "ws:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },
  crossOriginEmbedderPolicy: false, // Disable for Socket.IO compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
};

/**
 * Request sanitization middleware
 * Prevents common injection attacks
 */
const sanitizeRequest = (req, res, next) => {
  // Check for suspicious patterns in URL
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /<script/i, // XSS
    /javascript:/i, // JavaScript injection
    /vbscript:/i, // VBScript injection
    /onload=/i, // Event handler injection
    /eval\(/i, // Code execution
    /expression\(/i // CSS expression injection
  ];
  
  const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl)) {
      console.warn(`🚨 Suspicious request blocked: ${req.ip} -> ${req.originalUrl}`);
      return responses.badRequest(res, 'Invalid request format');
    }
  }
  
  // Sanitize common headers
  const dangerousHeaders = ['x-forwarded-host', 'x-real-ip'];
  dangerousHeaders.forEach(header => {
    if (req.headers[header]) {
      delete req.headers[header];
    }
  });
  
  next();
};

/**
 * Request size limiter
 * Prevents large payload attacks
 */
const limitRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length']) || 0;
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      console.warn(`🚨 Large request blocked: ${contentLength} bytes from ${req.ip}`);
      return responses.badRequest(res, 'Request payload too large');
    }
    
    next();
  };
};

/**
 * Helper function to parse size strings
 */
function parseSize(size) {
  if (typeof size === 'number') return size;
  const match = size.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match) return 1024 * 1024; // Default 1MB
  
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'b').toLowerCase();
  
  switch (unit) {
    case 'gb': return num * 1024 * 1024 * 1024;
    case 'mb': return num * 1024 * 1024;
    case 'kb': return num * 1024;
    default: return num;
  }
}

/**
 * API versioning middleware
 * Ensures client compatibility
 */
const checkApiVersion = (req, res, next) => {
  const clientVersion = req.headers['x-client-version'];
  const minSupportedVersion = '1.0.0';
  
  if (clientVersion && compareVersions(clientVersion, minSupportedVersion) < 0) {
    console.warn(`⚠️  Outdated client version: ${clientVersion} from ${req.ip}`);
    return responses.badRequest(res, 'Client version outdated. Please update your application.');
  }
  
  next();
};

/**
 * Helper function to compare version strings
 */
function compareVersions(version1, version2) {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
}

/**
 * Request logging middleware for security monitoring
 */
const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log security-relevant requests
  const securityEndpoints = ['/api/auth', '/api/admin', '/api/users'];
  const isSecurityEndpoint = securityEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );
  
  if (isSecurityEndpoint || req.method !== 'GET') {
    console.log(`🔍 ${req.method} ${req.path} - IP: ${req.ip} - User-Agent: ${req.headers['user-agent']?.substring(0, 50)}...`);
  }
  
  // Track response for security monitoring
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    // Log failed auth attempts and errors
    if (res.statusCode >= 400) {
      console.warn(`⚠️  ${res.statusCode} ${req.method} ${req.path} - ${duration}ms - IP: ${req.ip}`);
    }
    
    // Log suspicious response times (potential attacks)
    if (duration > 5000) {
      console.warn(`🐌 Slow response: ${duration}ms for ${req.method} ${req.path}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * IP whitelist/blacklist middleware
 */
const ipFilter = (options = {}) => {
  const { whitelist = [], blacklist = [] } = options;
  
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIP)) {
      console.warn(`🚫 Blacklisted IP blocked: ${clientIP}`);
      return responses.forbidden(res, 'Access denied');
    }
    
    // Check whitelist (if configured)
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      console.warn(`🚫 Non-whitelisted IP blocked: ${clientIP}`);
      return responses.forbidden(res, 'Access denied');
    }
    
    next();
  };
};

/**
 * Prevent parameter pollution
 * Blocks duplicate parameter attacks
 */
const preventParameterPollution = (req, res, next) => {
  // Check for duplicate parameters in query string
  const queryKeys = Object.keys(req.query);
  const duplicateKeys = queryKeys.filter((key, index) => queryKeys.indexOf(key) !== index);
  
  if (duplicateKeys.length > 0) {
    console.warn(`🚨 Parameter pollution detected: ${duplicateKeys.join(', ')} from ${req.ip}`);
    return responses.badRequest(res, 'Invalid request parameters');
  }
  
  next();
};

/**
 * Enhanced rate limiting with different tiers
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
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
    
    if (userRequests.length >= maxRequests) {
      const resetTime = Math.ceil(windowMs / 1000);
      res.set('X-Rate-Limit-Remaining', '0');
      res.set('X-Rate-Limit-Reset', new Date(now + windowMs).toISOString());
      
      console.warn(`⏱️  Rate limit exceeded: ${identifier} (${userRequests.length}/${maxRequests})`);
      return responses.rateLimited(res, 
        `Too many requests. Try again in ${Math.ceil(resetTime / 60)} minutes.`,
        resetTime
      );
    }
    
    userRequests.push(now);
    requests.set(identifier, userRequests);
    
    res.set('X-Rate-Limit-Remaining', String(maxRequests - userRequests.length));
    next();
  };
};

module.exports = {
  // CORS and Helmet
  corsOptions,
  helmetOptions,
  
  // Request sanitization and validation
  sanitizeRequest,
  limitRequestSize,
  checkApiVersion,
  preventParameterPollution,
  
  // Monitoring and logging
  securityLogger,
  
  // Access control
  ipFilter,
  
  // Rate limiting
  createRateLimit,
  
  // Pre-configured middleware combinations
  basicSecurity: [
    helmet(helmetOptions),
    cors(corsOptions),
    sanitizeRequest,
    securityLogger,
    preventParameterPollution
  ],
  
  strictSecurity: [
    helmet(helmetOptions),
    cors(corsOptions),
    sanitizeRequest,
    limitRequestSize('5mb'),
    checkApiVersion,
    securityLogger,
    preventParameterPollution,
    createRateLimit(15 * 60 * 1000, 60) // 60 requests per 15 minutes
  ]
};