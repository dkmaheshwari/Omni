// Study Material Model - Generated study materials and resources
const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  
  threadId: {
    type: String
  },
  
  // Material details
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  type: {
    type: String,
    enum: [
      'study_guide',
      'quiz',
      'flashcards',
      'practice_problems',
      'summary',
      'concept_map',
      'cheat_sheet',
      'reference_guide',
      'lesson_plan',
      'worksheet'
    ],
    required: true
  },
  
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  topics: [{
    type: String,
    trim: true
  }],
  
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'intermediate'
  },
  
  // Content
  content: {
    type: String,
    required: true
  },
  
  // For structured content (quizzes, flashcards, etc.)
  structuredContent: {
    // For quizzes
    questions: [{
      question: String,
      options: [String],
      correctAnswer: String,
      explanation: String,
      difficulty: String,
      topic: String
    }],
    
    // For flashcards
    cards: [{
      front: String,
      back: String,
      difficulty: String,
      topic: String
    }],
    
    // For practice problems
    problems: [{
      problem: String,
      solution: String,
      steps: [String],
      difficulty: String,
      topic: String,
      hints: [String]
    }],
    
    // For study guides
    sections: [{
      title: String,
      content: String,
      keyPoints: [String],
      examples: [String]
    }]
  },
  
  // Generation details
  generationDetails: {
    prompt: String,
    modelUsed: String,
    capability: String,
    generationTime: Number,
    tokenUsage: {
      prompt: Number,
      completion: Number,
      total: Number
    }
  },
  
  // Quality metrics
  qualityMetrics: {
    accuracy: {
      type: Number,
      min: 0,
      max: 100
    },
    
    completeness: {
      type: Number,
      min: 0,
      max: 100
    },
    
    clarity: {
      type: Number,
      min: 0,
      max: 100
    },
    
    usefulness: {
      type: Number,
      min: 0,
      max: 100
    },
    
    overall: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // User interaction
  userInteraction: {
    views: {
      type: Number,
      default: 0
    },
    
    downloads: {
      type: Number,
      default: 0
    },
    
    shares: {
      type: Number,
      default: 0
    },
    
    timeSpent: {
      type: Number,
      default: 0
    },
    
    lastAccessed: Date,
    
    bookmarked: {
      type: Boolean,
      default: false
    }
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
    
    wellOrganized: {
      type: Boolean
    },
    
    appropriateDifficulty: {
      type: Boolean
    },
    
    comments: String,
    
    suggestions: String,
    
    feedbackDate: Date
  },
  
  // Learning outcomes
  learningOutcome: {
    conceptsLearned: [String],
    
    skillsImproved: [String],
    
    knowledgeGapsFilled: [String],
    
    completionRate: {
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
    }
  },
  
  // Performance tracking (for quizzes and practice problems)
  performanceTracking: {
    attempts: [{
      attemptDate: Date,
      score: Number,
      timeSpent: Number,
      incorrectAnswers: [String],
      areasForImprovement: [String]
    }],
    
    bestScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    averageScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    improvementRate: {
      type: Number,
      default: 0
    }
  },
  
  // Relationships
  relatedMaterials: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyMaterial'
  }],
  
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyMaterial'
  }],
  
  followUps: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudyMaterial'
  }],
  
  // Metadata
  metadata: {
    estimatedStudyTime: Number,
    
    targetAudience: String,
    
    learningObjectives: [String],
    
    tags: [String],
    
    version: {
      type: Number,
      default: 1
    },
    
    isPublic: {
      type: Boolean,
      default: false
    },
    
    isArchived: {
      type: Boolean,
      default: false
    },
    
    // Spaced repetition data for flashcards
    spacedRepetitionData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Practice problems session data
    practiceData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Template and customization data for enhanced content
    template: String,
    qualityScore: Number,
    completenessScore: Number,
    difficultyAccuracy: Number
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'needs_review'],
    default: 'published'
  }
  
}, {
  timestamps: true,
  collection: 'study_materials'
});

// Indexes for performance
studyMaterialSchema.index({ userId: 1, createdAt: -1 });
studyMaterialSchema.index({ type: 1 });
studyMaterialSchema.index({ subject: 1 });
studyMaterialSchema.index({ topics: 1 });
studyMaterialSchema.index({ difficulty: 1 });
studyMaterialSchema.index({ 'userFeedback.rating': -1 });
studyMaterialSchema.index({ 'qualityMetrics.overall': -1 });

// Methods
studyMaterialSchema.methods.addUserFeedback = function(feedback) {
  this.userFeedback = {
    ...this.userFeedback,
    ...feedback,
    feedbackDate: new Date()
  };
  
  // Update quality metrics based on feedback
  if (feedback.rating) {
    this.qualityMetrics.usefulness = (feedback.rating / 5) * 100;
    this.updateOverallQuality();
  }
};

