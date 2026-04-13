const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middleware/authMiddleware");
const { 
  getCategories, 
  createDefaultCategories, 
  getCategoryStats 
} = require("../controllers/threadCategoryController");

// Public routes (categories are needed for thread creation)
router.get("/", verifyToken, getCategories);
router.get("/stats", verifyToken, getCategoryStats);

// Admin route for creating default categories
router.post("/defaults", verifyToken, createDefaultCategories);

module.exports = router;