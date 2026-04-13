// Analytics Controller - Handle advanced analytics and learning style detection
const aiService = require('../services/aiService');
const UserLearningProfile = require('../models/UserLearningProfile');
const AIInteraction = require('../models/AIInteraction');
const LearningAnalytics = require('../models/LearningAnalytics');
const StudyMaterial = require('../models/StudyMaterial');

// Get user learning profile
exports.getLearningProfile = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    // Get or create user learning profile
    let userProfile = await UserLearningProfile.findByUserId(userId);
    if (!userProfile) {
      userProfile = new UserLearningProfile({ userId });
      await userProfile.save();
    }

    // Get recent interactions for analysis
    const recentInteractions = await AIInteraction.findByUserId(userId, 50);
    
    // Analyze learning patterns if we have enough data
    if (recentInteractions.length > 0) {
      const patterns = await this.analyzeLearningPatterns(recentInteractions);
      userProfile.learningPatterns = { ...userProfile.learningPatterns, ...patterns };
    }

    res.json({
      success: true,
      profile: {
        userId: userProfile.userId,
        learningStyle: userProfile.learningStyle,
        difficultyPreference: userProfile.difficultyPreference,
        preferredSubjects: userProfile.preferredSubjects,
        learningGoals: userProfile.learningGoals,
        performanceMetrics: userProfile.performanceMetrics,
        learningPatterns: userProfile.learningPatterns,
        strengths: userProfile.strengths,
        weaknesses: userProfile.weaknesses,
        tutorPreferences: userProfile.tutorPreferences,
        engagementMetrics: userProfile.engagementMetrics,
        recommendations: userProfile.recommendations
      }
    });

  } catch (error) {
    console.error('Get learning profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Detect learning style
exports.detectLearningStyle = async (req, res) => {
  try {
    const { uid: userId } = req.user;

    // Get user interactions for learning style analysis
    const interactions = await AIInteraction.findByUserId(userId, 100);
    
    if (interactions.length < 10) {
      return res.json({
        success: true,
        message: 'Not enough interaction data for learning style detection',
        learningStyle: 'visual', // Default
        confidence: 0.5
      });
    }

    // Prepare interaction history for AI analysis
    const interactionHistory = interactions.map(interaction => ({
      type: interaction.interactionType,
      content: interaction.userInput,
      subject: interaction.subject,
      rating: interaction.userFeedback?.rating || null,
      responseTime: interaction.responseTime,
      timestamp: interaction.createdAt
    }));

    // Use AI to detect learning style
    const learningStyleAnalysis = await aiService.detectLearningStyle(userId, interactionHistory);
    
    // Parse learning style from AI response
    const detectedStyle = this.parseLearningStyle(learningStyleAnalysis.content);

    // Update user profile with detected learning style
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      userProfile.learningStyle = detectedStyle.style;
      userProfile.learningPatterns = {
        ...userProfile.learningPatterns,
        detectedPreferences: detectedStyle.preferences
      };
      await userProfile.save();
    }

    res.json({
      success: true,
      learningStyle: detectedStyle.style,
      confidence: detectedStyle.confidence,
      preferences: detectedStyle.preferences,
      recommendations: detectedStyle.recommendations,
      analysis: learningStyleAnalysis.content
    });

  } catch (error) {
    console.error('Detect learning style error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get performance metrics
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { period = 'monthly' } = req.query;

    // Get user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Get recent analytics
    const analytics = await LearningAnalytics.findByUserId(userId, period);
    
    // Get AI interaction effectiveness metrics
    const effectivenessMetrics = await AIInteraction.getEffectivenessMetrics(userId);
    
    // Calculate performance trends
    const performanceTrends = await this.calculatePerformanceTrends(userId, period);

    res.json({
      success: true,
      metrics: {
        overall: {
          score: userProfile.performanceMetrics.overallScore,
          improvementRate: userProfile.performanceMetrics.improvementRate,
          consistencyScore: userProfile.performanceMetrics.consistencyScore
        },
        subjects: userProfile.performanceMetrics.subjectScores,
        engagement: userProfile.engagementMetrics,
        effectiveness: effectivenessMetrics,
        trends: performanceTrends,
        analytics: analytics.length > 0 ? analytics[0] : null
      }
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get engagement statistics
exports.getEngagementStats = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { days = 30 } = req.query;

    // Get user interaction stats
    const interactionStats = await AIInteraction.getUserInteractionStats(userId, parseInt(days));
    
    // Get study material usage stats
    const studyMaterialStats = await StudyMaterial.getUserStudyStats(userId, parseInt(days));
    
    // Get user profile for engagement metrics
    const userProfile = await UserLearningProfile.findByUserId(userId);
    
    // Calculate engagement insights
    const engagementInsights = await this.calculateEngagementInsights(
      interactionStats,
      studyMaterialStats,
      userProfile?.engagementMetrics
    );

    res.json({
      success: true,
      engagement: {
        summary: userProfile?.engagementMetrics || {},
        interactionStats,
        studyMaterialStats,
        insights: engagementInsights,
        recommendations: this.generateEngagementRecommendations(engagementInsights)
      }
    });

  } catch (error) {
    console.error('Get engagement stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Track user interaction
exports.trackInteraction = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { interactionType, data, duration, engagement } = req.body;

    // Get user profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (!userProfile) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found'
      });
    }

    // Update engagement metrics
    if (duration && engagement) {
      userProfile.updateEngagementMetrics(duration, engagement);
    }

    // Track specific interaction patterns
    switch (interactionType) {
      case 'study_session':
        await this.trackStudySession(userProfile, data);
        break;
      case 'practice_completion':
        await this.trackPracticeCompletion(userProfile, data);
        break;
      case 'goal_progress':
        await this.trackGoalProgress(userProfile, data);
        break;
      default:
        console.log(`Unknown interaction type: ${interactionType}`);
    }

    await userProfile.save();

    res.json({
      success: true,
      message: 'Interaction tracked successfully'
    });

  } catch (error) {
    console.error('Track interaction error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate analytics report
exports.generateAnalyticsReport = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { period = 'monthly', includeRecommendations = true } = req.query;

    // Determine date range
    const dateRange = this.getDateRange(period);
    
    // Generate or update analytics
    let analytics = await LearningAnalytics.findOne({
      userId,
      period,
      periodStart: { $gte: dateRange.start },
      periodEnd: { $lte: dateRange.end }
    });

    if (!analytics) {
      analytics = new LearningAnalytics({
        userId,
        period,
        periodStart: dateRange.start,
        periodEnd: dateRange.end
      });
    }
    
    // Ensure userId is set
    analytics.userId = userId;

    // Populate analytics with current data
    await this.populateAnalyticsData(analytics, userId, dateRange);

    // Generate insights and recommendations
    if (includeRecommendations) {
      await this.generateInsightsAndRecommendations(analytics);
    }

    // Update data quality metrics
    analytics.updateDataQuality();

    await analytics.save();

    res.json({
      success: true,
      report: {
        period: analytics.period,
        dateRange: {
          start: analytics.periodStart,
          end: analytics.periodEnd
        },
        metrics: {
          activity: analytics.activityMetrics,
          performance: analytics.performanceMetrics,
          engagement: analytics.engagementMetrics,
          aiInteraction: analytics.aiInteractionAnalytics,
          goals: analytics.goalTracking,
          knowledge: analytics.knowledgeAssessment
        },
        insights: analytics.insights,
        recommendations: analytics.recommendations,
        trends: analytics.comparativeAnalytics.trends,
        dataQuality: analytics.dataQuality
      }
    });

  } catch (error) {
    console.error('Generate analytics report error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper methods
exports.analyzeLearningPatterns = async (interactions) => {
  const patterns = {
    mostActiveTimeOfDay: null,
    averageSessionDuration: 0,
    preferredContentFormat: null,
    attentionSpan: 0
  };

  if (interactions.length === 0) return patterns;

  // Analyze time patterns
  const timeDistribution = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let totalDuration = 0;

  interactions.forEach(interaction => {
    const hour = new Date(interaction.createdAt).getHours();
    if (hour >= 6 && hour < 12) timeDistribution.morning++;
    else if (hour >= 12 && hour < 18) timeDistribution.afternoon++;
    else if (hour >= 18 && hour < 22) timeDistribution.evening++;
    else timeDistribution.night++;

    totalDuration += interaction.responseTime || 0;
  });

  // Find most active time
  const maxTime = Math.max(...Object.values(timeDistribution));
  patterns.mostActiveTimeOfDay = Object.keys(timeDistribution)
    .find(key => timeDistribution[key] === maxTime);

  // Calculate average session duration
  patterns.averageSessionDuration = totalDuration / interactions.length;

  // Analyze content format preferences
  const formatPreferences = {
    tutoring: interactions.filter(i => i.interactionType === 'tutoring').length,
    content_generation: interactions.filter(i => i.interactionType.includes('generation')).length,
    assistance: interactions.filter(i => i.interactionType.includes('assistance')).length
  };

  const maxFormat = Math.max(...Object.values(formatPreferences));
  patterns.preferredContentFormat = Object.keys(formatPreferences)
    .find(key => formatPreferences[key] === maxFormat);

  return patterns;
};

exports.parseLearningStyle = (analysisContent) => {
  const styles = ['visual', 'auditory', 'kinesthetic', 'reading-writing'];
  const content = analysisContent.toLowerCase();
  
  let detectedStyle = 'visual'; // default
  let confidence = 0.5;
  let preferences = [];
  let recommendations = [];

  // Simple parsing - can be enhanced with more sophisticated NLP
  styles.forEach(style => {
    if (content.includes(style)) {
      detectedStyle = style;
      confidence = 0.8;
    }
  });

  // Extract preferences
  if (content.includes('visual')) {
    preferences.push('Prefers visual aids and diagrams');
  }
  if (content.includes('step-by-step')) {
    preferences.push('Benefits from structured, sequential learning');
  }
  if (content.includes('interactive')) {
    preferences.push('Learns well through hands-on activities');
  }

  // Generate recommendations
  recommendations = this.generateLearningStyleRecommendations(detectedStyle);

  return {
    style: detectedStyle,
    confidence,
    preferences,
    recommendations
  };
};

exports.generateLearningStyleRecommendations = (learningStyle) => {
  const recommendations = {
    visual: [
      'Use diagrams and visual aids',
      'Create mind maps and concept maps',
      'Use color coding in notes'
    ],
    auditory: [
      'Listen to explanations and discussions',
      'Use verbal repetition and mnemonics',
      'Participate in group discussions'
    ],
    kinesthetic: [
      'Use hands-on activities and experiments',
      'Take breaks during study sessions',
      'Use physical movement while learning'
    ],
    'reading-writing': [
      'Take detailed notes',
      'Read extensively on topics',
      'Write summaries and outlines'
    ]
  };

  return recommendations[learningStyle] || recommendations.visual;
};

exports.calculatePerformanceTrends = async (userId, period) => {
  const trends = [];
  
  // Get historical analytics
  const analytics = await LearningAnalytics.findByUserId(userId, period);
  
  if (analytics.length < 2) {
    return trends;
  }

  // Compare current with previous period
  const current = analytics[0];
  const previous = analytics[1];

  if (current && previous) {
    const performanceChange = current.performanceMetrics.overallScore - 
                             previous.performanceMetrics.overallScore;
    
    trends.push({
      metric: 'Overall Performance',
      trend: performanceChange > 0 ? 'improving' : 'declining',
      changeRate: performanceChange,
      confidence: 0.8
    });

    const engagementChange = current.engagementMetrics.engagementScore - 
                           previous.engagementMetrics.engagementScore;
    
    trends.push({
      metric: 'Engagement',
      trend: engagementChange > 0 ? 'improving' : 'declining',
      changeRate: engagementChange,
      confidence: 0.7
    });
  }

  return trends;
};

exports.calculateEngagementInsights = async (interactionStats, studyMaterialStats, engagementMetrics) => {
  const insights = [];

  // Analyze interaction patterns
  if (interactionStats.length > 0) {
    const totalInteractions = interactionStats.reduce((sum, stat) => sum + stat.count, 0);
    const avgRating = interactionStats.reduce((sum, stat) => sum + (stat.avgRating || 0), 0) / 
                     interactionStats.length;

    insights.push({
      type: 'interaction_volume',
      message: `You had ${totalInteractions} AI interactions with an average rating of ${avgRating.toFixed(1)}`,
      value: totalInteractions,
      trend: totalInteractions > 50 ? 'high' : 'moderate'
    });
  }

  // Analyze study material usage
  if (studyMaterialStats.length > 0) {
    const totalStudyTime = studyMaterialStats.reduce((sum, stat) => sum + stat.totalTimeSpent, 0);
    
    insights.push({
      type: 'study_time',
      message: `You spent ${Math.round(totalStudyTime / 60)} hours studying`,
      value: totalStudyTime,
      trend: totalStudyTime > 3600 ? 'excellent' : 'good'
    });
  }

  // Analyze engagement metrics
  if (engagementMetrics) {
    insights.push({
      type: 'engagement_score',
      message: `Your engagement score is ${engagementMetrics.averageEngagementScore.toFixed(1)}%`,
      value: engagementMetrics.averageEngagementScore,
      trend: engagementMetrics.averageEngagementScore > 80 ? 'excellent' : 'good'
    });
  }

  return insights;
};

exports.generateEngagementRecommendations = (insights) => {
  const recommendations = [];

  insights.forEach(insight => {
    switch (insight.type) {
      case 'interaction_volume':
        if (insight.trend === 'low') {
          recommendations.push({
            title: 'Increase AI Interaction',
            description: 'Try asking more questions to the AI tutor for better learning outcomes',
            priority: 'medium'
          });
        }
        break;
      case 'study_time':
        if (insight.trend === 'low') {
          recommendations.push({
            title: 'Increase Study Time',
            description: 'Consider dedicating more time to studying for improved performance',
            priority: 'high'
          });
        }
        break;
      case 'engagement_score':
        if (insight.value < 70) {
          recommendations.push({
            title: 'Improve Engagement',
            description: 'Try different learning methods to increase your engagement',
            priority: 'high'
          });
        }
        break;
    }
  });

  return recommendations;
};

exports.getDateRange = (period) => {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'weekly':
      start.setDate(start.getDate() - 7);
      break;
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarterly':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'yearly':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
};

exports.populateAnalyticsData = async (analytics, userId, dateRange) => {
  // Get interactions in date range
  const interactions = await AIInteraction.find({
    userId,
    createdAt: { $gte: dateRange.start, $lte: dateRange.end }
  });

  // Calculate activity metrics
  analytics.activityMetrics = {
    totalStudyTime: interactions.reduce((sum, i) => sum + (i.responseTime || 0), 0),
    totalSessions: interactions.length,
    totalAIInteractions: interactions.length,
    totalQuestionsAsked: interactions.filter(i => i.interactionType === 'tutoring').length
  };

  // Calculate AI interaction analytics with safe division
  const totalInteractions = interactions.length;
  const totalResponseTime = interactions.reduce((sum, i) => sum + (i.responseTime || 0), 0);
  const totalRating = interactions.reduce((sum, i) => sum + (i.userFeedback?.rating || 0), 0);
  const solvedProblems = interactions.filter(i => i.effectiveness?.problemSolved).length;
  
  analytics.aiInteractionAnalytics = {
    totalInteractions: totalInteractions,
    averageResponseTime: totalInteractions > 0 && !isNaN(totalResponseTime / totalInteractions) ? totalResponseTime / totalInteractions : 0,
    averageRating: totalInteractions > 0 && !isNaN(totalRating / totalInteractions) ? totalRating / totalInteractions : 0,
    successRate: totalInteractions > 0 && !isNaN((solvedProblems / totalInteractions) * 100) ? (solvedProblems / totalInteractions) * 100 : 0
  };

  return analytics;
};

exports.generateInsightsAndRecommendations = async (analytics) => {
  // Generate insights based on analytics data
  if (analytics.performanceMetrics.overallScore > 80) {
    analytics.addInsight(
      'achievement',
      'Excellent Performance',
      'Your overall performance score is above 80%, indicating strong learning progress.',
      0.9
    );
  }

  if (analytics.engagementMetrics.engagementScore < 60) {
    analytics.addInsight(
      'concern',
      'Low Engagement',
      'Your engagement score is below 60%, which may impact learning effectiveness.',
      0.8
    );
    
    analytics.addRecommendation(
      'engagement_improvement',
      'Improve Learning Engagement',
      'Try different learning methods and set shorter study sessions to increase engagement.',
      'high'
    );
  }

  if (analytics.aiInteractionAnalytics.averageRating > 4) {
    analytics.addInsight(
      'achievement',
      'High AI Satisfaction',
      'Your average AI interaction rating is above 4/5, indicating effective AI assistance.',
      0.8
    );
  }

  return analytics;
};

exports.trackStudySession = async (userProfile, data) => {
  const { subject, duration, performance } = data;
  
  // Update subject performance
  if (subject && performance) {
    userProfile.updatePerformanceMetrics(subject, performance);
  }
  
  // Update study time
  if (duration) {
    userProfile.engagementMetrics.totalStudyTime += duration;
  }
};

exports.trackPracticeCompletion = async (userProfile, data) => {
  const { subject, score, timeSpent } = data;
  
  if (subject && score) {
    userProfile.updatePerformanceMetrics(subject, score);
  }
  
  if (timeSpent) {
    userProfile.updateEngagementMetrics(timeSpent, score);
  }
};

exports.trackGoalProgress = async (userProfile, data) => {
  const { goalId, progress } = data;
  
  if (goalId && progress !== undefined) {
    userProfile.updateLearningGoalProgress(goalId, progress);
  }
};