studyMaterialSchema.methods.updateOverallQuality = function() {
  const metrics = this.qualityMetrics;
  const validMetrics = [
    metrics.accuracy,
    metrics.completeness,
    metrics.clarity,
    metrics.usefulness
  ].filter(metric => metric !== null && metric !== undefined);
  
  if (validMetrics.length > 0) {
    this.qualityMetrics.overall = 
      validMetrics.reduce((sum, metric) => sum + metric, 0) / validMetrics.length;
  }
};

studyMaterialSchema.methods.recordView = function() {
  this.userInteraction.views += 1;
  this.userInteraction.lastAccessed = new Date();
};

studyMaterialSchema.methods.recordDownload = function() {
  this.userInteraction.downloads += 1;
  this.userInteraction.lastAccessed = new Date();
};

studyMaterialSchema.methods.recordShare = function() {
  this.userInteraction.shares += 1;
};

studyMaterialSchema.methods.addTimeSpent = function(timeSpent) {
  this.userInteraction.timeSpent += timeSpent;
  this.userInteraction.lastAccessed = new Date();
};

studyMaterialSchema.methods.addPerformanceAttempt = function(score, timeSpent, incorrectAnswers = []) {
  this.performanceTracking.attempts.push({
    attemptDate: new Date(),
    score: score,
    timeSpent: timeSpent,
    incorrectAnswers: incorrectAnswers,
    areasForImprovement: this.identifyAreasForImprovement(incorrectAnswers)
  });
  
  // Update best score
  if (score > this.performanceTracking.bestScore) {
    this.performanceTracking.bestScore = score;
  }
  
  // Update average score
  const attempts = this.performanceTracking.attempts;
  const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
  this.performanceTracking.averageScore = totalScore / attempts.length;
  
  // Calculate improvement rate
  if (attempts.length > 1) {
    const firstScore = attempts[0].score;
    const latestScore = attempts[attempts.length - 1].score;
    this.performanceTracking.improvementRate = 
      ((latestScore - firstScore) / firstScore) * 100;
  }
};

studyMaterialSchema.methods.identifyAreasForImprovement = function(incorrectAnswers) {
  // Extract topics from incorrect answers for targeted improvement
  const topics = new Set();
  
  if (this.structuredContent && this.structuredContent.questions) {
    this.structuredContent.questions.forEach(question => {
      if (incorrectAnswers.includes(question.question)) {
        topics.add(question.topic);
      }
    });
  }
  
  return Array.from(topics);
};

studyMaterialSchema.methods.updateLearningOutcome = function(outcome) {
  this.learningOutcome = {
    ...this.learningOutcome,
    ...outcome
  };
};

// Static methods
studyMaterialSchema.statics.findByUserId = function(userId, type = null, limit = 50) {
  const query = { userId };
  if (type) query.type = type;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit);
};

studyMaterialSchema.statics.findBySubject = function(subject, difficulty = null, limit = 20) {
  const query = { subject, status: 'published' };
  if (difficulty) query.difficulty = difficulty;
  
  return this.find(query)
    .sort({ 'qualityMetrics.overall': -1 })
    .limit(limit);
};

studyMaterialSchema.statics.findPopularMaterials = function(days = 30, limit = 10) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    createdAt: { $gte: startDate },
    status: 'published'
  })
    .sort({ 'userInteraction.views': -1 })
    .limit(limit);
};

studyMaterialSchema.statics.findHighQualityMaterials = function(minRating = 4, limit = 20) {
  return this.find({
    'userFeedback.rating': { $gte: minRating },
    status: 'published'
  })
    .sort({ 'qualityMetrics.overall': -1 })
    .limit(limit);
};

studyMaterialSchema.statics.getUserStudyStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        userId: userId,
        'userInteraction.lastAccessed': { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalTimeSpent: { $sum: '$userInteraction.timeSpent' },
        avgRating: { $avg: '$userFeedback.rating' },
        avgCompletionRate: { $avg: '$learningOutcome.completionRate' }
      }
    },
    {
      $sort: { totalTimeSpent: -1 }
    }
  ]);
};

// Virtual fields
studyMaterialSchema.virtual('isPopular').get(function() {
  return this.userInteraction.views > 100 || this.userInteraction.downloads > 50;
});

studyMaterialSchema.virtual('isHighQuality').get(function() {
  return this.qualityMetrics.overall >= 80 && this.userFeedback.rating >= 4;
});

studyMaterialSchema.virtual('engagementScore').get(function() {
  const views = this.userInteraction.views;
  const downloads = this.userInteraction.downloads;
  const shares = this.userInteraction.shares;
  const timeSpent = this.userInteraction.timeSpent;
  
  // Calculate engagement score based on different factors
  return (views * 1) + (downloads * 3) + (shares * 5) + (timeSpent * 0.01);
});

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);

module.exports = StudyMaterial;