// Content Generation Routes
const express = require('express');
const router = express.Router();
const contentGenerationController = require('../controllers/contentGenerationController');
const { verifyToken } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Content generation endpoints
router.post('/study-guide', contentGenerationController.generateStudyGuide);
router.post('/quiz', contentGenerationController.generateQuiz);
router.post('/flashcards', contentGenerationController.generateFlashcards);
router.post('/practice-problems', contentGenerationController.generatePracticeProblems);

// Interactive quiz endpoints
router.post('/quiz/submit-results', contentGenerationController.submitQuizResults);

// Adaptive flashcard endpoints
router.post('/flashcards/submit-session', contentGenerationController.submitFlashcardSession);

// Interactive practice problems endpoints
router.post('/practice-problems/submit-session', contentGenerationController.submitPracticeSession);

// Content management endpoints
router.get('/content', contentGenerationController.getUserContent);
router.get('/material/:materialId', contentGenerationController.getStudyMaterial);

module.exports = router;