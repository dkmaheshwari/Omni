/**
 * 🔐 Enhanced Authentication & Authorization Middleware
 * Comprehensive security system for PeerGenius backend
 */

const admin = require('../firebaseAdmin');
const { responses } = require('../utils/controllerHelpers');
const { sanitizeHtml } = require('../utils/inputSanitizer');

// User role definitions
const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// Permission levels
const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  MODERATE: 'moderate',
  ADMIN: 'admin'
};

/**
 * Core token verification middleware
 * Verifies Firebase ID tokens and attaches user context
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object 
 * @param {Function} next - Next middleware function
 */
const verifyToken = async (req, res, next) => {
  try {
    // Check if Firebase admin is available
    if (!admin) {
      console.warn('⚠️ Firebase not initialized - skipping auth for development');
      req.user = {
        uid: 'dev-user',
        email: 'dev@example.com',
        emailVerified: true,
        role: USER_ROLES.STUDENT,
        permissions: [PERMISSIONS.READ, PERMISSIONS.WRITE]
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ No valid authorization header. Received:', authHeader ? 'Invalid format' : 'Missing header');
      console.error('❌ Request path:', req.path);
      console.error('❌ Request method:', req.method);
      return responses.unauthorized(res, 'No valid authorization token provided');
    }
    
    const idToken = authHeader.split(' ')[1];
    
    if (!idToken) {
      console.error('❌ No token found in authorization header');
      return responses.unauthorized(res, 'No token provided');
    }
    
    // Validate token format (basic check before Firebase verification)
    if (idToken.length < 100 || !idToken.includes('.')) {
      console.error('❌ Invalid token format');
      return responses.unauthorized(res, 'Invalid token format');
    }
    
    console.log('🔐 Verifying token for request:', req.method, req.path);
    
    // Verify token with Firebase
    const decoded = await admin.auth().verifyIdToken(idToken);
    
    // Enhanced user context
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified || false,
      name: decoded.name || '',
      picture: decoded.picture || '',
      role: decoded.role || USER_ROLES.STUDENT,
      permissions: decoded.permissions || [PERMISSIONS.READ],
      lastLogin: new Date().toISOString(),
      tokenExpiry: new Date(decoded.exp * 1000).toISOString(),
      provider: decoded.firebase?.provider || 'unknown'
    };
    
    // Security logging
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Token verified for user:', decoded.email, 'Role:', req.user.role);
    } else {
      // Production logging (less verbose)
      console.log('✅ Auth success:', decoded.email?.substring(0, 3) + '***');
    }
    
    next();
    
  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    
    // Enhanced error handling
    if (err.code === 'auth/id-token-expired') {
      return responses.unauthorized(res, 'Authentication token has expired');
    } else if (err.code === 'auth/invalid-id-token') {
      return responses.unauthorized(res, 'Invalid authentication token');
    } else if (err.code === 'auth/id-token-revoked') {
      return responses.unauthorized(res, 'Authentication token has been revoked');
    } else if (err.code === 'auth/user-disabled') {
      return responses.forbidden(res, 'User account has been disabled');
    } else if (err.code === 'auth/project-not-found') {
      console.error('❌ Firebase project configuration error');
      return responses.serverError(res, 'Authentication service unavailable');
    } else {
      // Generic auth failure
      return responses.unauthorized(res, 'Authentication failed');
    }
  }
};

/**
 * Optional authentication middleware
 * Allows both authenticated and guest access
 * Attaches user context if token is valid, otherwise continues as guest
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    // No auth provided - continue as guest
    req.user = null;
    req.isGuest = true;
    return next();
  }
  
  // Auth provided - verify it
  verifyToken(req, res, (err) => {
    if (err) {
      // Auth failed - continue as guest
      req.user = null;
      req.isGuest = true;
      console.warn('⚠️  Optional auth failed, continuing as guest:', err.message);
    } else {
      req.isGuest = false;
    }
    next();
  });
};

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 * @param {string|Array} requiredRoles - Required role(s)
 * @returns {Function} - Authorization middleware
 */
const requireRole = (requiredRoles) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return responses.unauthorized(res, 'Authentication required');
    }
    
    const userRole = req.user.role || USER_ROLES.STUDENT;
    
    if (!roles.includes(userRole)) {
      console.warn(`⚠️  Role check failed: ${req.user.email} has role '${userRole}', required: ${roles.join(', ')}`);
      return responses.forbidden(res, 'Insufficient permissions');
    }
    
    console.log(`✅ Role check passed: ${userRole} for ${req.user.email}`);
    next();
  };
};

