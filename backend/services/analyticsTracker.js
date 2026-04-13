// Real-time Analytics Tracker - Enhanced tracking for user interactions
const UserLearningProfile = require('../models/UserLearningProfile');
const AIInteraction = require('../models/AIInteraction');
const LearningAnalytics = require('../models/LearningAnalytics');

class AnalyticsTracker {
  constructor() {
    this.sessionCache = new Map(); // Track user sessions in memory
    this.eventQueue = []; // Queue for batch processing
    this.isProcessing = false;
    
    // Start batch processing
    this.startBatchProcessor();
  }

  // Track user session start
  async startSession(userId, sessionType = 'study') {
    const sessionId = `${userId}_${Date.now()}`;
    const session = {
      id: sessionId,
      userId,
      type: sessionType,
      startTime: new Date(),
      events: [],
      isActive: true
    };
    
    this.sessionCache.set(sessionId, session);
    
    // Update user profile last seen
    await this.updateUserLastSeen(userId);
    
    return sessionId;
  }

  // Track user session end
  async endSession(sessionId) {
    const session = this.sessionCache.get(sessionId);
    if (!session) return;
    
    session.endTime = new Date();
    session.isActive = false;
    session.duration = session.endTime - session.startTime;
    
    // Process session data
    await this.processSessionData(session);
    
    // Remove from cache
    this.sessionCache.delete(sessionId);
  }

  // Track specific events within a session
  async trackEvent(sessionId, eventType, eventData) {
    const session = this.sessionCache.get(sessionId);
    if (!session) return;
    
    const event = {
      type: eventType,
      timestamp: new Date(),
      data: eventData,
      sessionId
    };
    
    session.events.push(event);
    
    // Add to event queue for batch processing
    this.eventQueue.push(event);
    
    // Process high-priority events immediately
    if (this.isHighPriorityEvent(eventType)) {
      await this.processEventImmediate(event);
    }
  }

  // Track AI interaction with detailed metrics
  async trackAIInteraction(userId, interactionData) {
    const {
      interactionType,
      userInput,
      aiResponse,
      subject,
      responseTime,
      userFeedback,
      sessionId
    } = interactionData;

    // Create AI interaction record
    const aiInteraction = new AIInteraction({
      userId,
      interactionType,
      userInput,
      aiResponse,
      subject,
      responseTime,
      userFeedback,
      sessionId,
      effectiveness: this.calculateInteractionEffectiveness(interactionData)
    });

    await aiInteraction.save();

    // Update user learning profile
    await this.updateLearningProfile(userId, {
      type: 'ai_interaction',
      subject,
      effectiveness: aiInteraction.effectiveness,
      responseTime,
      userFeedback
    });

    // Track event in session
    if (sessionId) {
      await this.trackEvent(sessionId, 'ai_interaction', {
        interactionType,
        subject,
        effectiveness: aiInteraction.effectiveness,
        responseTime
      });
    }

    return aiInteraction;
  }

  // Track learning progress
  async trackLearningProgress(userId, progressData) {
    const {
      subject,
      topic,
      skillLevel,
      improvementRate,
      timeSpent,
      sessionId
    } = progressData;

    // Update user learning profile
    await this.updateLearningProfile(userId, {
      type: 'learning_progress',
      subject,
      topic,
      skillLevel,
      improvementRate,
      timeSpent
    });

    // Track event in session
    if (sessionId) {
      await this.trackEvent(sessionId, 'learning_progress', {
        subject,
        topic,
        skillLevel,
        improvementRate,
        timeSpent
      });
    }
  }

  // Track study material usage
  async trackStudyMaterialUsage(userId, materialData) {
    const {
      materialType,
      materialId,
      timeSpent,
      completionRate,
      effectiveness,
      sessionId
    } = materialData;

    // Update user learning profile
    await this.updateLearningProfile(userId, {
      type: 'study_material',
      materialType,
      materialId,
      timeSpent,
      completionRate,
      effectiveness
    });

    // Track event in session
    if (sessionId) {
      await this.trackEvent(sessionId, 'study_material_usage', {
        materialType,
        materialId,
        timeSpent,
        completionRate,
        effectiveness
      });
    }
  }

  // Track user engagement metrics
  async trackEngagement(userId, engagementData) {
    const {
      activityType,
      duration,
      interactionCount,
      focusScore,
      sessionId
    } = engagementData;

    // Update user learning profile engagement metrics
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      userProfile.updateEngagementMetrics(duration, focusScore);
      await userProfile.save();
    }

