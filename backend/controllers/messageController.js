const Message = require("../models/message");
const Thread = require("../models/thread");
const { shouldAIRespond } = require("../utils/aiDecisionEngine");
const groqService = require("../services/groqService");
const path = require("path");
const fs = require("fs");
const {
  isImage,
  getFileCategory,
  formatFileSize,
} = require("../middleware/upload");
const {
  sanitizeSearchQuery,
  sanitizeMessageType,
  sanitizeDate,
  isValidObjectId,
  sanitizeTextInput,
} = require("../utils/inputSanitizer");

// REFACTOR: Helper function for thread authorization
const validateThreadAccess = async (threadId, userId, userEmail) => {
  const thread = await Thread.findById(threadId).populate("category");

  if (!thread) {
    return { authorized: false, thread: null, error: "Thread not found" };
  }

  let isParticipant = thread.participants.some((p) => p.userId === userId);

  // Auto-fix: If user is the creator but not in participants, add them
  if (!isParticipant && thread.createdBy === userId) {
    console.log(`Auto-fixing: Adding thread creator ${userId} to participants`);
    thread.participants.push({
      userId,
      email: userEmail,
      role: "owner",
      joinedAt: new Date(),
    });
    await thread.save();
    isParticipant = true;
  }

  if (!isParticipant) {
    return {
      authorized: false,
      thread,
      error: "Not authorized to post in this thread",
    };
  }

  return { authorized: true, thread, error: null };
};

// REFACTOR: Helper function for creating and saving user message
const createUserMessage = async (threadId, senderId, senderEmail, content) => {
  // Save user message with sanitized content
  const userMessage = await Message.create({
    threadId,
    sender: senderId,
    senderEmail: senderEmail,
    text: content,
    messageType: "user",
  });

  // Update thread activity and message count
  await Thread.findByIdAndUpdate(threadId, {
    lastActivity: new Date(),
    $inc: { messageCount: 1 },
  });

  return userMessage;
};

// REFACTOR: Helper function for Socket.IO broadcasting
const broadcastMessage = (io, threadId, message, messageType) => {
  if (!io) return;

  const messageData = {
    message: {
      _id: message._id,
      threadId: message.threadId,
      sender: message.sender,
      senderEmail: message.senderEmail,
      text: message.text,
      messageType: message.messageType,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    },
    threadId: threadId,
    messageType: messageType,
  };

  const roomName = `thread:${threadId}`;
  io.to(roomName).emit("new-message", messageData);

  // Debug logging
  const room = io.sockets.adapter.rooms.get(roomName);
  const clientCount = room ? room.size : 0;
  console.log(
    `📡 Broadcasted ${messageType} message to room "${roomName}" with ${clientCount} clients`,
  );

  if (clientCount === 0) {
    console.warn(
      `⚠️ No clients in room "${roomName}" - message may not be delivered!`,
    );
  }
};

// REFACTOR: Helper function for AI response generation
const generateAIResponse = async (
  thread,
  aiContext,
  conversationHistory,
  threadId,
) => {
  const systemPrompt = generateContextAwareSystemPrompt(thread, aiContext);

  console.log(
    `🤖 Generating AI response for thread ${threadId} with context: ${aiContext.behaviorMode}`,
  );

  const aiResponseData = await groqService.generateResponse({
    messages: conversationHistory,
    model: process.env.GROQ_MODEL_NAME || "llama-3.3-70b-versatile",
    maxTokens: getContextAwareTokenLimit(aiContext),
    temperature: getContextAwareTemperature(aiContext),
    systemPrompt: systemPrompt,
    context: {
      threadId: threadId,
      behaviorMode: aiContext.behaviorMode,
      responseType: aiContext.responseType,
      safetyMode: true,
    },
  });

  const aiResponse = aiResponseData.content;

  // Save AI response
  const aiMessage = await Message.create({
    threadId,
    sender: "ai-assistant",
    senderEmail: "AI Assistant",
    text: aiResponse,
    messageType: "ai",
  });

  // Update thread activity for AI message
  await Thread.findByIdAndUpdate(threadId, {
    lastActivity: new Date(),
    $inc: { messageCount: 1 },
  });

  return aiMessage;
};

