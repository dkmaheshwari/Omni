// Script to repair healthy threads with missing participant data
require('dotenv').config();
const mongoose = require('mongoose');

async function repairThreads() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const Thread = require('../models/thread');
    
    // Find healthy threads where creator is not in participants
    const allThreads = await Thread.find({});
    const threadsNeedingRepair = [];
    
    for (const thread of allThreads) {
      const creatorInParticipants = thread.participants.some(p => p.userId === thread.createdBy);
      if (!creatorInParticipants && thread.createdBy) {
        threadsNeedingRepair.push(thread);
      }
    }
    
    console.log(`Found ${threadsNeedingRepair.length} threads needing participant repair`);
    
    for (const thread of threadsNeedingRepair) {
      console.log(`Repairing thread: ${thread.title} (${thread._id})`);
      
      // Add creator as owner participant
      thread.participants.push({
        userId: thread.createdBy,
        email: 'creator@example.com', // Will be updated when they access the thread
        role: 'owner',
        joinedAt: thread.createdAt || new Date()
      });
      
      await thread.save();
      console.log(`✅ Repaired thread: ${thread.title}`);
    }
    
    console.log(`✅ Thread repair completed - fixed ${threadsNeedingRepair.length} threads`);
    
    // Verify all threads now have participants
    const verificationCount = await Thread.countDocuments({
      'participants.0': { $exists: true }
    });
    const totalCount = await Thread.countDocuments();
    
    console.log(`✅ Verification: ${verificationCount}/${totalCount} threads have participants`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Thread repair failed:', error);
    process.exit(1);
  }
}

repairThreads();