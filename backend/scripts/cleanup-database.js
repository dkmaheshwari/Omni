// Script to clean up corrupted threads safely
require('dotenv').config();
const mongoose = require('mongoose');

async function cleanupDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    const threadsCollection = db.collection('threads');
    
    // Find threads with missing required fields
    const corruptedThreads = await threadsCollection.find({
      $or: [
        { createdBy: { $exists: false } },
        { createdBy: null },
        { createdBy: "" },
        { participants: { $exists: false } },
        { participants: null },
        { participants: [] }
      ]
    }).toArray();
    
    console.log(`Found ${corruptedThreads.length} corrupted threads`);
    
    if (corruptedThreads.length > 0) {
      console.log('Corrupted threads:');
      corruptedThreads.forEach(thread => {
        console.log(`- ${thread.title || 'No title'} (${thread._id})`);
      });
      
      // Delete corrupted threads
      const deleteResult = await threadsCollection.deleteMany({
        $or: [
          { createdBy: { $exists: false } },
          { createdBy: null },
          { createdBy: "" },
          { participants: { $exists: false } },
          { participants: null },
          { participants: [] }
        ]
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} corrupted threads`);
      
      // Also clean up messages for deleted threads
      const messagesCollection = db.collection('messages');
      const threadIds = corruptedThreads.map(t => t._id);
      const messagesDeleteResult = await messagesCollection.deleteMany({
        threadId: { $in: threadIds }
      });
      
      console.log(`✅ Deleted ${messagesDeleteResult.deletedCount} orphaned messages`);
    }
    
    // Verify remaining threads
    const remainingThreads = await threadsCollection.countDocuments();
    console.log(`✅ ${remainingThreads} healthy threads remaining`);
    
    console.log('✅ Database cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

cleanupDatabase();