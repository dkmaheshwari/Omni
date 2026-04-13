// backend/routes/userRoutes.js
const express = require("express");
const { 
  upsertUser, 
  getProfile, 
  updateProfile, 
  getPreferences, 
  updatePreferences 
} = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");
const { validateUserSync, validateProfileUpdate, validatePreferencesUpdate } = require("../middleware/validation");
const router = express.Router();

// POST /api/users   <-- this will now insert/update by firebaseId
router.post("/", verifyToken, validateUserSync, upsertUser);

// GET /api/users/profile - Get current user's profile
router.get("/profile", verifyToken, getProfile);

// PUT /api/users/profile - Update current user's profile
router.put("/profile", verifyToken, validateProfileUpdate, updateProfile);

// GET /api/users/preferences - Get current user's preferences
router.get("/preferences", verifyToken, getPreferences);

// PUT /api/users/preferences - Update current user's preferences
router.put("/preferences", verifyToken, validatePreferencesUpdate, updatePreferences);

module.exports = router;
