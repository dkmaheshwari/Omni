// AI Tutor Controller - Handle AI tutoring requests
const aiService = require('../services/aiService');
const UserLearningProfile = require('../models/UserLearningProfile');
const AIInteraction = require('../models/AIInteraction');
const LearningAnalytics = require('../models/LearningAnalytics');

// CRITICAL FIX: Start AI tutoring session with proper Firebase UID extraction
exports.startTutoringSession = async (req, res) => {
  try {
    // CRITICAL FIX: Extract Firebase UID properly
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no user ID found'
      });
    }
    
    const { subject, difficulty = 'intermediate', goals = [] } = req.body;
    
    // Input validation
    if (!subject) {
      return res.status(400).json({
        success: false,
        error: 'Subject is required'
      });
    }

    // Get or create user learning profile
    let userProfile = await UserLearningProfile.findByUserId(userId);
    if (!userProfile) {
      userProfile = UserLearningProfile.createDefaultProfile(userId);
      await userProfile.save();
    }

    // Generate personalized tutoring session start
    const sessionId = `session_${Date.now()}_${userId}`;
    const learningStyle = userProfile.learningStyle || 'visual';
    
    const aiResponse = await aiService.startTutoringSession(
      userId,
      subject,
      difficulty
    );

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'tutoring',
      userInput: `Start tutoring session for ${subject} at ${difficulty} level`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject,
      difficulty,
      sessionId,
      sessionSequence: 1
    });

    await interaction.save();

    // Update user profile with session start
    userProfile.engagementMetrics.sessionsCompleted += 1;
    userProfile.engagementMetrics.lastActiveDate = new Date();
    
    // Add goals if provided
    goals.forEach(goal => {
      userProfile.addLearningGoal(subject, goal, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days
    });

    await userProfile.save();

    res.json({
      success: true,
      sessionId,
      response: aiResponse.content,
      learningStyle,
      recommendations: userProfile.recommendations.slice(0, 3)
    });

  } catch (error) {
    console.error('Start tutoring session error:', error);
    
    // Enhanced error handling with user-friendly messages
    let errorMessage = 'Failed to start tutoring session';
    if (error.message.includes('Rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment before starting a new session.';
    } else if (error.message.includes('AI service')) {
      errorMessage = 'AI tutoring service is temporarily unavailable. Please try again later.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// CRITICAL FIX: Ask AI tutor a question with proper authentication and validation
exports.askTutorQuestion = async (req, res) => {
  try {
    // CRITICAL FIX: Extract Firebase UID properly
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no user ID found'
      });
    }
    
    const { question, sessionId, context = [] } = req.body;
    
    // Input validation
    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Get user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    const learningStyle = userProfile?.learningStyle || 'visual';

    // Get conversation context from recent interactions
    const recentInteractions = await AIInteraction.findBySession(sessionId);
    const conversationContext = recentInteractions.slice(-5).map(interaction => ({
      role: 'user',
      content: interaction.userInput
    }));

    // Generate AI response
    const aiResponse = await aiService.askTutorQuestion(
      userId,
      question,
      conversationContext,
      learningStyle
    );

    // CRITICAL FIX: Determine subject from question or context with proper async handling
    const subject = await exports.extractSubject(question, conversationContext);

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'tutoring',
      userInput: question,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject,
      sessionId,
      sessionSequence: recentInteractions.length + 1,
      contextSize: conversationContext.length
    });

    await interaction.save();

    // Update user profile engagement
    if (userProfile) {
      userProfile.updateEngagementMetrics(30, 85); // 30 seconds, 85% engagement
      await userProfile.save();
    }

    res.json({
      success: true,
      response: aiResponse.content,
      interactionId: interaction._id,
      suggestions: await exports.generateFollowUpSuggestions(question, aiResponse.content)
    });

  } catch (error) {
    console.error('Ask tutor question error:', error);
    
    // Enhanced error handling with user-friendly messages
    let errorMessage = 'Failed to get AI tutor response';
    if (error.message.includes('Rate limit')) {
      errorMessage = 'Too many questions. Please wait a moment before asking another question.';
    } else if (error.message.includes('AI service')) {
      errorMessage = 'AI tutoring service is temporarily unavailable. Please try again later.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// CRITICAL FIX: Generate personalized learning path with proper validation
exports.generateLearningPath = async (req, res) => {
  try {
    // CRITICAL FIX: Extract Firebase UID properly
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no user ID found'
      });
    }
    
    const { subject, currentLevel, goals, timeframe = '30 days' } = req.body;
    
    // Input validation
    if (!subject || !currentLevel || !goals) {
      return res.status(400).json({
        success: false,
        error: 'Subject, current level, and goals are required'
      });
    }
    
    if (!Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Goals must be a non-empty array'
      });
    }

    // Get user profile for personalization
    const userProfile = await UserLearningProfile.findByUserId(userId);
    const learningStyle = userProfile?.learningStyle || 'visual';

    // Generate learning path
    const aiResponse = await aiService.generateLearningPath(
      userId,
      subject,
      currentLevel,
      goals.join(', ')
    );

    // CRITICAL FIX: Parse learning path and create structured format with proper async handling
    const learningPath = await exports.parseLearningPath(aiResponse.content);

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'tutoring',
      userInput: `Generate learning path for ${subject} from ${currentLevel} level with goals: ${goals.join(', ')}`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject,
      difficulty: currentLevel
    });

    await interaction.save();

    // Update user profile with learning path
    if (userProfile) {
      goals.forEach(goal => {
        userProfile.addLearningGoal(subject, goal, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      });
      await userProfile.save();
    }

    res.json({
      success: true,
      learningPath,
      rawContent: aiResponse.content,
      estimatedDuration: timeframe,
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Generate learning path error:', error);
    
    // Enhanced error handling with user-friendly messages
    let errorMessage = 'Failed to generate learning path';
    if (error.message.includes('Rate limit')) {
      errorMessage = 'Too many requests. Please wait before generating another learning path.';
    } else if (error.message.includes('AI service')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again later.';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// CRITICAL FIX: Get learning progress with proper authentication
exports.getLearningProgress = async (req, res) => {
  try {
    // CRITICAL FIX: Extract Firebase UID properly
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no user ID found'
      });
    }

    // Get user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User learning profile not found'
      });
    }

    // Get recent analytics
    const recentAnalytics = await LearningAnalytics.getLatestAnalytics(userId);

    // Get recent AI interactions for insights
    const recentInteractions = await AIInteraction.findByUserId(userId, 20);

    // Calculate progress metrics
    const progressMetrics = {
      overallScore: userProfile.performanceMetrics.overallScore,
      subjectScores: userProfile.performanceMetrics.subjectScores,
      learningGoals: userProfile.learningGoals.map(goal => ({
        ...goal.toObject(),
        daysRemaining: Math.ceil((goal.targetDate - new Date()) / (1000 * 60 * 60 * 24))
      })),
      strengths: userProfile.strengths,
      weaknesses: userProfile.weaknesses,
      recommendations: userProfile.recommendations.filter(r => !r.implemented),
      engagementMetrics: userProfile.engagementMetrics,
      recentActivity: recentInteractions.slice(0, 5).map(interaction => ({
        date: interaction.createdAt,
        type: interaction.interactionType,
        subject: interaction.subject,
        satisfaction: interaction.userFeedback?.rating || null
      }))
    };

    res.json({
      success: true,
      progress: progressMetrics,
      analytics: recentAnalytics,
      learningStyle: userProfile.learningStyle,
      preferences: userProfile.tutorPreferences
    });

  } catch (error) {
    console.error('Get learning progress error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// CRITICAL FIX: Provide feedback with proper validation
exports.provideFeedback = async (req, res) => {
  try {
    // CRITICAL FIX: Extract Firebase UID properly
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no user ID found'
      });
    }
    
    const { interactionId, feedback } = req.body;
    
    // Input validation
    if (!interactionId || !feedback) {
      return res.status(400).json({
        success: false,
        error: 'Interaction ID and feedback are required'
      });
    }

    // Find the interaction
    const interaction = await AIInteraction.findById(interactionId);
    if (!interaction || interaction.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Interaction not found'
      });
    }

    // Add feedback
    interaction.addUserFeedback(feedback);
    await interaction.save();

    // Update user profile based on feedback
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile && feedback.rating) {
      const avgEngagement = (userProfile.engagementMetrics.averageEngagementScore * 0.9) + 
                           ((feedback.rating / 5) * 100 * 0.1);
      userProfile.engagementMetrics.averageEngagementScore = avgEngagement;
      await userProfile.save();
    }

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Provide feedback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// CRITICAL FIX: Get tutoring session history with proper validation
exports.getSessionHistory = async (req, res) => {
  try {
    // CRITICAL FIX: Extract Firebase UID properly
    const userId = req.user?.uid || req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required - no user ID found'
      });
    }
    
    const { sessionId } = req.params;
    
    // Input validation
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Session ID is required'
      });
    }

    // Get all interactions for the session
    const interactions = await AIInteraction.findBySession(sessionId);
    
    // Filter for user's interactions only
    const userInteractions = interactions.filter(interaction => 
      interaction.userId === userId
    );

    res.json({
      success: true,
      sessionId,
      interactions: userInteractions,
      totalInteractions: userInteractions.length
    });

  } catch (error) {
    console.error('Get session history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper methods
exports.extractSubject = async (question, context) => {
  // Simple subject extraction - can be enhanced with NLP
  const subjectKeywords = {
    'mathematics': ['math', 'algebra', 'calculus', 'geometry', 'equation', 'formula'],
    'physics': ['physics', 'force', 'energy', 'momentum', 'velocity', 'acceleration'],
    'chemistry': ['chemistry', 'molecule', 'reaction', 'element', 'compound'],
    'biology': ['biology', 'cell', 'organism', 'genetics', 'evolution'],
    'programming': ['code', 'programming', 'function', 'variable', 'algorithm'],
    'english': ['grammar', 'writing', 'essay', 'literature', 'reading'],
    'history': ['history', 'historical', 'war', 'civilization', 'period']
  };

  const questionLower = question.toLowerCase();
  
  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    if (keywords.some(keyword => questionLower.includes(keyword))) {
      return subject;
    }
  }

  return 'general';
};

exports.generateFollowUpSuggestions = async (question, aiResponse) => {
  // Generate contextual follow-up suggestions
  const suggestions = [
    'Can you explain this concept in simpler terms?',
    'What are some practice problems for this topic?',
    'How does this relate to other concepts?',
    'What are common mistakes to avoid?',
    'Can you provide a real-world example?'
  ];

  // Return first 3 suggestions (can be made more intelligent)
  return suggestions.slice(0, 3);
};

exports.parseLearningPath = async (content) => {
  // Parse AI-generated learning path into structured format
  const lines = content.split('\n').filter(line => line.trim());
  const path = {
    phases: [],
    totalDuration: '30 days',
    difficulty: 'progressive'
  };

  let currentPhase = null;
  
  lines.forEach(line => {
    line = line.trim();
    
    // Detect phase headers
    if (line.match(/^\d+\./)) {
      if (currentPhase) {
        path.phases.push(currentPhase);
      }
      currentPhase = {
        title: line.replace(/^\d+\.\s*/, ''),
        steps: [],
        duration: '1 week'
      };
    } else if (line.startsWith('-') || line.startsWith('•')) {
      if (currentPhase) {
        currentPhase.steps.push(line.replace(/^[-•]\s*/, ''));
      }
    }
  });

  if (currentPhase) {
    path.phases.push(currentPhase);
  }

  return path;
};