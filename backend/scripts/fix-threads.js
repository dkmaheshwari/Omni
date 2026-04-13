// Script to fix threads with missing participant data
require('dotenv').config();
const mongoose = require('mongoose');

async function fixThreads() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const Thread = require('../models/thread');
    
    // Find all threads and check if creator is in participants
    const allThreads = await Thread.find({});
    const threadsNeedingFix = [];
    
    for (const thread of allThreads) {
      const creatorInParticipants = thread.participants.some(p => p.userId === thread.createdBy);
      if (!creatorInParticipants) {
        threadsNeedingFix.push(thread);
      }
    }
    
    console.log(`Found ${threadsNeedingFix.length} threads needing participant fixes`);
    
    for (const thread of threadsNeedingFix) {
      console.log(`Fixing thread: ${thread.title} (${thread._id})`);
      
      // Add creator as owner participant
      thread.participants.push({
        userId: thread.createdBy,
        email: 'unknown@example.com', // Will be fixed when they access the thread
        role: 'owner',
        joinedAt: thread.createdAt || new Date()
      });
      
      await thread.save();
      console.log(`✅ Fixed thread: ${thread.title}`);
    }
    
    console.log('✅ Thread fix completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Thread fix failed:', error);
    process.exit(1);
  }
}

fixThreads();