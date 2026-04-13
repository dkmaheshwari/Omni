// AI Tutor Routes
const express = require('express');
const router = express.Router();
const aiTutorController = require('../controllers/aiTutorController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// AI Tutoring endpoints
router.post('/session', aiTutorController.startTutoringSession);
router.post('/question', aiTutorController.askTutorQuestion);
router.post('/learning-path', aiTutorController.generateLearningPath);
router.get('/progress', aiTutorController.getLearningProgress);
router.post('/feedback', aiTutorController.provideFeedback);
router.get('/session/:sessionId/history', aiTutorController.getSessionHistory);

module.exports = router;