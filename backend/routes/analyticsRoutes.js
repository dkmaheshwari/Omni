// Analytics Routes
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken } = require('../middleware/authMiddleware');
const analyticsTracker = require('../services/analyticsTracker');

// Apply authentication middleware to all routes
router.use(verifyToken);

// Analytics endpoints
router.get('/learning-profile', analyticsController.getLearningProfile);
router.post('/detect-learning-style', analyticsController.detectLearningStyle);
router.get('/performance', analyticsController.getPerformanceMetrics);
router.get('/engagement', analyticsController.getEngagementStats);
router.post('/track-interaction', analyticsController.trackInteraction);
router.get('/report', analyticsController.generateAnalyticsReport);

// Enhanced real-time tracking endpoints
router.post('/session/start', async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { sessionType } = req.body;
    
    const sessionId = await analyticsTracker.startSession(userId, sessionType);
    
    res.json({
      success: true,
      sessionId,
      message: 'Session started successfully'
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/session/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    await analyticsTracker.endSession(sessionId);
    
    res.json({
      success: true,
      message: 'Session ended successfully'
    });
    
  } catch (error) {

    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/track/event', async (req, res) => {
  try {
    const { sessionId, eventType, eventData } = req.body;
    
    await analyticsTracker.trackEvent(sessionId, eventType, eventData);
    
    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/track/ai-interaction', async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const interactionData = req.body;
    
    const aiInteraction = await analyticsTracker.trackAIInteraction(userId, interactionData);
    
    res.json({
      success: true,
      interaction: aiInteraction,
      message: 'AI interaction tracked successfully'
    });
  } catch (error) {
    console.error('Track AI interaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/track/learning-progress', async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const progressData = req.body;
    
    await analyticsTracker.trackLearningProgress(userId, progressData);
    
    res.json({
      success: true,
      message: 'Learning progress tracked successfully'
    });
  } catch (error) {
    console.error('Track learning progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/track/study-material', async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const materialData = req.body;
    
    await analyticsTracker.trackStudyMaterialUsage(userId, materialData);
    
    res.json({
      success: true,
      message: 'Study material usage tracked successfully'
    });
  } catch (error) {
    console.error('Track study material error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/track/engagement', async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const engagementData = req.body;
    
    await analyticsTracker.trackEngagement(userId, engagementData);
    
    res.json({
      success: true,
      message: 'Engagement tracked successfully'
    });
  } catch (error) {
    console.error('Track engagement error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get real-time analytics
router.get('/realtime/sessions', async (req, res) => {
  try {
    const { uid: userId } = req.user;
    
    const activeSessions = analyticsTracker.getActiveSessions(userId);
    const sessionStats = analyticsTracker.getSessionStats();
    
    res.json({
      success: true,
      activeSessions,
      sessionStats
    });
  } catch (error) {
    console.error('Get realtime sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;