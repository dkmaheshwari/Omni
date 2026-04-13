const mongoose = require("mongoose");

const threadSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    participants: [
      {
        userId: {
          type: String, // Firebase UID
          required: true,
        },
        email: {
          type: String,
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: {
          type: String,
          enum: ['owner', 'member'],
          default: 'member',
        }
      },
    ],
    createdBy: {
      type: String, // Firebase UID
      required: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    messageCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ThreadCategory',
      required: false,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: 30,
    }],
    metrics: {
      views: {
        type: Number,
        default: 0,
      },
      uniqueViewers: [{
        userId: String,
        viewedAt: {
          type: Date,
          default: Date.now,
        }
      }],
      engagement: {
        type: Number,
        default: 0, // Calculated based on messages, participants, etc.
      },
      averageResponseTime: {
        type: Number,
        default: 0, // In minutes
      },
      helpfulnessScore: {
        type: Number,
        default: 0, // Based on user ratings/votes
      }
    },
    searchKeywords: [{
      type: String,
      trim: true,
    }],
    isArchived: {
      type: Boolean,
      default: false,
    },
    archiveReason: {
      type: String,
      trim: true,
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
threadSchema.index({ category: 1, isPublic: 1, isArchived: 1 });
threadSchema.index({ tags: 1 });
threadSchema.index({ searchKeywords: 1 });
threadSchema.index({ lastActivity: -1 });
threadSchema.index({ 'metrics.engagement': -1 });
threadSchema.index({ createdBy: 1 });
threadSchema.index({ isPublic: 1, lastActivity: -1 });

// Text index for search
threadSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text', 
  searchKeywords: 'text' 
});

// Middleware to update search keywords and metrics
threadSchema.pre('save', function(next) {
  // Generate search keywords from title and description
  const keywords = [];
  
  // Extract words from title and description
  const text = (this.title + ' ' + this.description).toLowerCase();
  const words = text.match(/\b\w+\b/g) || [];
  
  // Add meaningful words (more than 2 characters)
  words.forEach(word => {
    if (word.length > 2 && !keywords.includes(word)) {
      keywords.push(word);
    }
  });
  
  // Add tags as keywords
  this.tags.forEach(tag => {
    const tagWords = tag.toLowerCase().split(' ');
    tagWords.forEach(word => {
      if (word.length > 2 && !keywords.includes(word)) {
        keywords.push(word);
      }
    });
  });
  
  this.searchKeywords = keywords;
  
  // Calculate engagement score
  this.metrics.engagement = this.calculateEngagement();
  
  next();
});

// Method to calculate engagement score
threadSchema.methods.calculateEngagement = function() {
  const baseScore = this.messageCount * 2;
  const participantScore = this.participants.length * 5;
  const viewScore = this.metrics.views * 0.5;
  const helpfulnessScore = this.metrics.helpfulnessScore * 10;
  
  // Time decay factor (newer threads get slight boost)
  const daysSinceCreation = Math.max(1, (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  const timeFactor = Math.max(0.1, 1 / Math.log(daysSinceCreation + 1));
  
  return Math.round((baseScore + participantScore + viewScore + helpfulnessScore) * timeFactor);
};

// Method to track view
threadSchema.methods.trackView = function(userId) {
  // Increment total views
  this.metrics.views += 1;
  
  // Add to unique viewers if not already viewed
  const hasViewed = this.metrics.uniqueViewers.some(viewer => viewer.userId === userId);
  if (!hasViewed) {
    this.metrics.uniqueViewers.push({ userId, viewedAt: new Date() });
  }
  
  return this.save();
};

module.exports = mongoose.model("Thread", threadSchema);
