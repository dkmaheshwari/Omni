// at the very top of server.js
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { createServer } = require("http");
const { Server } = require("socket.io");

const userRoutes = require("./routes/userRoutes");
const threadRoutes = require("./routes/threadRoutes");
const threadCategoryRoutes = require("./routes/threadCategoryRoutes");
const messageRoutes = require("./routes/messageRoutes");
const aiTutorRoutes = require("./routes/aiTutorRoutes");
const contentGenerationRoutes = require("./routes/contentGenerationRoutes");
const intelligentAssistanceRoutes = require("./routes/intelligentAssistanceRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

const app = express();
const server = createServer(app);

const parseAllowedOrigins = () => {
  const explicitOrigins = [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS || "")
      .split(",")
      .map((value) => value.trim()),
  ]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""));

  return Array.from(
    new Set([
      "http://localhost:5173",
      "http://localhost:5174",
      ...explicitOrigins,
    ]),
  );
};

const allowedOriginPatterns = parseAllowedOrigins();

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/+$/, "");

  return allowedOriginPatterns.some((pattern) => {
    if (!pattern.includes("*")) {
      return pattern === normalizedOrigin;
    }

    // Supports simple wildcard patterns like "https://*.vercel.app"
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
    const regexPattern = `^${escaped.replace(/\*/g, ".*")}$`;
    return new RegExp(regexPattern).test(normalizedOrigin);
  });
};

// Enhanced Socket.IO setup with improved connection handling
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by Socket.IO CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  },
  transports: ["polling", "websocket"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io available globally for routes
app.set("io", io);

// Enhanced security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    frameguard: { action: "deny" },
    xssFilter: true,
  }),
);

