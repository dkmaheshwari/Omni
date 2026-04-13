// Intelligent Assistance Controller - Handle AI assistance requests
const aiService = require('../services/aiService');
const AIInteraction = require('../models/AIInteraction');
const UserLearningProfile = require('../models/UserLearningProfile');

// Code Review Assistance
exports.reviewCode = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { code, language = 'javascript', focusAreas = [] } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Code is required for review'
      });
    }

    // Generate code review
    const aiResponse = await aiService.reviewCode(userId, code, language);

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'code_review',
      userInput: `Review ${language} code: ${code.substring(0, 100)}...`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: 'programming',
      difficulty: 'intermediate',
      metadata: {
        language,
        codeLength: code.length,
        focusAreas
      }
    });

    await interaction.save();

    // Update user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      // Add programming to preferred subjects if not already there
      if (!userProfile.preferredSubjects.includes('programming')) {
        userProfile.preferredSubjects.push('programming');
      }
      
      // Update engagement metrics
      userProfile.updateEngagementMetrics(60, 90); // 60 seconds, 90% engagement
      await userProfile.save();
    }

    res.json({
      success: true,
      review: {
        language,
        codeLength: code.length,
        review: aiResponse.content,
        suggestions: this.extractSuggestions(aiResponse.content),
        severity: this.analyzeSeverity(aiResponse.content)
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Code review error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Writing Assistance
exports.assistWithWriting = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { text, assistanceType = 'grammar', writingType = 'general' } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text is required for writing assistance'
      });
    }

    // Generate writing assistance
    const aiResponse = await aiService.assistWithWriting(userId, text, assistanceType);

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'writing_assistance',
      userInput: `${assistanceType} assistance for: ${text.substring(0, 100)}...`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: 'english',
      difficulty: 'intermediate',
      metadata: {
        assistanceType,
        writingType,
        textLength: text.length
      }
    });

    await interaction.save();

    // Update user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      // Add english to preferred subjects if not already there
      if (!userProfile.preferredSubjects.includes('english')) {
        userProfile.preferredSubjects.push('english');
      }
      
      // Update engagement metrics
      userProfile.updateEngagementMetrics(45, 85); // 45 seconds, 85% engagement
      await userProfile.save();
    }

    res.json({
      success: true,
      assistance: {
        assistanceType,
        originalLength: text.length,
        suggestions: aiResponse.content,
        improvements: this.extractImprovements(aiResponse.content),
        score: this.calculateWritingScore(text, aiResponse.content)
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Writing assistance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Math Problem Solving
exports.solveMathProblem = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { problem, showSteps = true, mathType = 'algebra' } = req.body;

    if (!problem || !problem.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Math problem is required'
      });
    }

    // Generate math solution
    const aiResponse = await aiService.solveMathProblem(userId, problem, showSteps);

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'math_solving',
      userInput: `Solve math problem: ${problem}`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: 'mathematics',
      difficulty: this.assessMathDifficulty(problem),
      metadata: {
        mathType,
        showSteps,
        problemLength: problem.length
      }
    });

    await interaction.save();

    // Update user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      // Add mathematics to preferred subjects if not already there
      if (!userProfile.preferredSubjects.includes('mathematics')) {
        userProfile.preferredSubjects.push('mathematics');
      }
      
      // Update performance metrics for math
      userProfile.updatePerformanceMetrics('mathematics', 75);
      userProfile.updateEngagementMetrics(90, 95); // 90 seconds, 95% engagement
      await userProfile.save();
    }

    res.json({
      success: true,
      solution: {
        problem,
        solution: aiResponse.content,
        steps: this.extractSteps(aiResponse.content),
        concepts: this.extractConcepts(aiResponse.content),
        difficulty: this.assessMathDifficulty(problem),
        practiceProblems: this.generatePracticeProblems(problem)
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Math solving error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Research Assistance
exports.researchAssistance = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { topic, sources = 'academic', depth = 'moderate', researchType = 'general' } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Research topic is required'
      });
    }

    // Generate research assistance
    const aiResponse = await aiService.researchAssistance(userId, topic, sources, depth);

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'research_assistance',
      userInput: `Research assistance for: ${topic}`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: this.identifyResearchSubject(topic),
      difficulty: 'intermediate',
      metadata: {
        researchType,
        sources,
        depth,
        topicLength: topic.length
      }
    });

    await interaction.save();

    // Update user learning profile
    const userProfile = await UserLearningProfile.findByUserId(userId);
    if (userProfile) {
      const subject = this.identifyResearchSubject(topic);
      if (!userProfile.preferredSubjects.includes(subject)) {
        userProfile.preferredSubjects.push(subject);
      }
      
      // Update engagement metrics
      userProfile.updateEngagementMetrics(120, 80); // 120 seconds, 80% engagement
      await userProfile.save();
    }

    res.json({
      success: true,
      research: {
        topic,
        sources,
        depth,
        guidance: aiResponse.content,
        keyPoints: this.extractKeyPoints(aiResponse.content),
        suggestedSources: this.extractSources(aiResponse.content),
        nextSteps: this.extractNextSteps(aiResponse.content)
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Research assistance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get assistance history
exports.getAssistanceHistory = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { type, limit = 20 } = req.query;

    const query = { userId };
    if (type) {
      query.interactionType = type;
    } else {
      query.interactionType = {
        $in: ['code_review', 'writing_assistance', 'math_solving', 'research_assistance']
      };
    }

    const interactions = await AIInteraction.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const history = interactions.map(interaction => ({
      id: interaction._id,
      type: interaction.interactionType,
      subject: interaction.subject,
      preview: interaction.userInput.substring(0, 100),
      rating: interaction.userFeedback?.rating,
      createdAt: interaction.createdAt,
      responseTime: interaction.responseTime
    }));

    res.json({
      success: true,
      history,
      total: history.length
    });

  } catch (error) {
    console.error('Get assistance history error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper methods
exports.extractSuggestions = (reviewContent) => {
  const suggestions = [];
  const lines = reviewContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('suggestion') || line.includes('improve') || line.includes('consider')) {
      suggestions.push(line.trim());
    }
  });
  
  return suggestions.slice(0, 5); // Return top 5 suggestions
};

exports.analyzeSeverity = (reviewContent) => {
  const criticalWords = ['error', 'bug', 'security', 'vulnerability', 'critical'];
  const warningWords = ['warning', 'caution', 'potential', 'consider'];
  
  const content = reviewContent.toLowerCase();
  
  if (criticalWords.some(word => content.includes(word))) {
    return 'high';
  } else if (warningWords.some(word => content.includes(word))) {
    return 'medium';
  }
  
  return 'low';
};

exports.extractImprovements = (assistanceContent) => {
  const improvements = [];
  const lines = assistanceContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('improve') || line.includes('better') || line.includes('enhance')) {
      improvements.push(line.trim());
    }
  });
  
  return improvements.slice(0, 5);
};

