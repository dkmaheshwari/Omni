const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  getMessages,
  postMessage,
  summarizeThread,
  getMessageStats,
  addReaction,
  uploadFiles,
  downloadFile,
} = require("../controllers/messageController");
const { verifyToken } = require("../middleware/authMiddleware");
const { validateCreateMessage, validateObjectId } = require("../middleware/validation");
const { upload } = require("../middleware/upload");

// AI-specific rate limiting
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 50 : 10, // Higher limit for development
  message: {
    error: 'Too many AI requests, please wait before sending more messages.',
  },
});

// Message rate limiting (more lenient for real-time chat)
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 100 : 20, // Higher limit for development
  message: {
    error: 'Sending messages too quickly, please slow down.',
  },
});

router.get("/stats", verifyToken, getMessageStats);
router.get("/:threadId", verifyToken, validateObjectId('threadId'), getMessages);
router.post("/:threadId", verifyToken, validateCreateMessage, messageLimiter, postMessage);
router.post("/:threadId/summarize", verifyToken, validateObjectId('threadId'), aiLimiter, summarizeThread);
router.get("/:threadId/summarize", verifyToken, validateObjectId('threadId'), aiLimiter, summarizeThread);
router.post("/:messageId/react", verifyToken, validateObjectId('messageId'), addReaction);
router.post("/:threadId/upload", verifyToken, validateObjectId('threadId'), upload.array('files', 5), uploadFiles);
router.get("/:messageId/download/:fileName", verifyToken, validateObjectId('messageId'), downloadFile);

module.exports = router;
