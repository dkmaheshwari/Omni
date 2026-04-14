const mongoose = require("mongoose");

const threadDocumentChunkSchema = new mongoose.Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
      index: true,
    },
    sourceMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      required: true,
      index: true,
    },
    uploaderId: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    tokenEstimate: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

threadDocumentChunkSchema.index({ threadId: 1, createdAt: -1 });
threadDocumentChunkSchema.index({ threadId: 1, fileName: 1, chunkIndex: 1 });

module.exports = mongoose.model(
  "ThreadDocumentChunk",
  threadDocumentChunkSchema,
);
