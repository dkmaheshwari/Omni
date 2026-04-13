const ThreadCategory = require('../models/ThreadCategory');

// Get all active categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await ThreadCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select('-__v');
    
    return res.json({
      success: true,
      categories
    });
  } catch (err) {
    console.error('Get categories failed:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Create default categories (admin function)
exports.createDefaultCategories = async (req, res) => {
  try {
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

    // Create categories that don't exist
    const createdCategories = [];
    for (const categoryData of defaultCategories) {
      const existingCategory = await ThreadCategory.findOne({ name: categoryData.name });
      if (!existingCategory) {
        const category = new ThreadCategory(categoryData);
        await category.save();
        createdCategories.push(category);
      }
    }

    return res.json({
      success: true,
      message: `Created ${createdCategories.length} new categories`,
      categories: createdCategories
    });
  } catch (err) {
    console.error('Create default categories failed:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Get category statistics
exports.getCategoryStats = async (req, res) => {
  try {
    const Thread = require('../models/thread');
    
    const stats = await ThreadCategory.aggregate([
      {
        $lookup: {
          from: 'threads',
          localField: '_id',
          foreignField: 'category',
          as: 'threads'
        }
      },
      {
        $addFields: {
          threadCount: { $size: '$threads' },
          activeThreads: {
            $size: {
              $filter: {
                input: '$threads',
                cond: { $eq: ['$$this.isArchived', false] }
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          color: 1,
          icon: 1,
          threadCount: 1,
          activeThreads: 1,
          order: 1
        }
      },
      {
        $sort: { order: 1, name: 1 }
      }
    ]);

    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    console.error('Get category stats failed:', err);
    return res.status(500).json({ error: err.message });
  }
};