// CRITICAL FIX: Enhanced AI Response Logic with Context Awareness
const determineAIResponseNeed = async (
  thread,
  messageContent,
  messageHistory = [],
) => {
  const participantCount = thread.participants.length;

  // Build context for enhanced AI decision making
  const contextOptions = {
    threadHistory: messageHistory.slice(-10), // Last 10 messages for context
    lastAIResponse:
      messageHistory.find((msg) => msg.messageType === "ai")?.createdAt || null,
    threadType: thread.category?.name?.toLowerCase() || "general",
    userLearningLevel: "intermediate", // Could be derived from user profile
    isStudySession:
      thread.title?.toLowerCase().includes("study") ||
      thread.description?.toLowerCase().includes("study") ||
      thread.tags?.some((tag) =>
        ["study", "learning", "homework"].includes(tag.toLowerCase()),
      ) ||
      false,
  };

  // Use the enhanced intelligent decision engine
  const decision = shouldAIRespond(
    messageContent,
    participantCount,
    contextOptions,
  );

  // Return both the boolean decision and the full context for response customization
  return {
    shouldRespond:
      typeof decision === "boolean" ? decision : decision.shouldRespond,
    context:
      typeof decision === "object"
        ? decision
        : {
            reason: "Legacy decision logic",
            responseType: "general",
            behaviorMode:
              participantCount === 1
                ? "personal_tutor"
                : "collaborative_assistant",
          },
  };
};