exports.calculateWritingScore = (originalText, assistanceContent) => {
  // Simple scoring based on text length and assistance provided
  const originalLength = originalText.length;
  const assistanceLength = assistanceContent.length;
  
  if (assistanceLength > originalLength * 0.5) {
    return 75; // Many improvements suggested
  } else if (assistanceLength > originalLength * 0.2) {
    return 85; // Some improvements suggested
  } else {
    return 95; // Few improvements needed
  }
};

exports.extractSteps = (solutionContent) => {
  const steps = [];
  const lines = solutionContent.split('\n');
  
  lines.forEach(line => {
    if (line.match(/^\d+\./) || line.includes('step')) {
      steps.push(line.trim());
    }
  });
  
  return steps;
};

exports.extractConcepts = (solutionContent) => {
  const concepts = [];
  const mathConcepts = [
    'algebra', 'calculus', 'geometry', 'trigonometry', 'derivative', 'integral',
    'equation', 'function', 'limit', 'theorem', 'formula', 'variable'
  ];
  
  const content = solutionContent.toLowerCase();
  
  mathConcepts.forEach(concept => {
    if (content.includes(concept)) {
      concepts.push(concept);
    }
  });
  
  return [...new Set(concepts)]; // Remove duplicates
};

exports.assessMathDifficulty = (problem) => {
  const advancedKeywords = ['integral', 'derivative', 'limit', 'matrix', 'vector'];
  const intermediateKeywords = ['quadratic', 'logarithm', 'exponential', 'trigonometric'];
  
  const problemLower = problem.toLowerCase();
  
  if (advancedKeywords.some(keyword => problemLower.includes(keyword))) {
    return 'advanced';
  } else if (intermediateKeywords.some(keyword => problemLower.includes(keyword))) {
    return 'intermediate';
  }
  
  return 'beginner';
};

exports.generatePracticeProblems = (originalProblem) => {
  // Simple practice problem suggestions
  return [
    'Try a similar problem with different numbers',
    'Practice the same concept with a word problem',
    'Solve a more complex version of this problem'
  ];
};

exports.identifyResearchSubject = (topic) => {
  const subjects = {
    'science': ['physics', 'chemistry', 'biology', 'research', 'experiment'],
    'history': ['historical', 'ancient', 'war', 'civilization', 'period'],
    'literature': ['literature', 'novel', 'poetry', 'author', 'book'],
    'psychology': ['psychology', 'behavior', 'mental', 'cognitive', 'social'],
    'economics': ['economics', 'market', 'trade', 'business', 'finance']
  };
  
  const topicLower = topic.toLowerCase();
  
  for (const [subject, keywords] of Object.entries(subjects)) {
    if (keywords.some(keyword => topicLower.includes(keyword))) {
      return subject;
    }
  }
  
  return 'general';
};

exports.extractKeyPoints = (researchContent) => {
  const keyPoints = [];
  const lines = researchContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('key') || line.includes('important') || line.includes('main')) {
      keyPoints.push(line.trim());
    }
  });
  
  return keyPoints.slice(0, 5);
};

exports.extractSources = (researchContent) => {
  const sources = [];
  const lines = researchContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('source') || line.includes('reference') || line.includes('journal')) {
      sources.push(line.trim());
    }
  });
  
  return sources.slice(0, 5);
};

exports.extractNextSteps = (researchContent) => {
  const nextSteps = [];
  const lines = researchContent.split('\n');
  
  lines.forEach(line => {
    if (line.includes('next') || line.includes('step') || line.includes('further')) {
      nextSteps.push(line.trim());
    }
  });
  
  return nextSteps.slice(0, 3);
};