/**
 * Permission-based authorization middleware factory
 * Creates middleware that checks if user has required permissions
 * @param {string|Array} requiredPermissions - Required permission(s)
 * @returns {Function} - Authorization middleware
 */
const requirePermission = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return (req, res, next) => {
    if (!req.user) {
      return responses.unauthorized(res, 'Authentication required');
    }
    
    const userPermissions = req.user.permissions || [PERMISSIONS.READ];
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));
    
    if (!hasPermission) {
      console.warn(`⚠️  Permission check failed: ${req.user.email} permissions: ${userPermissions.join(', ')}, required: ${permissions.join(', ')}`);
      return responses.forbidden(res, 'Insufficient permissions');
    }
    
    console.log(`✅ Permission check passed: ${permissions.join(', ')} for ${req.user.email}`);
    next();
  };
};

/**
 * Resource ownership middleware factory
 * Checks if user owns or can access a specific resource
 * @param {Function} ownershipCheck - Function to determine ownership
 * @returns {Function} - Authorization middleware
 */
const requireOwnership = (ownershipCheck) => {
  return async (req, res, next) => {
    if (!req.user) {
      return responses.unauthorized(res, 'Authentication required');
    }
    
    try {
      const isOwner = await ownershipCheck(req.user, req.params, req.body);
      
      if (!isOwner) {
        console.warn(`⚠️  Ownership check failed: ${req.user.email} for resource ${req.params.id || 'unknown'}`);
        return responses.forbidden(res, 'Access denied - not resource owner');
      }
      
      console.log(`✅ Ownership check passed for ${req.user.email}`);
      next();
      
    } catch (error) {
      console.error('❌ Ownership check error:', error.message);
      return responses.serverError(res, 'Authorization check failed');
    }
  };
};

/**
 * Email verification middleware
 * Requires user to have verified email address
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return responses.unauthorized(res, 'Authentication required');
  }
  
  if (!req.user.emailVerified) {
    console.warn(`⚠️  Email verification required: ${req.user.email}`);
    return responses.forbidden(res, 'Email verification required');
  }
  
  next();
};

/**
 * Rate limiting middleware for sensitive operations
 * @param {Object} options - Rate limiting configuration
 */
const rateLimitAuth = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 5,
    blockDuration = 60 * 60 * 1000 // 1 hour
  } = options;
  
  const attempts = new Map();
  const blocked = new Map();
  
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Check if currently blocked
    if (blocked.has(identifier)) {
      const blockTime = blocked.get(identifier);
      if (now < blockTime) {
        const remainingTime = Math.ceil((blockTime - now) / 1000 / 60); // minutes
        return responses.rateLimited(res, 
          `Too many authentication attempts. Try again in ${remainingTime} minutes.`,
          remainingTime * 60
        );
      } else {
        blocked.delete(identifier);
      }
    }
    
    // Clean old attempts
    if (attempts.has(identifier)) {
      const userAttempts = attempts.get(identifier).filter(time => now - time < windowMs);
      attempts.set(identifier, userAttempts);
    }
    
    const userAttempts = attempts.get(identifier) || [];
    
    if (userAttempts.length >= maxAttempts) {
      blocked.set(identifier, now + blockDuration);
      attempts.delete(identifier);
      console.warn(`🚨 IP blocked for excessive auth attempts: ${identifier}`);
      return responses.rateLimited(res, 
        'Too many authentication attempts. Account temporarily blocked.',
        Math.ceil(blockDuration / 1000)
      );
    }
    
    // Track this attempt
    userAttempts.push(now);
    attempts.set(identifier, userAttempts);
    
    next();
  };
};

/**
 * Admin-only middleware
 * Shorthand for admin role requirement
 */
const requireAdmin = requireRole(USER_ROLES.ADMIN);

/**
 * Teacher or Admin middleware
 * For educator-level access
 */
const requireEducator = requireRole([USER_ROLES.TEACHER, USER_ROLES.ADMIN]);

/**
 * Moderator or Admin middleware
 * For moderation capabilities
 */
const requireModerator = requireRole([USER_ROLES.MODERATOR, USER_ROLES.ADMIN]);

module.exports = {
  // Core authentication
  verifyToken,
  optionalAuth,
  
  // Authorization
  requireRole,
  requirePermission,
  requireOwnership,
  requireEmailVerification,
  
  // Convenience middlewares
  requireAdmin,
  requireEducator,
  requireModerator,
  
  // Security
  rateLimitAuth,
  
  // Constants
  USER_ROLES,
  PERMISSIONS
};