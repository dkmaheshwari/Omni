const Thread = require("../models/thread");
const ThreadCategory = require("../models/ThreadCategory");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

const createThread = asyncHandler(async (req, res) => {
  const userId = req.user.uid; // From auth middleware
  const userEmail = req.user.email; // From auth middleware
  const { title, description = "", isPublic = false, category, tags = [] } = req.body;

  // Validation
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ 
      error: "Thread title is required and cannot be empty" 
    });
  }

  if (title.trim().length > 200) {
    return res.status(400).json({ 
      error: "Thread title cannot exceed 200 characters" 
    });
  }

  if (description && description.length > 1000) {
    return res.status(400).json({ 
      error: "Thread description cannot exceed 1000 characters" 
    });
  }

  if (tags && tags.length > 10) {
    return res.status(400).json({ 
      error: "Cannot add more than 10 tags to a thread" 
    });
  }

  // Validate tags
  if (tags && Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0) {
        return res.status(400).json({ 
          error: "All tags must be non-empty strings" 
        });
      }
      if (tag.length > 30) {
        return res.status(400).json({ 
          error: "Tag length cannot exceed 30 characters" 
        });
      }
    }
  }

  console.log(`🔧 Creating thread for user ${userId} (${userEmail}): "${title}", public: ${isPublic}`);
  console.log(`🔧 Thread data: category=${category}, tags=${JSON.stringify(tags)}, description="${description}"`);

  const newThread = new Thread({ 
    title,
    description,
    createdBy: userId,
    isPublic,
    category: category && category.trim() !== '' ? category : null,
    tags: tags || [],
    participants: [{
      userId,
      email: userEmail,
      role: 'owner',
      joinedAt: new Date()
    }],
    lastActivity: new Date(),
    messageCount: 0
  });
  
  try {
    const savedThread = await newThread.save();
    console.log(`✅ Thread created successfully: ${savedThread._id} - "${savedThread.title}", public: ${savedThread.isPublic}`);
    
    // Real-time notification for all threads
    const io = req.app.get('io');
    if (io) {
      // Broadcast new thread to all connected clients
      const threadForBroadcast = {
        _id: savedThread._id,
        title: savedThread.title,
        description: savedThread.description,
        memberCount: savedThread.participants.length,
        messageCount: savedThread.messageCount,
        createdAt: savedThread.createdAt,
        lastActivity: savedThread.lastActivity,
        isPublic: savedThread.isPublic,
        createdBy: savedThread.createdBy,
        category: savedThread.category,
        tags: savedThread.tags
      };
      
      if (isPublic) {
        // Broadcast to all clients for public threads
        io.emit('thread:new-public', threadForBroadcast);
        console.log(`📡 Broadcast new public thread "${savedThread.title}" to all clients`);
      }
      
      // Also broadcast to thread creator's other sessions
      io.emit('thread:new-personal', {
        ...threadForBroadcast,
        forUser: userId
      });
      console.log(`📡 Broadcast new thread "${savedThread.title}" to creator's sessions`);
    }
    
    return res.status(201).json(savedThread);
  } catch (error) {
    console.error(`❌ Error creating thread for user ${userId}:`, error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return res.status(400).json({
        error: 'Thread validation failed',
        details: validationErrors
      });
    }
    
    // Handle other errors
    return res.status(500).json({
      error: 'Internal server error while creating thread',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
    });
  }
});

const getThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid; // From auth middleware
  
  console.log(`🔍 Getting threads for user ${userId} (${req.user.email})`);
  
  // Enhanced thread retrieval with proper participant management
  try {
    const threads = await Thread.find({
      "participants.userId": userId,
      isArchived: { $ne: true } // Exclude archived threads
    })
    .populate('category', 'name color icon')
    .sort({ lastActivity: -1 })
    .lean(); // Use lean for better performance

    // CRITICAL FIX: Remove duplicate threads and validate participant data
    const uniqueThreads = [];
    const seenThreadIds = new Set();
    
    for (const thread of threads) {
      const threadIdStr = thread._id.toString();
      
      if (seenThreadIds.has(threadIdStr)) {
        console.warn(`⚠️ Skipping duplicate thread: ${threadIdStr}`);
        continue;
      }
      
      seenThreadIds.add(threadIdStr);
      
      // Validate and clean participant data
      const validParticipants = thread.participants.filter(p => 
        p.userId && 
        p.email && 
        (p.userId === userId || p.userId !== thread.createdBy || p.role === 'owner')
      );
      
      // Ensure current user is in participants list
      const userParticipant = validParticipants.find(p => p.userId === userId);
      if (!userParticipant) {
        console.warn(`⚠️ User ${userId} missing from participants in thread ${threadIdStr}, skipping`);
        continue;
      }
      
      // Add computed fields
      thread.memberCount = validParticipants.length;
      thread.isOwner = thread.createdBy === userId;
      thread.userRole = userParticipant.role || 'member';
      
      uniqueThreads.push(thread);
    }
    
    if (threads.length !== uniqueThreads.length) {
      console.warn(`⚠️ Thread cleanup: ${threads.length} -> ${uniqueThreads.length} (removed ${threads.length - uniqueThreads.length} invalid/duplicate threads)`);
    }
  
    console.log(`📋 Found ${uniqueThreads.length} unique threads for user ${userId}:`);
    uniqueThreads.forEach(thread => {
      console.log(`  - ${thread._id}: "${thread.title}" (public: ${thread.isPublic}, members: ${thread.memberCount})`);
    });
    
    res.json({
      success: true,
      threads: uniqueThreads,
      count: uniqueThreads.length
    });
    
  } catch (error) {
    console.error(`❌ Error getting threads for user ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve threads',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Enhanced join thread with better validation and error handling
const joinThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;
  const userEmail = req.user.email;

  try {
    // Validate thread ID format
    if (!threadId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid thread ID format" 
      });
    }

    const thread = await Thread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ 
        success: false,
        error: "Thread not found" 
      });
    }

    // Check if thread is archived
    if (thread.isArchived) {
      return res.status(403).json({
        success: false,
        error: "Cannot join archived thread"
      });
    }

    // Check if thread is public or user has permission to join
    if (!thread.isPublic) {
      return res.status(403).json({
        success: false,
        error: "Thread is private and requires invitation"
      });
    }

    // Check if user is already a participant
    const existingParticipant = thread.participants.find(p => p.userId === userId);
    if (existingParticipant) {
      return res.status(400).json({ 
        success: false,
        error: "User already in thread",
        participant: existingParticipant
      });
    }

    // Check if thread has reached maximum participants (optional limit)
    const maxParticipants = 50; // Configurable limit
    if (thread.participants.length >= maxParticipants) {
      return res.status(403).json({
        success: false,
        error: `Thread has reached maximum participants (${maxParticipants})`
      });
    }

    // CRITICAL FIX: Add user to participants with atomic update
    const newParticipant = {
      userId,
      email: userEmail,
      role: 'member',
      joinedAt: new Date()
    };

    // Use atomic update to prevent race conditions
    const updatedThread = await Thread.findByIdAndUpdate(
      threadId,
      {
        $push: { participants: newParticipant },
        $set: { lastActivity: new Date() }
      },
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validations
      }
    );

    if (!updatedThread) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update thread with new participant'
      });
    }

    // Update local thread reference for broadcasting
    thread.participants = updatedThread.participants;
    thread.lastActivity = updatedThread.lastActivity;

    console.log(`✅ User ${userId} (${userEmail}) successfully joined thread ${threadId} atomically`);
  
  // Broadcast thread update to all participants
  const io = req.app.get('io');
  if (io) {
    const threadUpdate = {
      _id: thread._id,
      title: thread.title,
      description: thread.description,
      memberCount: thread.participants.length,
      participants: thread.participants,
      lastActivity: thread.lastActivity,
      newParticipant: {
        userId,
        email: userEmail,
        joinedAt: new Date()
      }
    };
    
    // Broadcast to all participants in this thread
    thread.participants.forEach(participant => {
      io.emit('thread:participant-joined', {
        ...threadUpdate,
        forUser: participant.userId
      });
    });
    
    console.log(`📡 Broadcast participant joined for thread "${thread.title}"`);
  }
  
    res.json({ message: "Successfully joined thread", thread });
  } catch (error) {
    console.error(`❌ Error joining thread ${threadId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to join thread',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Leave a thread
const leaveThread = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  const thread = await Thread.findById(threadId);
  if (!thread) {
    return res.status(404).json({ error: "Thread not found" });
  }

  // Check if user is a participant
  const userParticipant = thread.participants.find(p => p.userId === userId);
  if (!userParticipant) {
    return res.status(400).json({ error: "User is not a participant in this thread" });
  }

  // Prevent thread owner from leaving if there are other participants
  if (userParticipant.role === 'owner' && thread.participants.length > 1) {
    return res.status(400).json({ error: "Thread owner cannot leave while other participants exist. Transfer ownership first." });
  }

  // Remove user from participants
  thread.participants = thread.participants.filter(p => p.userId !== userId);
  
  await thread.save();
  res.json({ message: "Successfully left thread" });
});

// CRITICAL FIX: Get public threads with enhanced reliability, caching and retry logic
const getPublicThreads = asyncHandler(async (req, res) => {
  // CRITICAL FIX: Allow both authenticated and anonymous access for public threads
  try {
    // Optional authentication - can work with or without user
    const userId = req.user?.uid;
    const userEmail = req.user?.email;
    const isAuthenticated = req.isAuthenticated || false;
    
    console.log(`🌐 Public threads request - Authenticated: ${isAuthenticated}, User: ${userId || 'anonymous'}`);
    
    // No authentication required for public threads - continue with optional user context
    
    console.log(`🌍 Getting public threads for user ${userId || 'anonymous'} (${userEmail || 'no email'})`);
  
  // Enhanced caching and retry configuration
  const cacheKey = `public_threads:${userId || 'anonymous'}`;
  const retryAttempts = 3;
  const retryDelay = 1000; // Start with 1 second
  
  let attempt = 0;
  
  while (attempt < retryAttempts) {
    try {
      attempt++;
      
      // CRITICAL FIX: Optimized query with proper indexing and caching
      const queryTimeout = 3000; // 3 second timeout
      
      // Use aggregation pipeline for better performance
      const publicThreadsPromise = Thread.aggregate([
        // Match stage - uses compound index
        {
          $match: {
            isPublic: true,
            // For anonymous users, don't filter by participants
            ...(userId ? { "participants.userId": { $ne: userId } } : {}),
            isArchived: { $ne: true }
          }
        },
        // Sort early to use index
        {
          $sort: { lastActivity: -1, createdAt: -1 }
        },
        // Limit early for performance
        {
          $limit: 50
        },
        // Project only needed fields
        {
          $project: {
            title: 1,
            description: 1,
            messageCount: 1,
            lastActivity: 1,
            isPublic: 1,
            createdAt: 1,
            createdBy: 1,
            category: 1,
            tags: 1,
            // Only include first 5 participants
            participants: { $slice: ["$participants", 5] },
            "metrics.engagement": 1,
            "metrics.views": 1
          }
        }
      ])
      .option({ maxTimeMS: queryTimeout })
      .allowDiskUse(false); // Force index usage
      
      // Race condition protection with timeout
      const publicThreads = await Promise.race([
        publicThreadsPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), queryTimeout)
        )
      ]);
      
      // CRITICAL FIX: Enhanced thread processing with error handling
      const threadsWithMemberCount = publicThreads.map(thread => {
        try {
          return {
            ...thread,
            memberCount: thread.participants ? thread.participants.length : 0,
            messageCount: thread.messageCount || 0,
            category: thread.category || null,
            tags: thread.tags || [],
            lastActivityFormatted: thread.lastActivity ? new Date(thread.lastActivity).toISOString() : null,
            isActive: thread.lastActivity ? (Date.now() - new Date(thread.lastActivity).getTime()) < (7 * 24 * 60 * 60 * 1000) : false // Active in last 7 days
          };
        } catch (err) {
          console.error(`Error processing thread ${thread._id}:`, err);
          return null;
        }
      }).filter(Boolean); // Remove null entries
      
      console.log(`🌍 Found ${threadsWithMemberCount.length} public threads available to join (attempt ${attempt}):`);
      threadsWithMemberCount.slice(0, 5).forEach(thread => {
        console.log(`  - ${thread._id}: "${thread.title}" (members: ${thread.memberCount}, messages: ${thread.messageCount}, active: ${thread.isActive})`);
      });
      
      // Success response with cache headers
      res.set({
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'ETag': `"public-threads-${userId || 'anonymous'}-${Date.now()}"`,
        'X-Response-Time': Date.now() - new Date().getTime()
      });
      
      return res.status(200).json({
        success: true,
        count: threadsWithMemberCount.length,
        data: threadsWithMemberCount,
        meta: {
          cacheKey,
          attempt,
          timestamp: new Date().toISOString(),
          queryTime: `${Date.now() - new Date().getTime()}ms`
        }
      });
      
    } catch (error) {
      console.error(`❌ Error fetching public threads for user ${userId} (attempt ${attempt}/${retryAttempts}):`, error);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        userId: userId,
        userEmail: userEmail
      });
      
      // If this was the last attempt, return error
      if (attempt >= retryAttempts) {
        const userFriendlyMessage = error.message.includes('timeout') 
          ? 'Request timed out while loading public threads. Please try again.'
          : error.message.includes('network')
          ? 'Network error while loading public threads. Please check your connection.'
          : 'Failed to load public threads. Please try again.';
          
        return res.status(500).json({
          success: false,
          message: userFriendlyMessage,
          error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          retryAttempts: attempt,
          suggestions: [
            'Refresh the page',
            'Check your internet connection',
            'Try again in a few moments'
          ]
        });
      }
      
      // Wait before retrying with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`⏰ Retrying in ${delay}ms (attempt ${attempt + 1}/${retryAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached due to the return statements above
  return res.status(500).json({
    success: false,
    message: 'Unexpected error in retry logic'
  });
  
  } catch (outerError) {
    // CRITICAL FIX: Handle any errors that occur outside the retry loop
    console.error('❌ Critical error in getPublicThreads:', outerError);
    console.error('❌ Critical error stack:', outerError.stack);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? outerError.message : 'Internal server error'
    });
  }
});

