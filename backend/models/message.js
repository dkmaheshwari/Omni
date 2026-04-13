const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    sender: {
      type: String,
      required: true,
    },
    senderEmail: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: function() {
        return !this.attachments || this.attachments.length === 0;
      },
    },
    attachments: [{
      fileName: {
        type: String,
        required: true
      },
      originalName: {
        type: String,
        required: true
      },
      fileType: {
        type: String,
        required: true
      },
      fileSize: {
        type: Number,
        required: true
      },
      filePath: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      },
      isImage: {
        type: Boolean,
        default: false
      },
      thumbnail: {
        type: String // Path to thumbnail for images
      }
    }],
    messageType: {
      type: String,
      enum: ['user', 'ai', 'system'],
      default: 'user',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    reactions: [{
      emoji: {
        type: String,
        required: true,
        maxlength: 10 // Support for emoji characters
      },
      users: [{
        userId: {
          type: String,
          required: true
        },
        email: {
          type: String,
          required: true
        },
        reactedAt: {
          type: Date,
          default: Date.now
        }
      }],
      count: {
        type: Number,
        default: 0
      }
    }]
  },
  { timestamps: true }
);

// Optimized indexes for efficient message queries
messageSchema.index({ threadId: 1, createdAt: -1 }); // For thread message listing (most common)
messageSchema.index({ threadId: 1, createdAt: 1 }); // For chronological order
messageSchema.index({ sender: 1, createdAt: -1 }); // For user's message history
messageSchema.index({ messageType: 1, threadId: 1 }); // For filtering by message type
messageSchema.index({ threadId: 1, messageType: 1, createdAt: -1 }); // For AI message queries
messageSchema.index({ replyTo: 1 }); // For reply lookups
messageSchema.index({ 'reactions.users.userId': 1 }); // For reaction queries

module.exports = mongoose.model("Message", messageSchema);
