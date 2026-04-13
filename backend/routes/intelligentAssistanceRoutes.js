// Intelligent Assistance Routes
const express = require('express');
const router = express.Router();
const intelligentAssistanceController = require('../controllers/intelligentAssistanceController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Intelligent assistance endpoints
router.post('/code-review', intelligentAssistanceController.reviewCode);
router.post('/writing-assistance', intelligentAssistanceController.assistWithWriting);
router.post('/math-solving', intelligentAssistanceController.solveMathProblem);
router.post('/research-assistance', intelligentAssistanceController.researchAssistance);

// History and management
router.get('/history', intelligentAssistanceController.getAssistanceHistory);

module.exports = router;