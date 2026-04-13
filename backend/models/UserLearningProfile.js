// User Learning Profile Model
const mongoose = require('mongoose');

const userLearningProfileSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  
  // Learning preferences
  learningStyle: {
    type: String,
    enum: ['visual', 'auditory', 'kinesthetic', 'reading-writing'],
    default: 'visual'
  },
  
  difficultyPreference: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  
  preferredSubjects: [{
    type: String,
    trim: true
  }],
  
  // Learning goals and progress
  learningGoals: [{
    subject: String,
    goal: String,
    targetDate: Date,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active'
    }
  }],
  
  // Performance metrics
  performanceMetrics: {
    overallScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    subjectScores: [{
      subject: String,
      score: Number,
      lastUpdated: Date
    }],
    
    improvementRate: {
      type: Number,
      default: 0
    },
    
    consistencyScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  
  // Learning patterns
  learningPatterns: {
    mostActiveTimeOfDay: {
      type: String,
      enum: ['morning', 'afternoon', 'evening', 'night']
    },
    
    averageSessionDuration: {
      type: Number,
      default: 0
    },
    
    preferredContentFormat: {
      type: String,
      enum: ['text', 'visual', 'interactive', 'mixed']
    },
    
    attentionSpan: {
      type: Number,
      default: 0
    }
  },
  
  // Strengths and weaknesses
  strengths: [{
    category: String,
    description: String,
    confidence: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  
  weaknesses: [{
    category: String,
    description: String,
    improvementSuggestions: [String],
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    }
  }],
  
  // AI tutoring preferences
  tutorPreferences: {
    explanationStyle: {
      type: String,
      enum: ['detailed', 'concise', 'step-by-step', 'conceptual'],
      default: 'step-by-step'
    },
    
    feedbackFrequency: {
      type: String,
      enum: ['immediate', 'after-section', 'end-of-session'],
      default: 'immediate'
    },
    
    challengeLevel: {
      type: String,
      enum: ['comfortable', 'moderate', 'challenging'],
      default: 'moderate'
    }
  },
  
  // Engagement metrics
  engagementMetrics: {
    totalStudyTime: {
      type: Number,
      default: 0
    },
    
    sessionsCompleted: {
      type: Number,
      default: 0
    },
    
    averageEngagementScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    lastActiveDate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Knowledge base
  knowledgeBase: [{
    topic: String,
    proficiencyLevel: {
      type: Number,
      min: 0,
      max: 100
    },
    lastReviewed: Date,
    needsReview: {
      type: Boolean,
      default: false
    }
  }],
  
  // Recommendations
  recommendations: [{
    type: {
      type: String,
      enum: ['content', 'activity', 'strategy', 'resource']
    },
    title: String,
    description: String,
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    implemented: {
      type: Boolean,
      default: false
    },
    createdDate: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Settings
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    
    studyReminders: {
      type: Boolean,
      default: true
    },
    
    progressReports: {
      type: Boolean,
      default: true
    },
    
    dataCollection: {
      type: Boolean,
      default: true
    }
  }
  
}, {
  timestamps: true,
  collection: 'user_learning_profiles'
});

// Indexes for performance (userId already has unique index)
userLearningProfileSchema.index({ 'learningGoals.subject': 1 });
userLearningProfileSchema.index({ 'performanceMetrics.overallScore': -1 });
userLearningProfileSchema.index({ 'engagementMetrics.lastActiveDate': -1 });

// Methods
userLearningProfileSchema.methods.updatePerformanceMetrics = function(subject, score) {
  const subjectIndex = this.performanceMetrics.subjectScores.findIndex(s => s.subject === subject);
  
  if (subjectIndex >= 0) {
    this.performanceMetrics.subjectScores[subjectIndex].score = score;
    this.performanceMetrics.subjectScores[subjectIndex].lastUpdated = new Date();
  } else {
    this.performanceMetrics.subjectScores.push({
      subject,
      score,
      lastUpdated: new Date()
    });
  }
  
  // Recalculate overall score
  const totalScore = this.performanceMetrics.subjectScores.reduce((sum, s) => sum + s.score, 0);
  this.performanceMetrics.overallScore = totalScore / this.performanceMetrics.subjectScores.length;
};

userLearningProfileSchema.methods.addLearningGoal = function(subject, goal, targetDate) {
  this.learningGoals.push({
    subject,
    goal,
    targetDate,
    progress: 0,
    status: 'active'
  });
};

userLearningProfileSchema.methods.updateLearningGoalProgress = function(goalId, progress) {
  const goal = this.learningGoals.id(goalId);
  if (goal) {
    goal.progress = Math.min(100, Math.max(0, progress));
    if (goal.progress >= 100) {
      goal.status = 'completed';
    }
  }
};

userLearningProfileSchema.methods.addRecommendation = function(type, title, description, priority = 'medium') {
  this.recommendations.push({
    type,
    title,
    description,
    priority,
    implemented: false,
    createdDate: new Date()
  });
};

userLearningProfileSchema.methods.updateEngagementMetrics = function(sessionDuration, engagementScore) {
  this.engagementMetrics.totalStudyTime += sessionDuration;
  this.engagementMetrics.sessionsCompleted += 1;
  
  // Update average engagement score
  const currentAvg = this.engagementMetrics.averageEngagementScore;
  const sessions = this.engagementMetrics.sessionsCompleted;
  this.engagementMetrics.averageEngagementScore = 
    (currentAvg * (sessions - 1) + engagementScore) / sessions;
  
  this.engagementMetrics.lastActiveDate = new Date();
};

// Static methods
userLearningProfileSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId });
};

userLearningProfileSchema.statics.createDefaultProfile = function(userId) {
  return new this({
    userId,
    learningStyle: 'visual',
    difficultyPreference: 'intermediate',
    preferredSubjects: [],
    learningGoals: [],
    performanceMetrics: {
      overallScore: 0,
      subjectScores: [],
      improvementRate: 0,
      consistencyScore: 0
    },
    learningPatterns: {},
    strengths: [],
    weaknesses: [],
    tutorPreferences: {
      explanationStyle: 'step-by-step',
      feedbackFrequency: 'immediate',
      challengeLevel: 'moderate'
    },
    engagementMetrics: {
      totalStudyTime: 0,
      sessionsCompleted: 0,
      averageEngagementScore: 0,
      lastActiveDate: new Date()
    },
    knowledgeBase: [],
    recommendations: [],
    settings: {
      notificationsEnabled: true,
      studyReminders: true,
      progressReports: true,
      dataCollection: true
    }
  });
};

const UserLearningProfile = mongoose.model('UserLearningProfile', userLearningProfileSchema);

module.exports = UserLearningProfile;