// CORS configuration for all routes
app.use(
  cors({
    origin: function (origin, callback) {
      // Enhanced CORS debugging
      console.log(
        `🌐 CORS check - Origin: "${origin}" | Allowed patterns: [${allowedOriginPatterns.join(", ")}]`,
      );

      if (isOriginAllowed(origin)) {
        console.log(`✅ CORS allowed for origin: ${origin || "no-origin"}`);
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Cache-Control",
    ],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "production" ? 60 : 300, // 60 in production, 300 in development
  message: {
    error: "Too many requests from this IP",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// API routes
app.use("/api/users", userRoutes);
app.use("/api/threads", threadRoutes);
app.use("/api/thread-categories", threadCategoryRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/ai/tutor", aiTutorRoutes);
app.use("/api/ai/generate", contentGenerationRoutes);
app.use("/api/ai/assist", intelligentAssistanceRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    environment: process.env.NODE_ENV,
  });
});

// Socket.IO connection tracking with memory leak prevention
const connectedUsers = new Map(); // userId -> user data
const onlineUsers = new Map(); // threadId -> Set of userIds
const typingUsers = new Map(); // threadId -> Map of userId -> typing data

// MEMORY LEAK FIX: Periodic cleanup for stale connections
let cleanupInterval = null;

const setupPeriodicCleanup = () => {
  cleanupInterval = setInterval(
    () => {
      const now = Date.now();
      const CLEANUP_THRESHOLD = 30 * 60 * 1000; // 30 minutes
      let cleanedCount = 0;

      // Clean up stale connected users
      for (const [userId, userData] of connectedUsers.entries()) {
        if (now - userData.lastActivity.getTime() > CLEANUP_THRESHOLD) {
          connectedUsers.delete(userId);
          cleanedCount++;
          console.log(`🧹 Cleaned up stale user: ${userId}`);
        }
      }

      // Clean up empty online user sets
      for (const [threadId, userSet] of onlineUsers.entries()) {
        if (userSet.size === 0) {
          onlineUsers.delete(threadId);
          cleanedCount++;
        }
      }

      // Clean up empty typing user maps
      for (const [threadId, typingMap] of typingUsers.entries()) {
        if (typingMap.size === 0) {
          typingUsers.delete(threadId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(
          `🧹 Periodic cleanup: removed ${cleanedCount} stale entries. Active: ${connectedUsers.size} users, ${onlineUsers.size} thread rooms, ${typingUsers.size} typing indicators`,
        );
      }
    },
    10 * 60 * 1000,
  ); // Every 10 minutes
};

// Start cleanup when server starts
setupPeriodicCleanup();

// Socket.IO event handling
io.on("connection", (socket) => {
  console.log(`🔌 New socket connection: ${socket.id}`);

  // User joins the system
  socket.on("user:join", async (userData) => {
    const { userId, email, displayName } = userData;

    if (!userId || !email) {
      console.error("❌ Invalid user data in user:join:", userData);
      socket.emit("error", { message: "Invalid user data" });
      return;
    }

    try {
      // Store user connection info
      connectedUsers.set(userId, {
        socketId: socket.id,
        email,
        displayName: displayName || email,
        connectedAt: new Date(),
        lastActivity: new Date(),
      });

      socket.userId = userId;
      socket.userEmail = email;

      console.log(
        `👤 User joined: ${displayName || email} (${userId}) - Socket: ${socket.id}`,
      );
      socket.emit("user:joined", { message: "Successfully connected", userId });
    } catch (error) {
      console.error("❌ Error in user:join:", error);
      socket.emit("error", { message: "Failed to join" });
    }
  });

  // Join thread room
  socket.on("thread:join", async (threadId) => {
    try {
      if (!threadId) {
        socket.emit("error", { message: "Thread ID is required" });
        return;
      }

      const prefixedRoom = `thread:${threadId}`;
      await socket.join(threadId);
      await socket.join(prefixedRoom);

      // Add user to online users for this thread
      if (socket.userId) {
        if (!onlineUsers.has(threadId)) {
          onlineUsers.set(threadId, new Set());
        }
        onlineUsers.get(threadId).add(socket.userId);

        // Broadcast updated online users to thread
        const threadOnlineUsers = Array.from(onlineUsers.get(threadId))
          .map((userId) => connectedUsers.get(userId))
          .filter(Boolean);

        io.to(threadId).emit("thread:online-users", {
          threadId,
          onlineUsers: threadOnlineUsers,
        });
      }

      console.log(`📱 User ${socket.userId} joined thread room: ${threadId}`);
      socket.emit("thread:joined", {
        threadId,
        roomSize: io.sockets.adapter.rooms.get(prefixedRoom)?.size || io.sockets.adapter.rooms.get(threadId)?.size || 0,
      });
    } catch (error) {
      console.error("❌ Error joining thread:", error);
      socket.emit("error", { message: "Failed to join thread" });
    }
  });

  // Leave thread room
  socket.on("thread:leave", async (threadId) => {
    try {
      const prefixedRoom = `thread:${threadId}`;
      await socket.leave(threadId);
      await socket.leave(prefixedRoom);

      // Remove user from online users for this thread
      if (socket.userId && onlineUsers.has(threadId)) {
        onlineUsers.get(threadId).delete(socket.userId);

        if (onlineUsers.get(threadId).size === 0) {
          onlineUsers.delete(threadId);
        } else {
          // Broadcast updated online users
          const threadOnlineUsers = Array.from(onlineUsers.get(threadId))
            .map((userId) => connectedUsers.get(userId))
            .filter(Boolean);

          io.to(threadId).emit("thread:online-users", {
            threadId,
            onlineUsers: threadOnlineUsers,
          });
        }
      }

      console.log(`📱 User ${socket.userId} left thread room: ${threadId}`);
    } catch (error) {
      console.error("❌ Error leaving thread:", error);
    }
  });

  // Typing indicators
  socket.on("typing:start", ({ threadId, userName }) => {
    if (!threadId || !socket.userId) return;

    // Store typing state
    if (!typingUsers.has(threadId)) {
      typingUsers.set(threadId, new Map());
    }
    typingUsers.get(threadId).set(socket.userId, {
      userName: userName || socket.userEmail,
      startedAt: Date.now(),
    });

    // Broadcast to thread
    socket.to(threadId).emit("user:typing", {
      threadId,
      userId: socket.userId,
      userName: userName || socket.userEmail,
    });

    console.log(
      `⌨️ ${userName || socket.userEmail} started typing in ${threadId}`,
    );
  });

  socket.on("typing:stop", ({ threadId }) => {
    if (!threadId || !socket.userId) return;

    // Remove typing state
    if (typingUsers.has(threadId)) {
      typingUsers.get(threadId).delete(socket.userId);
      if (typingUsers.get(threadId).size === 0) {
        typingUsers.delete(threadId);
      }
    }

    // Broadcast to thread
    socket.to(threadId).emit("user:stop-typing", {
      threadId,
      userId: socket.userId,
      timestamp: Date.now(),
    });

    console.log(`⌨️ ${socket.userEmail} stopped typing in ${threadId}`);
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`❌ Socket disconnected: ${socket.id} - Reason: ${reason}`);

    if (socket.userId) {
      // Remove from connected users
      connectedUsers.delete(socket.userId);

      // Remove from all thread online users
      for (const [threadId, users] of onlineUsers.entries()) {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);

          if (users.size === 0) {
            onlineUsers.delete(threadId);
          } else {
            // Broadcast updated online users
            const threadOnlineUsers = Array.from(users)
              .map((userId) => connectedUsers.get(userId))
              .filter(Boolean);

            io.to(threadId).emit("thread:online-users", {
              threadId,
              onlineUsers: threadOnlineUsers,
            });
          }
        }
      }

      // Remove from all typing indicators
      for (const [threadId, typingMap] of typingUsers.entries()) {
        if (typingMap.has(socket.userId)) {
          typingMap.delete(socket.userId);

          if (typingMap.size === 0) {
            typingUsers.delete(threadId);
          }

          // Broadcast stop typing
          socket.to(threadId).emit("user:stop-typing", {
            threadId,
            userId: socket.userId,
            timestamp: Date.now(),
          });
        }
      }

      console.log(
        `👤 User ${socket.userId} (${socket.userEmail}) disconnected and cleaned up`,
      );
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Express error:", err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation Error",
      details: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      error: "Invalid ID format",
      details: err.message,
    });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// Database connection with retry logic
const connectDB = async (retryCount = 0) => {
  const maxRetries = 5;
  const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 30000); // Exponential backoff, max 30s

  try {
    const mongoURI =
      process.env.MONGO_URI || "mongodb://localhost:27017/omninexus";

    await mongoose.connect(mongoURI, {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB connected successfully");

    // Set up connection event listeners for health monitoring
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB disconnected. Will attempt to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected successfully");
    });

    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
    });
  } catch (error) {
    console.error(
      `❌ MongoDB connection error (attempt ${retryCount + 1}/${maxRetries}):`,
      error.message,
    );

    if (retryCount < maxRetries - 1) {
      console.log(`🔄 Retrying MongoDB connection in ${retryDelay}ms...`);
      setTimeout(() => connectDB(retryCount + 1), retryDelay);
    } else {
      console.error("💀 Max MongoDB connection retries reached. Exiting...");
      process.exit(1);
    }
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();

    const PORT = process.env.PORT || 5051;
    server.listen(PORT, () => {
      console.log(`🚀 Omni Nexus server running on localhost:${PORT}`);
      console.log(`⚡ Socket.IO ready for real-time communication`);
      console.log(`🔒 Security: Helmet, CORS, Rate limiting active`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
};

// Graceful shutdown with memory cleanup
const gracefulShutdown = (signal) => {
  console.log(`🛑 ${signal} received, shutting down gracefully...`);

  // MEMORY LEAK FIX: Clean up intervals and Maps
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log("✅ Cleanup interval cleared");
  }

  // Clear all Maps to prevent memory leaks
  connectedUsers.clear();
  onlineUsers.clear();
  typingUsers.clear();
  console.log("✅ Socket.IO Maps cleared");

  server.close(() => {
    console.log("✅ Server closed");
    mongoose.connection
      .close()
      .then(() => {
        console.log("✅ MongoDB connection closed");
        process.exit(0);
      })
      .catch((error) => {
        console.error("❌ Error closing MongoDB connection:", error);
        process.exit(1);
      });
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
