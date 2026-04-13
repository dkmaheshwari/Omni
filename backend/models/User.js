// backend/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true, // ← enforce one-to-one with your Firebase UID
    },
    email: {
      type: String,
      required: true,
    },
    profile: {
      displayName: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      bio: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      university: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      major: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      year: {
        type: String,
        enum: ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'PhD', 'Other'],
      },
      interests: [{
        type: String,
        trim: true,
        maxlength: 50,
      }],
      avatar: {
        type: String, // URL to avatar image
        trim: true,
      },
      isProfileComplete: {
        type: Boolean,
        default: false,
      },
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
        mentions: {
          type: Boolean,
          default: true,
        },
        threadActivity: {
          type: Boolean,
          default: true,
        },
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      ai: {
        enabled: {
          type: Boolean,
          default: true,
        },
        responseStyle: {
          type: String,
          enum: ['concise', 'detailed', 'adaptive'],
          default: 'adaptive',
        },
        autoRespond: {
          type: Boolean,
          default: true,
        },
      },
    },
    activity: {
      lastSeen: {
        type: Date,
        default: Date.now,
      },
      messageCount: {
        type: Number,
        default: 0,
      },
      threadsJoined: {
        type: Number,
        default: 0,
      },
      helpfulVotes: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true, // gives you createdAt / updatedAt
  }
);

module.exports = mongoose.model("User", userSchema);