// Get all messages for a thread
const getMessages = async (req, res) => {
  const { threadId } = req.params;
  const { since, page = 1, limit = 50 } = req.query; // Enhanced with pagination
  const userId = req.user.uid;

  try {
    // CRITICAL FIX: Add retry logic for race condition between joinThread and getMessages
    const maxRetries = 3;
    const retryDelay = 500; // 500ms between retries

    let thread = null;
    let isParticipant = false;
    let attempt = 0;

    while (attempt < maxRetries && !isParticipant) {
      attempt++;

      // Verify user is participant in thread
      thread = await Thread.findById(threadId).populate("category");
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }

      isParticipant = thread.participants.some((p) => p.userId === userId);

      // Auto-fix: If user is the creator but not in participants, add them
      if (!isParticipant && thread.createdBy === userId) {
        console.log(
          `Auto-fixing getMessages: Adding thread creator ${userId} (${req.user.email}) to participants`,
        );
        thread.participants.push({
          userId,
          email: req.user.email,
          role: "owner",
          joinedAt: new Date(),
        });
        await thread.save();
        isParticipant = true;
        console.log(`✅ Auto-fix successful: User added to thread ${threadId}`);
        break;
      }

      // If not participant and not the last attempt, wait and retry
      if (!isParticipant && attempt < maxRetries) {
        console.log(
          `⏰ Attempt ${attempt}/${maxRetries}: User ${userId} not yet participant in thread ${threadId}, retrying in ${retryDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      // If participant found, break out of retry loop
      if (isParticipant) {
        console.log(
          `✅ User ${userId} found as participant in thread ${threadId} on attempt ${attempt}`,
        );
        break;
      }
    }

    // Final authorization check after all retries
    if (!isParticipant) {
      console.log(
        `❌ 403 Error: User ${userId} not participant in thread ${threadId} after ${maxRetries} attempts`,
      );
      console.log(
        `Thread participants:`,
        thread.participants.map((p) => ({ userId: p.userId, email: p.email })),
      );
      console.log(
        `User details: userId=${userId}, email=${req.user.email}, isOwner=${thread.createdBy === userId}`,
      );

      // CRITICAL FIX: Return more specific error that won't trigger logout
      return res.status(403).json({
        message: "Not authorized to view this thread",
        threadId,
        userId,
        isOwner: thread.createdBy === userId,
        errorType: "THREAD_ACCESS_DENIED", // Specific error type to prevent logout
        retryAfter: 1000, // Suggest retry after 1 second
        suggestions: [
          "You may need to join this thread first",
          "The thread owner may need to add you as a participant",
          "Try refreshing the page and joining again",
        ],
      });
    }

    if (since) {
      // Polling mode - get messages since timestamp
      const messages = await Message.find({
        threadId,
        createdAt: { $gt: new Date(since) },
      }).sort({ createdAt: 1 });

      const response = {
        messages,
        thread: {
          id: thread._id,
          title: thread.title,
          description: thread.description,
          participants: thread.participants,
          messageCount: thread.messageCount,
          lastActivity: thread.lastActivity,
        },
      };

      res.json(response);
    } else {
      // Pagination mode - get paginated messages
      const skip = (page - 1) * limit;
      const messages = await Message.find({ threadId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count for pagination
      const totalMessages = await Message.countDocuments({ threadId });
      const totalPages = Math.ceil(totalMessages / limit);

      // Reverse to get chronological order (oldest first)
      const messagesInOrder = messages.reverse();

      const response = {
        messages: messagesInOrder,
        thread: {
          id: thread._id,
          title: thread.title,
          description: thread.description,
          participants: thread.participants,
          messageCount: thread.messageCount,
          lastActivity: thread.lastActivity,
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMessages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      res.json(response);
    }
  } catch (error) {
    console.error("Failed to retrieve messages:", error);
    res
      .status(500)
      .json({ message: "Failed to retrieve messages", error: error.message });
  }
};

// REFACTOR: Simplified post message function using helper functions
const postMessage = async (req, res) => {
  const { threadId } = req.params;
  const { content } = req.body;

  // SECURITY FIX: Enhanced input validation and sanitization
  if (!isValidObjectId(threadId)) {
    return res.status(400).json({ message: "Invalid thread ID format" });
  }

  // Sanitize message content
  const contentValidation = sanitizeTextInput(content, {
    maxLength: 5000,
    minLength: 1,
    allowHtml: false,
    trimWhitespace: true,
  });

  if (!contentValidation.isValid) {
    return res.status(400).json({
      message: "Invalid message content",
      error: contentValidation.error,
    });
  }

  const sanitizedContent = contentValidation.sanitized;
  const user = req.user;
  const senderName = user?.email || "Anonymous";
  const senderId = user?.uid;

  try {
    // Validate thread access using helper function
    const accessResult = await validateThreadAccess(
      threadId,
      senderId,
      senderName,
    );
    if (!accessResult.authorized) {
      const statusCode = accessResult.error === "Thread not found" ? 404 : 403;
      return res.status(statusCode).json({ message: accessResult.error });
    }

    const thread = accessResult.thread;

    // Create and save user message using helper function
    const userMessage = await createUserMessage(
      threadId,
      senderId,
      senderName,
      sanitizedContent,
    );

    // Broadcast user message using helper function
    const io = req.app.get("io");
    broadcastMessage(io, threadId, userMessage, "user");

    // CRITICAL FIX: Get conversation context first for enhanced AI decision
    const recentMessages = await Message.find({ threadId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("threadId", "title description");

    // Check if AI should respond with enhanced context awareness using sanitized content
    const aiDecision = await determineAIResponseNeed(
      thread,
      sanitizedContent,
      recentMessages,
    );
    console.log(
      `🤖 AI Response Decision: ${aiDecision.shouldRespond ? "YES" : "NO"} for message: "${sanitizedContent.substring(0, 50)}..."`,
    );
    console.log(
      `🎯 AI Context: ${aiDecision.context.reason} | Mode: ${aiDecision.context.behaviorMode} | Type: ${aiDecision.context.responseType}`,
    );

    if (!aiDecision.shouldRespond) {
      // Return only user message, no AI response
      return res.status(201).json({
        userMessage,
        aiMessage: null,
        aiContext: aiDecision.context,
      });
    }

    // Use recent messages for AI response (reverse to chronological order)
    const messages = recentMessages.reverse();

    // Build conversation context with proper formatting
    const conversationHistory = messages.map((msg) => {
      const role = msg.messageType === "ai" ? "assistant" : "user";
      return {
        role,
        content: msg.text, // Don't add sender prefix - the role already indicates who's speaking
      };
    });

    // Generate AI response using helper function
    try {
      const aiMessage = await generateAIResponse(
        thread,
        aiDecision.context,
        conversationHistory,
        threadId,
      );

      // Broadcast AI message using helper function
      broadcastMessage(io, threadId, aiMessage, "ai");

      // Return both user message and AI response with context
      res.status(201).json({
        userMessage,
        aiMessage,
        aiContext: aiDecision.context,
      });
    } catch (aiError) {
      console.error("AI response failed:", aiError);
      // Return user message even if AI fails
      res.status(201).json({ userMessage, aiMessage: null });
    }
  } catch (error) {
    console.error("Message posting failed:", error);
    res
      .status(500)
      .json({ message: "Failed to post message", error: error.message });
  }
};

// Summarize thread using Groq Llama 3
const summarizeThread = async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  try {
    // Verify user is participant in thread
    const thread = await Thread.findById(threadId).populate("category");
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "Not authorized to summarize this thread" });
    }

    const messages = await Message.find({ threadId }).sort({ createdAt: 1 });

    if (messages.length === 0) {
      return res.status(400).json({ message: "No messages to summarize" });
    }

    // Create context using proper message format
    const context = messages
      .map((msg) => {
        const sender =
          msg.messageType === "ai"
            ? "AI Assistant"
            : msg.senderEmail || msg.sender;
        return `${sender}: ${msg.text}`;
      })
      .join("\n");

    const aiResponseData = await groqService.generateResponse({
      messages: [
        {
          role: "user",
          content: `Please summarize the following educational discussion thread titled "${thread.title}":\n\n${context}`,
        },
      ],
      model: process.env.GROQ_MODEL_NAME || "llama-3.3-70b-versatile",
      maxTokens: 500,
      temperature: 0.7,
      systemPrompt:
        "You are PeerGenius AI, a helpful educational assistant. Create a concise, well-structured summary of the conversation that highlights key learning points, questions discussed, and important insights. Format your response as bullet points for easy reading.",
      context: {
        threadId: threadId,
        responseType: "summary",
        safetyMode: true,
      },
    });

    const aiSummary = aiResponseData.content;

    // Create summary message with proper schema
    const summaryMessage = await Message.create({
      threadId,
      sender: "ai-assistant",
      senderEmail: "AI Assistant",
      text: aiSummary,
      messageType: "system",
    });

    // Update thread activity
    await Thread.findByIdAndUpdate(threadId, {
      lastActivity: new Date(),
      $inc: { messageCount: 1 },
    });

    res.status(201).json(summaryMessage);
  } catch (error) {
    console.error("Summary error:", error);
    res
      .status(500)
      .json({ message: "Failed to summarize thread", error: error.message });
  }
};

// Get user message statistics
const getMessageStats = async (req, res) => {
  const userId = req.user.uid;

  try {
    // Count total messages sent by user
    const messageCount = await Message.countDocuments({
      sender: userId,
    });

    // Count AI interactions (messages where user gets AI response)
    const aiInteractions = await Message.countDocuments({
      sender: userId,
      messageType: "user",
    });

    res.json({
      messageCount,
      aiInteractions,
    });
  } catch (error) {
    console.error("Failed to get message stats:", error);
    res.status(500).json({
      message: "Failed to get message stats",
      error: error.message,
    });
  }
};

// Add reaction to a message
const addReaction = async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.uid;
  const userEmail = req.user.email;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Check if user is participant in the thread
    const thread = await Thread.findById(message.threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "Not authorized to react to this message" });
    }

    // Find existing reaction for this emoji
    let existingReaction = message.reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      // Check if user already reacted with this emoji
      const userReactionIndex = existingReaction.users.findIndex(
        (u) => u.userId === userId,
      );

      if (userReactionIndex >= 0) {
        // Remove user's reaction
        existingReaction.users.splice(userReactionIndex, 1);
        existingReaction.count = existingReaction.users.length;

        // Remove reaction if no users left
        if (existingReaction.count === 0) {
          message.reactions = message.reactions.filter(
            (r) => r.emoji !== emoji,
          );
        }
      } else {
        // Add user's reaction
        existingReaction.users.push({ userId, email: userEmail });
        existingReaction.count = existingReaction.users.length;
      }
    } else {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [{ userId, email: userEmail }],
        count: 1,
      });
    }

    await message.save();

    // Broadcast reaction update to all users in the thread room
    const io = req.app.get("io");
    if (io) {
      io.to(`thread:${message.threadId}`).emit("message-reaction", {
        messageId: message._id,
        reactions: message.reactions,
        threadId: message.threadId,
      });
      console.log(`📡 Broadcasted reaction update for message ${messageId}`);
    }

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error("Reaction failed:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload files with message
const uploadFiles = async (req, res) => {
  const { threadId } = req.params;
  const { content = "" } = req.body;
  const files = req.files;

  // SECURITY FIX: Validate inputs
  if (!isValidObjectId(threadId)) {
    return res.status(400).json({ message: "Invalid thread ID format" });
  }

  // Sanitize content if provided
  let sanitizedContent = "";
  if (content && content.trim()) {
    const contentValidation = sanitizeTextInput(content, {
      maxLength: 1000,
      minLength: 0,
      allowHtml: false,
      trimWhitespace: true,
    });

    if (!contentValidation.isValid) {
      return res.status(400).json({
        message: "Invalid message content",
        error: contentValidation.error,
      });
    }

    sanitizedContent = contentValidation.sanitized;
  }

  const user = req.user;
  const senderName = user?.email || "Anonymous";
  const senderId = user?.uid;

  try {
    // Verify user is participant in thread
    const thread = await Thread.findById(threadId).populate("category");
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    let isParticipant = thread.participants.some((p) => p.userId === senderId);

    // Auto-fix: If user is the creator but not in participants, add them
    if (!isParticipant && thread.createdBy === senderId) {
      console.log(
        `Auto-fixing uploadFiles: Adding thread creator ${senderId} to participants`,
      );
      thread.participants.push({
        userId: senderId,
        email: senderName,
        role: "owner",
        joinedAt: new Date(),
      });
      await thread.save();
      isParticipant = true;
    }

    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "Not authorized to upload files to this thread" });
    }

    // Validate that we have files or content
    if (!files || files.length === 0) {
      if (!content.trim()) {
        return res
          .status(400)
          .json({ message: "Either files or message content is required" });
      }
    }

    // Process uploaded files
    const attachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const attachment = {
          fileName: file.filename,
          originalName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          filePath: file.path,
          isImage: isImage(file.mimetype),
          uploadedAt: new Date(),
        };
        attachments.push(attachment);
      }
    }

    // Create message with attachments using sanitized content
    const message = await Message.create({
      threadId,
      sender: senderId,
      senderEmail: senderName,
      text:
        sanitizedContent ||
        (attachments.length > 0 ? `Shared ${attachments.length} file(s)` : ""),
      messageType: "user",
      attachments: attachments,
    });

    // Update thread activity and message count
    await Thread.findByIdAndUpdate(threadId, {
      lastActivity: new Date(),
      $inc: { messageCount: 1 },
    });

    // Broadcast new message to all users in the thread room via Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.to(`thread:${threadId}`).emit("new-message", {
        message: message,
        threadId: threadId,
      });
      console.log(`📡 Broadcasted file message to thread:${threadId}`);
    }

    res.status(201).json({
      message: "Files uploaded successfully",
      data: message,
      attachments: attachments.length,
    });
  } catch (error) {
    console.error("File upload failed:", error);

    // Clean up uploaded files if database save failed
    if (files && files.length > 0) {
      files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ message: "File upload failed" });
  }
};

// Download/serve uploaded files
const downloadFile = async (req, res) => {
  const { messageId, fileName } = req.params;
  const userId = req.user.uid;

  try {
    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // Verify user is participant in thread
    const thread = await Thread.findById(message.threadId);
    if (!thread) {
      return res.status(404).json({ message: "Thread not found" });
    }

    const isParticipant = thread.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      return res
        .status(403)
        .json({ message: "Not authorized to download this file" });
    }

    // Find the attachment
    const attachment = message.attachments.find(
      (att) => att.fileName === fileName,
    );
    if (!attachment) {
      return res.status(404).json({ message: "File not found" });
    }

    // Check if file exists
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ message: "File no longer exists" });
    }

    // Set appropriate headers
    res.setHeader("Content-Type", attachment.fileType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${attachment.originalName}"`,
    );
    res.setHeader("Content-Length", attachment.fileSize);

    // Stream the file
    const fileStream = fs.createReadStream(attachment.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error("File download failed:", error);
    res.status(500).json({ message: "File download failed" });
  }
};

// CRITICAL FIX: Context-aware AI response customization helpers
function generateContextAwareSystemPrompt(thread, aiContext) {
  const participantCount = thread.participants.length;
  const { behaviorMode, responseType } = aiContext;

  let basePrompt = `You are PeerGenius AI, an intelligent educational assistant designed to help students learn effectively.`;

  // Customize prompt based on behavior mode
  switch (behaviorMode) {
    case "personal_tutor":
      basePrompt += `\n\nPERSONAL TUTORING MODE:
      - You are in one-on-one tutoring with a student
      - Be patient, encouraging, and thorough in explanations
      - Ask follow-up questions to ensure understanding
      - Provide step-by-step guidance when needed
      - Adapt your teaching style to the student's responses`;
      break;

    case "collaborative_assistant":
      basePrompt += `\n\nCOLLABORATIVE MODE:
      - You are assisting a group of ${participantCount} students
      - Facilitate productive discussion and learning
      - Encourage peer-to-peer learning when appropriate
      - Provide guidance without dominating the conversation
      - Acknowledge different perspectives when multiple students participate`;
      break;

    case "facilitating_tutor":
      basePrompt += `\n\nFACILITATING MODE:
      - Guide group learning and problem-solving
      - Ask questions that encourage critical thinking
      - Help students build on each other's ideas
      - Provide hints rather than direct answers when possible`;
      break;

    case "expert_consultant":
      basePrompt += `\n\nEXPERT MODE:
      - Provide authoritative technical or academic assistance
      - Focus on accuracy and detailed explanations
      - Reference relevant concepts and principles
      - Suggest best practices and additional resources`;
      break;

    default:
      basePrompt += `\n\nSTANDARD MODE:
      - Provide helpful, educational responses
      - Encourage learning and academic growth
      - Be supportive and constructive`;
  }

  // Add response type specific guidance
  switch (responseType) {
    case "tutoring":
      basePrompt += `\n\nFocus on teaching and explaining concepts clearly.`;
      break;
    case "technical_assistance":
      basePrompt += `\n\nProvide precise technical help with detailed solutions.`;
      break;
    case "educational":
      basePrompt += `\n\nEmphasize learning outcomes and conceptual understanding.`;
      break;
  }

  basePrompt += `\n\nThread Context:
  - Title: "${thread.title}"
  ${thread.description ? `- Description: "${thread.description}"` : ""}
  - Participants: ${participantCount} ${participantCount === 1 ? "student" : "students"}
  
  Guidelines:
  - Keep responses concise but informative (aim for 200-400 words)
  - Use clear, accessible language appropriate for students
  - Encourage active learning and critical thinking
  - Be supportive and constructive in all interactions`;

  return basePrompt;
}

function getContextAwareTokenLimit(aiContext) {
  const { responseType, behaviorMode } = aiContext;

  // Adjust token limits based on context
  if (
    responseType === "technical_assistance" ||
    behaviorMode === "expert_consultant"
  ) {
    return 600; // More detailed technical responses
  }

  if (behaviorMode === "personal_tutor") {
    return 500; // Thorough explanations for individual students
  }

  if (
    behaviorMode === "collaborative_assistant" ||
    behaviorMode === "facilitating_tutor"
  ) {
    return 350; // Concise to not dominate group conversations
  }

  return 400; // Default
}

function getContextAwareTemperature(aiContext) {
  const { responseType, behaviorMode } = aiContext;

  // Adjust creativity/consistency based on context
  if (
    responseType === "technical_assistance" ||
    behaviorMode === "expert_consultant"
  ) {
    return 0.3; // More consistent, factual responses
  }

  if (behaviorMode === "personal_tutor") {
    return 0.7; // More engaging and adaptive
  }

  if (behaviorMode === "facilitating_tutor") {
    return 0.8; // More creative in asking questions and facilitating
  }

  return 0.6; // Default balanced approach
}

module.exports = {
  getMessages,
  postMessage,
  summarizeThread,
  getMessageStats,
  addReaction,
  uploadFiles,
  downloadFile,
  generateContextAwareSystemPrompt,
  getContextAwareTokenLimit,
  getContextAwareTemperature,
};
