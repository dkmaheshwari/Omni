// backend/routes/threadRoutes.js
const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { validateCreateThread, validateObjectId } = require("../middleware/validation");
const admin = require("../firebaseAdmin");
const { 
  getThreads, 
  createThread, 
  joinThread, 
  leaveThread, 
  getPublicThreads,
  refreshPublicThreadsCache,
  searchThreads,
  getRecommendedThreads,
  getThreadAnalytics
} = require("../controllers/threadController");

// Basic thread operations
router.get("/", verifyToken, getThreads);
// Secure optional authentication middleware
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith("Bearer ")) {
    const idToken = authHeader.split(" ")[1];
    if (idToken && idToken.length > 10) { // Basic token format validation
      try {
        // Verify token with strict validation
        const decoded = await admin.auth().verifyIdToken(idToken, true);
        req.user = decoded;
        req.isAuthenticated = true;
        console.log("✅ Authenticated user accessing public threads:", decoded.uid);
      } catch (err) {
        console.warn("⚠️ Invalid token provided for public access:", err.code);
        // For public endpoints, continue as unauthenticated - don't return 401
        req.user = null;
        req.isAuthenticated = false;
        
        // Don't return error for public endpoints with expired/invalid tokens
        if (err.code === 'auth/id-token-expired' || 
            err.code === 'auth/argument-error' || 
            err.code === 'auth/invalid-argument' ||
            err.code === 'auth/id-token-revoked') {
          console.log("🌐 Continuing as anonymous user for public endpoint");
        }
      }
    } else {
      req.user = null;
      req.isAuthenticated = false;
    }
  } else {
    // No auth provided, continue as unauthenticated
    req.user = null;
    req.isAuthenticated = false;
  }
  
  next();
};

router.get("/public", optionalAuth, getPublicThreads);

router.post("/public/refresh", verifyToken, refreshPublicThreadsCache); // CRITICAL FIX: Manual cache refresh endpoint
router.post("/", verifyToken, validateCreateThread, createThread);
router.post("/:threadId/join", verifyToken, validateObjectId('threadId'), joinThread);
router.post("/:threadId/leave", verifyToken, validateObjectId('threadId'), leaveThread);

// Advanced discovery and search
router.get("/search", verifyToken, searchThreads);
router.get("/recommended", verifyToken, getRecommendedThreads);
router.get("/:threadId/analytics", verifyToken, validateObjectId('threadId'), getThreadAnalytics);

module.exports = router;
