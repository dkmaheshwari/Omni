// Learning Analytics Model - Detailed analytics and metrics
const mongoose = require('mongoose');

const learningAnalyticsSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  
  // Time period for analytics
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  
  periodStart: {
    type: Date,
    required: true
  },
  
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Learning activity metrics
  activityMetrics: {
    totalStudyTime: {
      type: Number,
      default: 0
    },
    
    activeStudyDays: {
      type: Number,
      default: 0
    },
    
    averageSessionDuration: {
      type: Number,
      default: 0
    },
    
    totalSessions: {
      type: Number,
      default: 0
    },
    
    totalAIInteractions: {
      type: Number,
      default: 0
    },
    
    totalQuestionsAsked: {
      type: Number,
      default: 0
    },
    
    totalContentGenerated: {
      type: Number,
      default: 0
    }
  },
  
  // Performance metrics
  performanceMetrics: {
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    improvementRate: {
      type: Number,
      default: 0
    },
    
    consistencyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    masteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Subject-specific performance
    subjectPerformance: [{
      subject: String,
      score: Number,
      improvement: Number,
      timeSpent: Number,
      questionsAnswered: Number,
      accuracy: Number
    }],
    
    // Skill development
    skillDevelopment: [{
      skill: String,
      level: Number,
      improvement: Number,
      lastPracticed: Date
    }]
  },
  
  // Engagement metrics
  engagementMetrics: {
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    participationRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    interactionQuality: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    motivationLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Time distribution
    timeDistribution: {
      morning: Number,
      afternoon: Number,
      evening: Number,
      night: Number
    },
    
    // Activity types
    activityDistribution: {
      reading: Number,
      practicing: Number,
      discussing: Number,
      creating: Number,
      reviewing: Number
    }
  },
  
  // Learning patterns
  learningPatterns: {
    preferredLearningTime: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    },
    
    mostProductiveDay: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    
    averageAttentionSpan: {
      type: Number,
      default: 0
    },
    
    breakPattern: {
      frequency: Number,
      duration: Number
    },
    
    difficultyProgression: [{
      date: Date,
      difficulty: String,
      comfort: Number
    }]
  },
  
  // AI interaction analytics
  aiInteractionAnalytics: {
    totalInteractions: {
      type: Number,
      default: 0
    },
    
    averageResponseTime: {
      type: Number,
      default: 0
    },
    
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    
    successRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // By interaction type
    interactionBreakdown: [{
      type: String,
      count: Number,
      avgRating: Number,
      successRate: Number
    }],
    
    // Most helpful AI features
    mostHelpfulFeatures: [{
      feature: String,
      usage: Number,
      satisfaction: Number
    }]
  },
  
  // Goal tracking
  goalTracking: {
    totalGoals: {
      type: Number,
      default: 0
    },
    
    completedGoals: {
      type: Number,
      default: 0
    },
    
    goalsInProgress: {
      type: Number,
      default: 0
    },
    
    overallProgress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Goal details
    goalDetails: [{
      goalId: String,
      title: String,
      progress: Number,
      targetDate: Date,
      actualCompletionDate: Date,
      status: String
    }]
  },
  
  // Knowledge assessment
  knowledgeAssessment: {
    totalKnowledgeAreas: {
      type: Number,
      default: 0
    },
    
    masteredAreas: {
      type: Number,
      default: 0
    },
    
    areasNeedingWork: {
      type: Number,
      default: 0
    },
    
    // Knowledge progression
    knowledgeProgression: [{
      area: String,
      currentLevel: Number,
      previousLevel: Number,
      improvement: Number,
      lastAssessed: Date
    }],
    
    // Skill gaps
    skillGaps: [{
      skill: String,
      currentLevel: Number,
      targetLevel: Number,
      priority: String,
      recommendedActions: [String]
    }]
  },
  
  // Comparative analytics
  comparativeAnalytics: {
    // Compare with previous period
    previousPeriodComparison: {
      studyTimeChange: Number,
      performanceChange: Number,
      engagementChange: Number
    },
    
    // Peer comparison (anonymized)
    peerComparison: {
      studyTimePercentile: Number,
      performancePercentile: Number,
      engagementPercentile: Number
    },
    
    // Trend analysis
    trends: [{
      metric: String,
      trend: String, // 'improving', 'declining', 'stable'
      changeRate: Number,
      confidence: Number
    }]
  },
  
  // Recommendations
  recommendations: [{
    type: {
      type: String,
      enum: ['study_schedule', 'content_focus', 'skill_development', 'engagement_improvement']
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    title: String,
    description: String,
    expectedImpact: String,
    actionItems: [String],
    dueDate: Date,
    implemented: {
      type: Boolean,
      default: false
    }
  }],
  
  // Insights
  insights: [{
    type: {
      type: String,
      enum: ['achievement', 'improvement', 'concern', 'pattern', 'opportunity']
    },
    title: String,
    description: String,
    confidence: Number,
    impact: String,
    createdDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Data quality
  dataQuality: {
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    accuracy: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    dataPoints: {
      type: Number,
      default: 0
    },
    
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Metadata
  metadata: {
    version: {
      type: String,
      default: '1.0'
    },
    
    generatedBy: {
      type: String,
      default: 'system'
    },
    
    processingTime: Number,
    
    dataSourcesUsed: [String]
  }
  
}, {
  timestamps: true,
  collection: 'learning_analytics'
});

// Indexes for performance
learningAnalyticsSchema.index({ userId: 1, period: 1, periodStart: -1 });
learningAnalyticsSchema.index({ periodStart: 1, periodEnd: 1 });
learningAnalyticsSchema.index({ 'performanceMetrics.overallScore': -1 });
learningAnalyticsSchema.index({ 'engagementMetrics.engagementScore': -1 });

// Methods
learningAnalyticsSchema.methods.calculateOverallScore = function() {
  const performance = this.performanceMetrics;
  const engagement = this.engagementMetrics;
  
  // Weighted average of different metrics
  const weights = {
    performance: 0.4,
    engagement: 0.3,
    consistency: 0.2,
    mastery: 0.1
  };
  
  const score = (
    (performance.overallScore * weights.performance) +
    (engagement.engagementScore * weights.engagement) +
    (performance.consistencyScore * weights.consistency) +
    (performance.masteryLevel * weights.mastery)
  );
  
  this.performanceMetrics.overallScore = Math.round(score);
  return this.performanceMetrics.overallScore;
};

learningAnalyticsSchema.methods.addInsight = function(type, title, description, confidence = 0.8) {
  this.insights.push({
    type,
    title,
    description,
    confidence,
    impact: this.calculateInsightImpact(type),
    createdDate: new Date()
  });
};

learningAnalyticsSchema.methods.calculateInsightImpact = function(type) {
  const impactMapping = {
    'achievement': 'positive',
    'improvement': 'positive',
    'concern': 'negative',
    'pattern': 'neutral',
    'opportunity': 'positive'
  };
  
  return impactMapping[type] || 'neutral';
};

learningAnalyticsSchema.methods.addRecommendation = function(type, title, description, priority = 'medium') {
  this.recommendations.push({
    type,
    priority,
    title,
    description,
    expectedImpact: this.calculateRecommendationImpact(type),
    actionItems: this.generateActionItems(type),
    dueDate: this.calculateDueDate(priority),
    implemented: false
  });
};

learningAnalyticsSchema.methods.calculateRecommendationImpact = function(type) {
  const impactMapping = {
    'study_schedule': 'Improve study consistency and time management',
    'content_focus': 'Enhance learning in specific subject areas',
    'skill_development': 'Develop key skills for academic success',
    'engagement_improvement': 'Increase motivation and participation'
  };
  
  return impactMapping[type] || 'General improvement';
};

learningAnalyticsSchema.methods.generateActionItems = function(type) {
  const actionMapping = {
    'study_schedule': [
      'Create a consistent daily study schedule',
      'Set specific time blocks for different subjects',
      'Use time-blocking techniques'
    ],
    'content_focus': [
      'Spend more time on challenging topics',
      'Review fundamental concepts',
      'Practice with additional exercises'
    ],
    'skill_development': [
      'Focus on specific skill practice',
      'Seek feedback on skill application',
      'Use progressive skill-building exercises'
    ],
    'engagement_improvement': [
      'Try different learning methods',
      'Set short-term achievable goals',
      'Reward progress milestones'
    ]
  };
  
  return actionMapping[type] || ['Take action to improve'];
};

learningAnalyticsSchema.methods.calculateDueDate = function(priority) {
  const now = new Date();
  const daysToAdd = {
    'high': 7,
    'medium': 14,
    'low': 30
  };
  
  now.setDate(now.getDate() + (daysToAdd[priority] || 14));
  return now;
};

learningAnalyticsSchema.methods.updateDataQuality = function() {
  const metrics = this.performanceMetrics;
  const engagement = this.engagementMetrics;
  const activity = this.activityMetrics;
  
  // Calculate completeness based on available data
  let completeness = 0;
  let totalFields = 0;
  
  // Check activity metrics
  if (activity.totalStudyTime > 0) completeness += 10;
  if (activity.totalSessions > 0) completeness += 10;
  if (activity.totalAIInteractions > 0) completeness += 10;
  totalFields += 30;
  
  // Check performance metrics
  if (metrics.overallScore > 0) completeness += 20;
  if (metrics.subjectPerformance.length > 0) completeness += 15;
  totalFields += 35;
  
  // Check engagement metrics
  if (engagement.engagementScore > 0) completeness += 20;
  if (engagement.interactionQuality > 0) completeness += 15;
  totalFields += 35;
  
  this.dataQuality.completeness = (completeness / totalFields) * 100;
  this.dataQuality.accuracy = this.calculateAccuracy();
  this.dataQuality.dataPoints = this.countDataPoints();
  this.dataQuality.lastUpdated = new Date();
};

learningAnalyticsSchema.methods.calculateAccuracy = function() {
  // Simple accuracy calculation based on data consistency
  return 95; // Placeholder - would implement actual accuracy calculation
};

learningAnalyticsSchema.methods.countDataPoints = function() {
  return (
    this.activityMetrics.totalSessions +
    this.performanceMetrics.subjectPerformance.length +
    this.aiInteractionAnalytics.totalInteractions +
    this.goalTracking.totalGoals
  );
};

// Static methods
learningAnalyticsSchema.statics.findByUserId = function(userId, period = null) {
  const query = { userId };
  if (period) query.period = period;
  
  return this.find(query).sort({ periodStart: -1 });
};

learningAnalyticsSchema.statics.getLatestAnalytics = function(userId) {
  return this.findOne({ userId }).sort({ periodStart: -1 });
};

learningAnalyticsSchema.statics.generatePeriodAnalytics = function(userId, period, startDate, endDate) {
  return new this({
    userId,
    period,
    periodStart: startDate,
    periodEnd: endDate,
    activityMetrics: {},
    performanceMetrics: {},
    engagementMetrics: {},
    learningPatterns: {},
    aiInteractionAnalytics: {},
    goalTracking: {},
    knowledgeAssessment: {},
    comparativeAnalytics: {},
    recommendations: [],
    insights: [],
    dataQuality: {},
    metadata: {
      version: '1.0',
      generatedBy: 'system',
      processingTime: 0,
      dataSourcesUsed: []
    }
  });
};

// Virtual fields
learningAnalyticsSchema.virtual('isCurrentPeriod').get(function() {
  const now = new Date();
  return now >= this.periodStart && now <= this.periodEnd;
});

learningAnalyticsSchema.virtual('progressScore').get(function() {
  return (
    this.performanceMetrics.overallScore * 0.5 +
    this.engagementMetrics.engagementScore * 0.3 +
    this.goalTracking.overallProgress * 0.2
  );
});

const LearningAnalytics = mongoose.model('LearningAnalytics', learningAnalyticsSchema);

module.exports = LearningAnalytics;