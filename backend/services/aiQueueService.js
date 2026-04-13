// AI Queue Service - Async job processing for AI operations
const groqService = require('./groqService');
const cacheService = require('./cacheService');
const Message = require('../models/message');
const AIInteraction = require('../models/AIInteraction');
const auditLogger = require('../utils/auditLogger');
// PERFORMANCE FIX: Import broadcast optimizer
const broadcastOptimizer = require('../utils/broadcastOptimizer');

class AIQueueService {
  constructor() {
    this.jobs = new Map(); // In-memory job queue (can be replaced with Redis queue)
    this.isProcessing = false;
    this.maxConcurrentJobs = 3;
    this.currentJobs = 0;
    this.jobTimeout = 30000; // 30 seconds
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      avgProcessingTime: 0
    };
    
    console.log('🤖 AI Queue Service initialized');
    this.startProcessor();
  }

  /**
   * Add AI response job to queue
   * @param {Object} jobData - Job data including thread, message, and context
   * @returns {string} - Job ID for tracking
   */
  async addAIResponseJob(jobData) {
    const jobId = `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      type: 'ai_response',
      data: jobData,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      priority: jobData.priority || 'normal' // high, normal, low
    };
    
    this.jobs.set(jobId, job);
    this.stats.totalJobs++;
    
    console.log(`📋 AI job queued: ${jobId} (queue size: ${this.jobs.size})`);
    
    // Emit job status event (for real-time updates)
    this.emitJobStatus(jobId, 'queued', { queueSize: this.jobs.size });
    
    return jobId;
  }

  /**
   * Start the job processor
   */
  startProcessor() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('🚀 AI Queue processor started');
    
    // Process jobs every 100ms
    this.processorInterval = setInterval(() => {
      this.processNextJob();
    }, 100);
  }

  /**
   * Stop the job processor
   */
  stopProcessor() {
    if (!this.isProcessing) return;
    
    this.isProcessing = false;
    if (this.processorInterval) {
      clearInterval(this.processorInterval);
    }
    
    console.log('🛑 AI Queue processor stopped');
  }

  /**
   * Process the next job in queue
   */
  async processNextJob() {
    if (this.currentJobs >= this.maxConcurrentJobs) return;
    
    // Find next pending job (priority: high > normal > low)
    const pendingJobs = Array.from(this.jobs.values())
      .filter(job => job.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority] || a.createdAt - b.createdAt;
      });
    
    if (pendingJobs.length === 0) return;
    
    const job = pendingJobs[0];
    await this.processJob(job);
  }

  /**
   * Process a specific job
   * @param {Object} job - Job to process
   */
  async processJob(job) {
    const startTime = Date.now();
    this.currentJobs++;
    
    try {
      job.status = 'processing';
      job.attempts++;
      job.startedAt = new Date();
      
      console.log(`🔄 Processing AI job: ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
      this.emitJobStatus(job.id, 'processing', { attempt: job.attempts });
      
      let result;
      
      switch (job.type) {
        case 'ai_response':
          result = await this.processAIResponseJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }
      
      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      job.processingTime = Date.now() - startTime;
      
      this.stats.completedJobs++;
      this.updateAvgProcessingTime(job.processingTime);
      
      console.log(`✅ AI job completed: ${job.id} in ${job.processingTime}ms`);
      this.emitJobStatus(job.id, 'completed', { result, processingTime: job.processingTime });
      
      // Clean up completed job after a delay
      setTimeout(() => {
        this.jobs.delete(job.id);
      }, 60000); // Keep for 1 minute for status checks
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ AI job failed: ${job.id} (attempt ${job.attempts}) - ${error.message}`);
      
      if (job.attempts >= job.maxAttempts) {
        // Job failed permanently
        job.status = 'failed';
        job.error = error.message;
        job.failedAt = new Date();
        job.processingTime = processingTime;
        
        this.stats.failedJobs++;
        
        console.error(`💀 AI job permanently failed: ${job.id} after ${job.attempts} attempts`);
        this.emitJobStatus(job.id, 'failed', { error: error.message, attempts: job.attempts });
        
        // Clean up failed job after a delay
        setTimeout(() => {
          this.jobs.delete(job.id);
        }, 300000); // Keep for 5 minutes for debugging
        
      } else {
        // Retry job with exponential backoff
        job.status = 'pending';
        const retryDelay = Math.min(1000 * Math.pow(2, job.attempts - 1), 10000); // Max 10 seconds
        
        setTimeout(() => {
          console.log(`🔄 Retrying AI job: ${job.id} (attempt ${job.attempts + 1}/${job.maxAttempts})`);
        }, retryDelay);
      }
    } finally {
      this.currentJobs--;
    }
  }

  /**
   * Process AI response job
   * @param {Object} job - AI response job
   * @returns {Object} - Processing result
   */
  async processAIResponseJob(job) {
    const { threadId, messageId, aiDecision, context, recentMessages, io } = job.data;
    
    // Check cache first for similar responses
    const cacheKey = `ai_response:${threadId}:${this.hashContext(context)}`;
    const cachedResponse = cacheService.get(cacheKey);
    
    if (cachedResponse) {
      console.log(`💾 Using cached AI response for thread ${threadId}`);
      return await this.broadcastCachedResponse(cachedResponse, job.data);
    }
    
    // Generate fresh AI response
    console.log(`🤖 Generating fresh AI response for thread ${threadId}`);
    
    const aiResponseData = await groqService.generateResponse({
      messages: recentMessages,
      maxTokens: 500,
      temperature: 0.7,
      behaviorMode: aiDecision.context.behaviorMode,
      threadContext: {
        threadId,
        participantCount: context.participantCount,
        threadType: context.threadType,
        responseType: aiDecision.context.responseType,
        userLearningLevel: context.userLearningLevel
      }
    });
    
    // Save AI message to database
    const aiMessage = new Message({
      threadId,
      text: aiResponseData.content,
      messageType: 'ai',
      sender: 'ai-assistant',
      senderEmail: 'ai@peergenius.ai',
      aiMetadata: {
        model: aiResponseData.model || 'llama-3.3-70b-versatile',
        tokens: aiResponseData.usage?.total_tokens || 0,
        decisionReason: aiDecision.context.reason,
        behaviorMode: aiDecision.context.behaviorMode,
        responseType: aiDecision.context.responseType
      }
    });
    
    await aiMessage.save();
    
    // Cache response for similar contexts (1 hour TTL)
    cacheService.set(cacheKey, {
      message: aiMessage,
      aiResponseData,
      timestamp: new Date()
    }, 60 * 60 * 1000);
    
    // Audit log AI response
    await auditLogger.logAIResponse(aiMessage._id, threadId, aiResponseData.model, aiResponseData.usage?.total_tokens);
    
    // Broadcast via Socket.IO
    await this.broadcastAIMessage(aiMessage, io, threadId);
    
    return {
      messageId: aiMessage._id,
      content: aiMessage.text,
      tokens: aiResponseData.usage?.total_tokens || 0,
      cached: false
    };
  }

  /**
   * Broadcast AI message via Socket.IO with optimization
   */
  async broadcastAIMessage(aiMessage, io, threadId) {
    if (!io) {
      console.error('❌ No Socket.IO instance provided for broadcasting');
      return;
    }
    
    console.log(`🔍 Broadcasting AI message for thread: ${threadId}`);
    
    // Debug: Check if room exists and list all rooms
    const roomName = `thread:${threadId}`;
    const room = io.sockets.adapter.rooms.get(roomName);
    console.log(`🔍 Room ${roomName} exists: ${!!room}, Size: ${room ? room.size : 0}`);
    
    // List all thread rooms for debugging
    const allRooms = Array.from(io.sockets.adapter.rooms.keys()).filter(name => name.startsWith('thread:'));
    console.log(`🔍 All thread rooms: [${allRooms.join(', ')}]`);
    
    // Force user to join room if they're not in it
    if (!room || room.size === 0) {
      console.log(`⚠️ Empty room detected, forcing all connected sockets to join ${roomName}`);
      const allSockets = await io.fetchSockets();
      for (const socket of allSockets) {
        if (socket.userId) {
          console.log(`📌 Force joining socket ${socket.id} (${socket.userId}) to ${roomName}`);
          socket.join(roomName);
        }
      }
      // Recheck room after force join
      const newRoom = io.sockets.adapter.rooms.get(roomName);
      console.log(`🔍 After force join - Room ${roomName} size: ${newRoom ? newRoom.size : 0}`);
    }
    
    // Convert Mongoose document to plain object for Socket.IO
    const plainMessage = {
      _id: aiMessage._id.toString(),
      threadId: aiMessage.threadId.toString(),
      sender: aiMessage.sender,
      senderEmail: aiMessage.senderEmail,
      text: aiMessage.text,
      messageType: aiMessage.messageType,
      createdAt: aiMessage.createdAt,
      updatedAt: aiMessage.updatedAt,
      aiMetadata: aiMessage.aiMetadata
    };
    
    const messageData = {
      message: plainMessage,
      threadId: threadId,
      timestamp: new Date().toISOString(),
      source: 'ai-queue'
    };
    
    console.log(`📤 Sending AI message to room ${roomName}:`, {
      messageId: plainMessage._id,
      messageType: plainMessage.messageType,
      textPreview: plainMessage.text.substring(0, 50) + '...'
    });
    
    // PERFORMANCE FIX: Use optimized broadcast for AI messages
    const broadcastResult = await broadcastOptimizer.broadcastToThread(io, threadId, 'new-message', messageData, { priority: 'high' });
    console.log(`📡 Optimized AI message broadcast result: sent to ${broadcastResult.sent} clients, cached: ${broadcastResult.cached}`);
    
    // Fallback: Try direct room emit if optimizer fails
    if (broadcastResult.sent === 0) {
      console.log(`⚠️ Optimizer sent to 0 clients, trying direct emit to room ${roomName}`);
      io.to(roomName).emit('new-message', messageData);
      
      // Also try broadcasting to all connected sockets in the thread room
      const allSockets = await io.fetchSockets();
      let directSent = 0;
      for (const socket of allSockets) {
        if (socket.rooms.has(roomName)) {
          socket.emit('new-message', messageData);
          directSent++;
        }
      }
      console.log(`📡 Direct fallback sent to ${directSent} sockets`);
    }
  }

  /**
   * Broadcast cached AI response
   */
  async broadcastCachedResponse(cachedData, jobData) {
    const { threadId, io } = jobData;
    
    // Create a new message instance with updated timestamp
    const aiMessage = new Message({
      ...cachedData.message.toObject(),
      _id: undefined, // Generate new ID
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await aiMessage.save();
    await this.broadcastAIMessage(aiMessage, io, threadId);
    
    return {
      messageId: aiMessage._id,
      content: aiMessage.text,
      tokens: cachedData.aiResponseData.usage?.total_tokens || 0,
      cached: true
    };
  }

  /**
   * Create hash of context for caching
   */
  hashContext(context) {
    const contextString = JSON.stringify({
      participantCount: context.participantCount,
      threadType: context.threadType,
      userLearningLevel: context.userLearningLevel
    });
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < contextString.length; i++) {
      const char = contextString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Emit job status event (can be extended with Socket.IO)
   */
  emitJobStatus(jobId, status, data = {}) {
    // For now, just log. Can be extended to emit real-time updates
    console.log(`📊 Job ${jobId}: ${status}`, data);
  }

  /**
   * Update average processing time
   */
  updateAvgProcessingTime(newTime) {
    const totalCompleted = this.stats.completedJobs;
    this.stats.avgProcessingTime = 
      (this.stats.avgProcessingTime * (totalCompleted - 1) + newTime) / totalCompleted;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    
    return {
      id: job.id,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      failedAt: job.failedAt,
      attempts: job.attempts,
      processingTime: job.processingTime,
      error: job.error
    };
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.jobs.size,
      currentJobs: this.currentJobs,
      pendingJobs: Array.from(this.jobs.values()).filter(j => j.status === 'pending').length,
      processingJobs: Array.from(this.jobs.values()).filter(j => j.status === 'processing').length,
      avgProcessingTimeMs: Math.round(this.stats.avgProcessingTime)
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 AI Queue Service shutting down...');
    this.stopProcessor();
    
    // Wait for current jobs to complete
    while (this.currentJobs > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ AI Queue Service shutdown complete');
  }
}

// Create singleton instance
const aiQueueService = new AIQueueService();

// Graceful shutdown
process.on('SIGTERM', () => aiQueueService.shutdown());
process.on('SIGINT', () => aiQueueService.shutdown());

module.exports = aiQueueService;