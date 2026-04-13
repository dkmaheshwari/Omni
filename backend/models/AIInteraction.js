// AI Interaction Model - Track AI interactions and effectiveness
const mongoose = require('mongoose');

const aiInteractionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  
  threadId: {
    type: String
  },
  
  // Interaction details
  interactionType: {
    type: String,
    enum: [
      'tutoring',
      'content_generation',
      'code_review',
      'writing_assistance',
      'math_solving',
      'research_assistance',
      'general_query',
      'study_guide',
      'quiz',
      'flashcards',
      'practice_problems'
    ],
    required: true
  },
  
  // Input and output
  userInput: {
    type: String,
    required: true
  },
  
  aiResponse: {
    type: String,
    required: true
  },
  
  // AI model information
  modelUsed: {
    type: String,
    required: true
  },
  
  capability: {
    type: String,
    required: true
  },
  
  // Performance metrics
  responseTime: {
    type: Number,
    required: true
  },
  
  tokenUsage: {
    prompt: Number,
    completion: Number,
    total: Number
  },
  
  // Context information
  contextSize: {
    type: Number,
    default: 0
  },
  
  temperature: {
    type: Number,
    default: 0.7
  },
  
  maxTokens: {
    type: Number,
    default: 500
  },
  
  // Subject classification
  subject: {
    type: String,
    trim: true
  },
  
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  
  // User feedback
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    
    helpful: {
      type: Boolean
    },
    
    accurate: {
      type: Boolean
    },
    
    clear: {
      type: Boolean
    },
    
    followUpNeeded: {
      type: Boolean,
      default: false
    },
    
    comments: String,
    
    feedbackDate: Date
  },
  
  // Learning outcome
  learningOutcome: {
    understood: {
      type: Boolean
    },
    
    needsMoreHelp: {
      type: Boolean,
      default: false
    },
    
    topicsLearned: [String],
    
    conceptsReinforced: [String],
    
    skillsImproved: [String]
  },
  
  // Effectiveness metrics
  effectiveness: {
    problemSolved: {
      type: Boolean,
      default: false
    },
    
    learningObjectiveMet: {
      type: Boolean,
      default: false
    },
    
    userSatisfaction: {
      type: Number,
      min: 0,
      max: 100
    },
    
    educationalValue: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Follow-up interactions
  followUpInteractions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIInteraction'
  }],
  
  parentInteraction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AIInteraction'
  },
  
  // Session information
  sessionId: {
    type: String
  },
  
  sessionSequence: {
    type: Number,
    default: 1
  },
  
  // Error handling
  errors: [{
    type: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    location: String,
    deviceType: String
  },
  
  // Status
  status: {
    type: String,
    enum: ['completed', 'failed', 'timeout', 'cancelled'],
    default: 'completed'
  }
  
}, {
  timestamps: true,
  collection: 'ai_interactions',
  suppressReservedKeysWarning: true
});

// Indexes for performance
aiInteractionSchema.index({ userId: 1, createdAt: -1 });
aiInteractionSchema.index({ interactionType: 1 });
aiInteractionSchema.index({ subject: 1 });
aiInteractionSchema.index({ sessionId: 1 });
aiInteractionSchema.index({ 'userFeedback.rating': -1 });
aiInteractionSchema.index({ 'effectiveness.userSatisfaction': -1 });

// Methods
aiInteractionSchema.methods.addUserFeedback = function(feedback) {
  this.userFeedback = {
    ...this.userFeedback,
    ...feedback,
    feedbackDate: new Date()
  };
  
  // Update effectiveness metrics based on feedback
  if (feedback.rating) {
    this.effectiveness.userSatisfaction = (feedback.rating / 5) * 100;
  }
};

aiInteractionSchema.methods.updateLearningOutcome = function(outcome) {
  this.learningOutcome = {
    ...this.learningOutcome,
    ...outcome
  };
  
  // Update effectiveness metrics
  if (outcome.understood) {
    this.effectiveness.problemSolved = true;
    this.effectiveness.learningObjectiveMet = true;
  }
};

aiInteractionSchema.methods.addFollowUp = function(interactionId) {
  this.followUpInteractions.push(interactionId);
};

aiInteractionSchema.methods.recordError = function(errorType, message) {
  this.errors.push({
    type: errorType,
    message: message,
    timestamp: new Date()
  });
  
  if (this.status === 'completed') {
    this.status = 'failed';
  }
};

// Static methods
aiInteractionSchema.statics.findByUserId = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

aiInteractionSchema.statics.findByInteractionType = function(interactionType, limit = 100) {
  return this.find({ interactionType })
    .sort({ createdAt: -1 })
    .limit(limit);
};

aiInteractionSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId })
    .sort({ sessionSequence: 1 });
};

aiInteractionSchema.statics.getEffectivenessMetrics = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$interactionType',
        avgRating: { $avg: '$userFeedback.rating' },
        avgSatisfaction: { $avg: '$effectiveness.userSatisfaction' },
        avgEducationalValue: { $avg: '$effectiveness.educationalValue' },
        totalInteractions: { $sum: 1 },
        successfulInteractions: {
          $sum: { $cond: ['$effectiveness.problemSolved', 1, 0] }
        }
      }
    },
    {
      $addFields: {
        successRate: {
          $divide: ['$successfulInteractions', '$totalInteractions']
        }
      }
    }
  ]);
};

aiInteractionSchema.statics.getUserInteractionStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          interactionType: '$interactionType'
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        avgRating: { $avg: '$userFeedback.rating' }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

aiInteractionSchema.statics.getPopularSubjects = function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        subject: { $exists: true, $ne: null }
      }
    },
    {
      $group: {
        _id: '$subject',
        count: { $sum: 1 },
        avgRating: { $avg: '$userFeedback.rating' },
        avgSatisfaction: { $avg: '$effectiveness.userSatisfaction' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: 20
    }
  ]);
};

// Virtual fields
aiInteractionSchema.virtual('wasSuccessful').get(function() {
  return this.effectiveness.problemSolved && this.effectiveness.learningObjectiveMet;
});

aiInteractionSchema.virtual('responseQuality').get(function() {
  if (this.userFeedback.rating) {
    return (this.userFeedback.rating / 5) * 100;
  }
  return null;
});

const AIInteraction = mongoose.model('AIInteraction', aiInteractionSchema);

module.exports = AIInteraction;