    // Track event in session
    if (sessionId) {
      await this.trackEvent(sessionId, 'engagement', {
        activityType,
        duration,
        interactionCount,
        focusScore
      });
    }
  }

  // Process session data when session ends
  async processSessionData(session) {
    const { userId, type, duration, events } = session;
    
    // Calculate session metrics
    const sessionMetrics = this.calculateSessionMetrics(session);
    
    // Update user learning profile
    await this.updateLearningProfile(userId, {
      type: 'session_complete',
      sessionType: type,
      duration: duration,
      metrics: sessionMetrics
    });

    // Generate insights from session
    await this.generateSessionInsights(session);
  }

  // Calculate session metrics
  calculateSessionMetrics(session) {
    const { events, duration } = session;
    
    const metrics = {
      totalEvents: events.length,
      duration: duration,
      eventTypes: {},
      averageResponseTime: 0,
      engagementScore: 0,
      productivityScore: 0
    };

    // Count event types
    events.forEach(event => {
      metrics.eventTypes[event.type] = (metrics.eventTypes[event.type] || 0) + 1;
    });

    // Calculate average response time for AI interactions
    const aiEvents = events.filter(e => e.type === 'ai_interaction');
    if (aiEvents.length > 0) {
      metrics.averageResponseTime = aiEvents.reduce((sum, e) => 
        sum + (e.data.responseTime || 0), 0) / aiEvents.length;
    }

    // Calculate engagement score (0-100)
    const engagementEvents = events.filter(e => e.type === 'engagement');
    if (engagementEvents.length > 0) {
      metrics.engagementScore = engagementEvents.reduce((sum, e) => 
        sum + (e.data.focusScore || 0), 0) / engagementEvents.length;
    }

    // Calculate productivity score based on learning progress events
    const progressEvents = events.filter(e => e.type === 'learning_progress');
    if (progressEvents.length > 0) {
      metrics.productivityScore = progressEvents.reduce((sum, e) => 
        sum + (e.data.improvementRate || 0), 0) / progressEvents.length;
    }

    return metrics;
  }

  // Generate insights from session data
  async generateSessionInsights(session) {
    const { userId, events, duration } = session;
    const insights = [];

    // Check for high engagement
    const engagementEvents = events.filter(e => e.type === 'engagement');
    if (engagementEvents.length > 0) {
      const avgEngagement = engagementEvents.reduce((sum, e) => 
        sum + (e.data.focusScore || 0), 0) / engagementEvents.length;
      
      if (avgEngagement > 80) {
        insights.push({
          type: 'high_engagement',
          message: 'Excellent focus and engagement in this session',
          score: avgEngagement,
          recommendation: 'Keep up the great work! Your high engagement leads to better learning outcomes.'
        });
      }
    }

    // Check for long study sessions
    if (duration > 2 * 60 * 60 * 1000) { // 2 hours
      insights.push({
        type: 'long_session',
        message: 'Long study session detected',
        duration: duration,
        recommendation: 'Consider taking breaks every 60-90 minutes to maintain focus and retention.'
      });
    }

    // Check for AI interaction patterns
    const aiEvents = events.filter(e => e.type === 'ai_interaction');
    if (aiEvents.length > 20) {
      insights.push({
        type: 'high_ai_usage',
        message: 'High AI interaction in this session',
        count: aiEvents.length,
        recommendation: 'Great use of AI assistance! Try to apply what you learn independently as well.'
      });
    }

    // Store insights in user profile
    if (insights.length > 0) {
      const userProfile = await UserLearningProfile.findByUserId(userId);
      if (userProfile) {
        userProfile.sessionInsights = userProfile.sessionInsights || [];
        userProfile.sessionInsights.push({
          sessionId: session.id,
          timestamp: new Date(),
          insights
        });
        await userProfile.save();
      }
    }
  }

  // Calculate interaction effectiveness
  calculateInteractionEffectiveness(interactionData) {
    const { responseTime, userFeedback, interactionType } = interactionData;
    
    let effectiveness = {
      responseQuality: 0,
      relevance: 0,
      helpfulness: 0,
      problemSolved: false,
      overallScore: 0
    };

    // Base effectiveness on response time (faster = better up to a point)
    if (responseTime) {
      if (responseTime < 2000) effectiveness.responseQuality = 100;
      else if (responseTime < 5000) effectiveness.responseQuality = 80;
      else if (responseTime < 10000) effectiveness.responseQuality = 60;
      else effectiveness.responseQuality = 40;
    }

    // Use user feedback if available
    if (userFeedback) {
      effectiveness.relevance = (userFeedback.rating || 0) * 20;
      effectiveness.helpfulness = (userFeedback.rating || 0) * 20;
      effectiveness.problemSolved = userFeedback.rating >= 4;
    }

    // Calculate overall score
    effectiveness.overallScore = (
      effectiveness.responseQuality * 0.3 +
      effectiveness.relevance * 0.3 +
      effectiveness.helpfulness * 0.4
    );

    return effectiveness;
  }

  // Update user learning profile with new data
  async updateLearningProfile(userId, updateData) {
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (!userProfile) return;

    const { type, subject, ...data } = updateData;

    switch (type) {
      case 'ai_interaction':
        await this.updateAIInteractionMetrics(userProfile, data);
        break;
      case 'learning_progress':
        await this.updateLearningProgressMetrics(userProfile, data);
        break;
      case 'study_material':
        await this.updateStudyMaterialMetrics(userProfile, data);
        break;
      case 'session_complete':
        await this.updateSessionMetrics(userProfile, data);
        break;
    }

    // Update subject-specific metrics
    if (subject) {
      await this.updateSubjectMetrics(userProfile, subject, data);
    }

    await userProfile.save();
  }

  // Update AI interaction metrics in user profile
  async updateAIInteractionMetrics(userProfile, data) {
    const { effectiveness, responseTime, userFeedback } = data;
    
    if (!userProfile.aiInteractionMetrics) {
      userProfile.aiInteractionMetrics = {
        totalInteractions: 0,
        averageResponseTime: 0,
        averageRating: 0,
        effectivenessScore: 0
      };
    }

    const metrics = userProfile.aiInteractionMetrics;
    metrics.totalInteractions += 1;
    
    // Update average response time
    if (responseTime) {
      metrics.averageResponseTime = (
        (metrics.averageResponseTime * (metrics.totalInteractions - 1)) + responseTime
      ) / metrics.totalInteractions;
    }

    // Update average rating
    if (userFeedback && userFeedback.rating) {
      metrics.averageRating = (
        (metrics.averageRating * (metrics.totalInteractions - 1)) + userFeedback.rating
      ) / metrics.totalInteractions;
    }

    // Update effectiveness score
    if (effectiveness) {
      metrics.effectivenessScore = (
        (metrics.effectivenessScore * (metrics.totalInteractions - 1)) + effectiveness.overallScore
      ) / metrics.totalInteractions;
    }
  }

  // Update learning progress metrics
  async updateLearningProgressMetrics(userProfile, data) {
    const { skillLevel, improvementRate, timeSpent } = data;
    
    if (!userProfile.learningProgressMetrics) {
      userProfile.learningProgressMetrics = {
        totalLearningTime: 0,
        averageSkillLevel: 0,
        averageImprovementRate: 0,
        sessionsCompleted: 0
      };
    }

    const metrics = userProfile.learningProgressMetrics;
    metrics.sessionsCompleted += 1;
    
    if (timeSpent) {
      metrics.totalLearningTime += timeSpent;
    }

    if (skillLevel) {
      metrics.averageSkillLevel = (
        (metrics.averageSkillLevel * (metrics.sessionsCompleted - 1)) + skillLevel
      ) / metrics.sessionsCompleted;
    }

    if (improvementRate) {
      metrics.averageImprovementRate = (
        (metrics.averageImprovementRate * (metrics.sessionsCompleted - 1)) + improvementRate
      ) / metrics.sessionsCompleted;
    }
  }

  // Update study material metrics
  async updateStudyMaterialMetrics(userProfile, data) {
    const { materialType, timeSpent, completionRate, effectiveness } = data;
    
    if (!userProfile.studyMaterialMetrics) {
      userProfile.studyMaterialMetrics = {
        totalMaterialsUsed: 0,
        totalTimeSpent: 0,
        averageCompletionRate: 0,
        averageEffectiveness: 0,
        materialTypeUsage: {}
      };
    }

    const metrics = userProfile.studyMaterialMetrics;
    metrics.totalMaterialsUsed += 1;
    
    if (timeSpent) {
      metrics.totalTimeSpent += timeSpent;
    }

    if (completionRate) {
      metrics.averageCompletionRate = (
        (metrics.averageCompletionRate * (metrics.totalMaterialsUsed - 1)) + completionRate
      ) / metrics.totalMaterialsUsed;
    }

    if (effectiveness) {
      metrics.averageEffectiveness = (
        (metrics.averageEffectiveness * (metrics.totalMaterialsUsed - 1)) + effectiveness
      ) / metrics.totalMaterialsUsed;
    }

    // Track material type usage
    if (materialType) {
      metrics.materialTypeUsage[materialType] = (metrics.materialTypeUsage[materialType] || 0) + 1;
    }
  }

  // Update session metrics
  async updateSessionMetrics(userProfile, data) {
    const { sessionType, duration, metrics } = data;
    
    if (!userProfile.sessionMetrics) {
      userProfile.sessionMetrics = {
        totalSessions: 0,
        totalTime: 0,
        averageDuration: 0,
        sessionTypes: {}
      };
    }

    const sessionMetrics = userProfile.sessionMetrics;
    sessionMetrics.totalSessions += 1;
    
    if (duration) {
      sessionMetrics.totalTime += duration;
      sessionMetrics.averageDuration = sessionMetrics.totalTime / sessionMetrics.totalSessions;
    }

    // Track session type
    if (sessionType) {
      sessionMetrics.sessionTypes[sessionType] = (sessionMetrics.sessionTypes[sessionType] || 0) + 1;
    }
  }

  // Update subject-specific metrics
  async updateSubjectMetrics(userProfile, subject, data) {
    if (!userProfile.subjectMetrics) {
      userProfile.subjectMetrics = {};
    }

    if (!userProfile.subjectMetrics[subject]) {
      userProfile.subjectMetrics[subject] = {
        totalTime: 0,
        interactions: 0,
        averagePerformance: 0,
        lastStudied: new Date()
      };
    }

    const subjectMetrics = userProfile.subjectMetrics[subject];
    subjectMetrics.interactions += 1;
    subjectMetrics.lastStudied = new Date();

    if (data.timeSpent) {
      subjectMetrics.totalTime += data.timeSpent;
    }

    if (data.effectiveness && data.effectiveness.overallScore) {
      subjectMetrics.averagePerformance = (
        (subjectMetrics.averagePerformance * (subjectMetrics.interactions - 1)) + 
        data.effectiveness.overallScore
      ) / subjectMetrics.interactions;
    }
  }

  // Update user last seen
  async updateUserLastSeen(userId) {
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      userProfile.lastActivity = new Date();
      await userProfile.save();
    }
  }

  // Check if event is high priority (needs immediate processing)
  isHighPriorityEvent(eventType) {
    const highPriorityEvents = [
      'ai_interaction',
      'learning_progress',
      'session_complete'
    ];
    return highPriorityEvents.includes(eventType);
  }

  // Process high priority events immediately
  async processEventImmediate(event) {
    // Implementation for immediate processing
    console.log(`Processing high priority event: ${event.type}`);
  }

  // Start batch processor for event queue
  startBatchProcessor() {
    setInterval(async () => {
      if (this.eventQueue.length > 0 && !this.isProcessing) {
        this.isProcessing = true;
        await this.processBatchEvents();
        this.isProcessing = false;
      }
    }, 30000); // Process every 30 seconds
  }

  // Process events in batch
  async processBatchEvents() {
    const events = this.eventQueue.splice(0, 100); // Process up to 100 events at a time
    
    for (const event of events) {
      try {
        // Process event based on type
        switch (event.type) {
          case 'engagement':
            await this.processBatchEngagementEvent(event);
            break;
          case 'study_material_usage':
            await this.processBatchStudyMaterialEvent(event);
            break;
          default:
            console.log(`Batch processing event: ${event.type}`);
        }
      } catch (error) {
        console.error('Error processing batch event:', error);
      }
    }
  }

  // Process engagement events in batch
  async processBatchEngagementEvent(event) {
    // Aggregate engagement data and update analytics
    console.log(`Processing engagement event for session: ${event.sessionId}`);
  }

  // Process study material events in batch
  async processBatchStudyMaterialEvent(event) {
    // Aggregate study material usage data
    console.log(`Processing study material event for session: ${event.sessionId}`);
  }

  // Get active sessions for a user
  getActiveSessions(userId) {
    const activeSessions = [];
    for (const [sessionId, session] of this.sessionCache.entries()) {
      if (session.userId === userId && session.isActive) {
        activeSessions.push(session);
      }
    }
    return activeSessions;
  }

  // Get session statistics
  getSessionStats() {
    const stats = {
      totalActiveSessions: this.sessionCache.size,
      eventQueueLength: this.eventQueue.length,
      isProcessing: this.isProcessing
    };
    return stats;
  }
}

// Export singleton instance
module.exports = new AnalyticsTracker();