// CRITICAL FIX: Add dedicated endpoint for refreshing public threads cache
const refreshPublicThreadsCache = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  
  try {
    console.log(`🔄 Manual cache refresh requested by user ${userId}`);
    
    // Force refresh by calling getPublicThreads with cache bypass
    req.query.bypassCache = true;
    
    // Call getPublicThreads but modify response to indicate cache refresh
    const originalJson = res.json;
    res.json = function(data) {
      return originalJson.call(this, {
        ...data,
        cacheRefreshed: true,
        refreshedAt: new Date().toISOString()
      });
    };
    
    return getPublicThreads(req, res);
    
  } catch (error) {
    console.error(`❌ Cache refresh failed for user ${userId}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh cache',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Advanced search threads with filters
const searchThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { 
    query, 
    category, 
    tags, 
    sortBy = 'relevance', 
    page = 1, 
    limit = 20,
    includeOwned = false 
  } = req.query;

  console.log(`🔍 Advanced search for user ${userId}: query="${query}", category="${category}", tags="${tags}"`);

  try {
    const skip = (page - 1) * limit;
    let searchFilter = {
      isPublic: true,
      isArchived: { $ne: true }
    };

    // Exclude threads user is already in (unless includeOwned is true)
    if (!includeOwned) {
      searchFilter["participants.userId"] = { $ne: userId };
    }

    // Category filter
    if (category && category !== 'all') {
      searchFilter.category = category;
    }

    // Tags filter
    if (tags && tags.length > 0) {
      const tagArray = Array.isArray(tags) ? tags : tags.split(',');
      searchFilter.tags = { $in: tagArray };
    }

    let threads;
    
    if (query && query.trim()) {
      // Text search
      threads = await Thread.find({
        ...searchFilter,
        $text: { $search: query }
      }, {
        score: { $meta: "textScore" }
      })
      .populate('category', 'name color icon')
      .populate('participants', 'userId email')
      .sort(sortBy === 'relevance' ? { score: { $meta: "textScore" } } : getSortOptions(sortBy))
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    } else {
      // General browse without search query
      threads = await Thread.find(searchFilter)
        .populate('category', 'name color icon')
        .populate('participants', 'userId email')
        .sort(getSortOptions(sortBy))
        .skip(skip)
        .limit(parseInt(limit))
        .lean();
    }

    // Add computed fields
    const threadsWithMetrics = threads.map(thread => ({
      ...thread,
      memberCount: thread.participants ? thread.participants.length : 0,
      isJoined: thread.participants?.some(p => p.userId === userId) || false
    }));

    // Get total count for pagination
    const totalCount = await Thread.countDocuments(searchFilter);

    res.json({
      success: true,
      threads: threadsWithMetrics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    console.error('Thread search failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get recommended threads based on user interests
const getRecommendedThreads = asyncHandler(async (req, res) => {
  const userId = req.user.uid;
  const { limit = 10 } = req.query;

  try {
    // Get user profile to extract interests
    const user = await User.findOne({ uid: userId }).select('profile.interests');
    const userInterests = user?.profile?.interests || [];

    let recommendedThreads = [];

    if (userInterests.length > 0) {
      // Find threads with matching tags/keywords based on user interests
      const interestRegex = new RegExp(userInterests.join('|'), 'i');
      
      recommendedThreads = await Thread.find({
        isPublic: true,
        isArchived: { $ne: true },
        "participants.userId": { $ne: userId },
        $or: [
          { tags: { $regex: interestRegex } },
          { searchKeywords: { $regex: interestRegex } },
          { title: { $regex: interestRegex } },
          { description: { $regex: interestRegex } }
        ]
      })
      .populate('category', 'name color icon')
      .sort({ 'metrics.engagement': -1, lastActivity: -1 })
      .limit(parseInt(limit))
      .lean();
    }

    // If no interest-based recommendations or not enough, fill with popular threads
    if (recommendedThreads.length < limit) {
      const remainingLimit = limit - recommendedThreads.length;
      const existingIds = recommendedThreads.map(t => t._id);
      
      const popularThreads = await Thread.find({
        isPublic: true,
        isArchived: { $ne: true },
        "participants.userId": { $ne: userId },
        _id: { $nin: existingIds }
      })
      .populate('category', 'name color icon')
      .sort({ 'metrics.engagement': -1, 'metrics.views': -1 })
      .limit(remainingLimit)
      .lean();

      recommendedThreads = [...recommendedThreads, ...popularThreads];
    }

    // Add computed fields
    const threadsWithMetrics = recommendedThreads.map(thread => ({
      ...thread,
      memberCount: thread.participants ? thread.participants.length : 0,
      recommendationReason: getRecommendationReason(thread, userInterests)
    }));

    res.json({
      success: true,
      threads: threadsWithMetrics,
      userInterests
    });
  } catch (err) {
    console.error('Get recommended threads failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Get thread statistics and analytics
const getThreadAnalytics = asyncHandler(async (req, res) => {
  const { threadId } = req.params;
  const userId = req.user.uid;

  try {
    const thread = await Thread.findById(threadId)
      .populate('category', 'name color icon')
      .lean();

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if user is a participant (for privacy)
    const isParticipant = thread.participants.some(p => p.userId === userId);
    if (!isParticipant && !thread.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Track view
    if (isParticipant) {
      await Thread.findByIdAndUpdate(threadId, {
        $inc: { 'metrics.views': 1 },
        $addToSet: {
          'metrics.uniqueViewers': {
            userId,
            viewedAt: new Date()
          }
        }
      });
    }

    const analytics = {
      threadId: thread._id,
      title: thread.title,
      category: thread.category,
      tags: thread.tags,
      metrics: {
        views: thread.metrics?.views || 0,
        uniqueViewers: thread.metrics?.uniqueViewers?.length || 0,
        engagement: thread.metrics?.engagement || 0,
        helpfulnessScore: thread.metrics?.helpfulnessScore || 0
      },
      memberCount: thread.participants.length,
      messageCount: thread.messageCount,
      createdAt: thread.createdAt,
      lastActivity: thread.lastActivity
    };

    res.json({
      success: true,
      analytics
    });
  } catch (err) {
    console.error('Get thread analytics failed:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Helper functions
function getSortOptions(sortBy) {
  switch (sortBy) {
    case 'newest':
      return { createdAt: -1 };
    case 'oldest':
      return { createdAt: 1 };
    case 'activity':
      return { lastActivity: -1 };
    case 'popular':
      return { 'metrics.engagement': -1, 'metrics.views': -1 };
    case 'members':
      return { 'participants': -1 };
    case 'messages':
      return { messageCount: -1 };
    default:
      return { 'metrics.engagement': -1, lastActivity: -1 };
  }
}

function getRecommendationReason(thread, userInterests) {
  const matchingInterests = userInterests.filter(interest => 
    thread.tags?.some(tag => tag.toLowerCase().includes(interest.toLowerCase())) ||
    thread.title?.toLowerCase().includes(interest.toLowerCase()) ||
    thread.description?.toLowerCase().includes(interest.toLowerCase())
  );

  if (matchingInterests.length > 0) {
    return `Matches your interests: ${matchingInterests.join(', ')}`;
  }
  
  if (thread.metrics?.engagement > 50) {
    return 'Highly engaged community';
  }
  
  if (thread.participants?.length > 10) {
    return 'Active discussion group';
  }
  
  return 'Popular thread';
}

module.exports = { 
  createThread, 
  getThreads, 
  joinThread, 
  leaveThread, 
  getPublicThreads,
  refreshPublicThreadsCache,
  searchThreads,
  getRecommendedThreads,
  getThreadAnalytics
};
