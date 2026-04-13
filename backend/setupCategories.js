// Quick setup script for categories
require("dotenv").config();
const mongoose = require("mongoose");
const ThreadCategory = require("./models/ThreadCategory");

async function setupCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const defaultCategories = [
      {
        name: 'Mathematics',
        description: 'Algebra, Calculus, Statistics, and all math topics',
        color: '#3B82F6',
        icon: '📐',
        order: 1
      },
      {
        name: 'Science',
        description: 'Physics, Chemistry, Biology, and lab discussions',
        color: '#10B981',
        icon: '🔬',
        order: 2
      },
      {
        name: 'Computer Science',
        description: 'Programming, algorithms, data structures, and software',
        color: '#8B5CF6',
        icon: '💻',
        order: 3
      },
      {
        name: 'Engineering',
        description: 'Mechanical, Electrical, Civil, and engineering projects',
        color: '#F59E0B',
        icon: '⚙️',
        order: 4
      },
      {
        name: 'Humanities',
        description: 'Literature, Philosophy, History, and cultural studies',
        color: '#EF4444',
        icon: '📚',
        order: 5
      },
      {
        name: 'Social Sciences',
        description: 'Psychology, Sociology, Economics, and behavioral studies',
        color: '#06B6D4',
        icon: '🧠',
        order: 6
      },
      {
        name: 'Business',
        description: 'Management, Finance, Marketing, and entrepreneurship',
        color: '#84CC16',
        icon: '📊',
        order: 7
      },
      {
        name: 'Study Groups',
        description: 'Collaborative study sessions and exam preparation',
        color: '#EC4899',
        icon: '👥',
        order: 8
      },
      {
        name: 'Project Help',
        description: 'Research projects, assignments, and group work',
        color: '#6366F1',
        icon: '🎯',
        order: 9
      },
      {
        name: 'General Discussion',
        description: 'Academic advice, campus life, and open discussions',
        color: '#64748B',
        icon: '💭',
        order: 10
      }
    ];

    let created = 0;
    for (const categoryData of defaultCategories) {
      const existingCategory = await ThreadCategory.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new ThreadCategory(categoryData);
        await category.save();
        console.log(`✅ Created category: ${category.name}`);
        created++;
      } else {
        console.log(`⚠️  Category already exists: ${categoryData.name}`);
      }
    }

    console.log(`\n🎉 Setup complete! Created ${created} categories.`);
  } catch (error) {
    console.error("❌ Setup failed:", error);
  } finally {
    await mongoose.disconnect();
  }
}

setupCategories();