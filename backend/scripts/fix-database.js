// Script to fix database issues
require('dotenv').config();
const mongoose = require('mongoose');

async function fixDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    
    const db = mongoose.connection.db;
    const threadsCollection = db.collection('threads');
    
    // Drop the problematic unique index on title if it exists
    try {
      await threadsCollection.dropIndex('title_1');
      console.log('✅ Dropped unique index on title');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️ Index title_1 does not exist (already fixed)');
      } else {
        console.log('⚠️ Could not drop index:', err.message);
      }
    }
    
    // List current indexes
    const indexes = await threadsCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));
    
    console.log('✅ Database fix completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    process.exit(1);
  }
}

fixDatabase();