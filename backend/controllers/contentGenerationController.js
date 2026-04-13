// Content Generation Controller - Handle AI content generation requests
const aiService = require('../services/aiService');
const StudyMaterial = require('../models/StudyMaterial');
const AIInteraction = require('../models/AIInteraction');
const UserLearningProfile = require('../models/UserLearningProfile');

// Generate study guide with enhanced templates and customization
exports.generateStudyGuide = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { 
      topics, 
      difficulty = 'intermediate', 
      title, 
      template = 'comprehensive',
      customization = {},
      learningObjectives = [],
      studyTimeTarget = 60,
      includeExamples = true,
      includeKeyPoints = true,
      includeQuizQuestions = false
    } = req.body;

    // Enhanced study guide generation with template and customization
    const aiResponse = await aiService.generateEnhancedStudyGuide(
      userId,
      topics,
      difficulty,
      {
        template,
        customization,
        learningObjectives,
        studyTimeTarget,
        includeExamples,
        includeKeyPoints,
        includeQuizQuestions
      }
    );

    // Parse content into structured format with enhanced parsing
    const structuredContent = await this.parseEnhancedStudyGuideContent(aiResponse.content, template);

    // Create study material record with enhanced metadata
    const studyMaterial = new StudyMaterial({
      userId,
      title: title || `Study Guide: ${topics.join(', ')}`,
      type: 'study_guide',
      subject: await this.extractPrimarySubject(topics),
      topics,
      difficulty,
      content: aiResponse.content,
      structuredContent: {
        sections: structuredContent,
        template: template,
        customization: customization
      },
      generationDetails: {
        prompt: `Generate ${template} study guide for: ${topics.join(', ')}`,
        modelUsed: aiResponse.model,
        capability: aiResponse.capability,
        generationTime: Date.now() - aiResponse.timestamp,
        tokenUsage: aiResponse.usage,
        template: template,
        customizationOptions: customization
      },
      metadata: {
        estimatedStudyTime: studyTimeTarget,
        learningObjectives: learningObjectives.length > 0 ? learningObjectives : this.extractLearningObjectives(aiResponse.content),
        tags: topics,
        template: template,
        qualityScore: await this.calculateContentQuality(aiResponse.content),
        completenessScore: this.calculateCompleteness(structuredContent),
        difficultyAccuracy: this.validateDifficultyLevel(aiResponse.content, difficulty)
      }
    });

    await studyMaterial.save();

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'study_guide',
      userInput: `Generate study guide for: ${topics.join(', ')}`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: await this.extractPrimarySubject(topics),
      difficulty
    });

    await interaction.save();

    res.json({
      success: true,
      studyGuide: {
        id: studyMaterial._id,
        title: studyMaterial.title,
        content: aiResponse.content,
        structuredContent: structuredContent,
        topics: topics,
        difficulty: difficulty,
        estimatedStudyTime: studyMaterial.metadata.estimatedStudyTime
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Generate study guide error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate quiz
exports.generateQuiz = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { topics, questionCount = 5, difficulty = 'intermediate', quizType = 'multiple-choice' } = req.body;

    console.log('Generating quiz:', { userId, topics, questionCount, difficulty });

    // Generate quiz content
    const aiResponse = await aiService.generateQuiz(
      userId,
      topics,
      questionCount,
      difficulty
    );
    
    console.log('AI Response received:', { 
      content: aiResponse.content, 
      model: aiResponse.model,
      capability: aiResponse.capability 
    });

    // Parse quiz content into structured format
    const questions = await this.parseQuizContent(aiResponse.content);

    // If parsing failed, create a fallback format
    if (!questions || questions.length === 0) {
      console.warn('Quiz parsing failed, attempting fallback parsing...');
      
      // Try to create at least one question from the content
      const fallbackQuestions = [{
        question: `Based on the topic "${topics.join(', ')}", which of the following is correct?`,
        options: [
          'A) Option A - Please regenerate the quiz for proper options',
          'B) Option B - Please regenerate the quiz for proper options',
          'C) Option C - Please regenerate the quiz for proper options',
          'D) Option D - Please regenerate the quiz for proper options'
        ],
        correctAnswer: 'A) Option A - Please regenerate the quiz for proper options',
        explanation: 'This is a fallback question. Please regenerate the quiz for proper content.'
      }];
      
      questions.push(...fallbackQuestions);
    }

    // Create study material record
    const studyMaterial = new StudyMaterial({
      userId,
      title: `Quiz: ${topics.join(', ')}`,
      type: 'quiz',
      subject: await this.extractPrimarySubject(topics),
      topics,
      difficulty,
      content: aiResponse.content,
      structuredContent: {
        questions: questions
      },
      generationDetails: {
        prompt: `Generate ${questionCount} quiz questions for: ${topics.join(', ')}`,
        modelUsed: aiResponse.model,
        capability: aiResponse.capability,
        generationTime: Date.now() - aiResponse.timestamp,
        tokenUsage: aiResponse.usage
      },
      metadata: {
        estimatedStudyTime: questionCount * 2, // 2 minutes per question
        learningObjectives: topics.map(topic => `Test knowledge of ${topic}`),
        tags: topics
      }
    });

    await studyMaterial.save();

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'quiz',
      userInput: `Generate ${questionCount} quiz questions for: ${topics.join(', ')}`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: await this.extractPrimarySubject(topics),
      difficulty
    });

    await interaction.save();

    res.json({
      success: true,
      quiz: {
        id: studyMaterial._id,
        title: studyMaterial.title,
        questions: questions,
        questionCount: questions.length,
        difficulty: difficulty,
        estimatedTime: studyMaterial.metadata.estimatedStudyTime
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Generate quiz error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate flashcards
exports.generateFlashcards = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { content, count = 10, title, topics = [] } = req.body;

    // Generate flashcards
    const aiResponse = await aiService.generateFlashcards(
      userId,
      content,
      count
    );

    // Parse flashcard content
    const cards = await this.parseFlashcardContent(aiResponse.content);

    // Create study material record
    const studyMaterial = new StudyMaterial({
      userId,
      title: title || 'Generated Flashcards',
      type: 'flashcards',
      subject: await this.extractPrimarySubject(topics),
      topics,
      difficulty: 'intermediate',
      content: aiResponse.content,
      structuredContent: {
        cards: cards
      },
      generationDetails: {
        prompt: `Generate ${count} flashcards from content`,
        modelUsed: aiResponse.model,
        capability: aiResponse.capability,
        generationTime: Date.now() - aiResponse.timestamp,
        tokenUsage: aiResponse.usage
      },
      metadata: {
        estimatedStudyTime: cards.length * 1, // 1 minute per card
        learningObjectives: ['Memorize key concepts', 'Quick recall practice'],
        tags: topics
      }
    });

    await studyMaterial.save();

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'flashcards',
      userInput: `Generate ${count} flashcards from content`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject: await this.extractPrimarySubject(topics),
      difficulty: 'intermediate'
    });

    await interaction.save();

    res.json({
      success: true,
      flashcards: {
        id: studyMaterial._id,
        title: studyMaterial.title,
        cards: cards,
        count: cards.length,
        estimatedTime: studyMaterial.metadata.estimatedStudyTime
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Generate flashcards error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Generate practice problems
exports.generatePracticeProblems = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { subject, difficulty = 'intermediate', count = 5, topics = [] } = req.body;

    // Generate practice problems
    const aiResponse = await aiService.generatePracticeProblems(
      userId,
      subject,
      difficulty,
      count
    );

    // Parse practice problems
    const problems = await this.parsePracticeProblems(aiResponse.content);

    // Create study material record
    const studyMaterial = new StudyMaterial({
      userId,
      title: `Practice Problems: ${subject}`,
      type: 'practice_problems',
      subject,
      topics,
      difficulty,
      content: aiResponse.content,
      structuredContent: {
        problems: problems
      },
      generationDetails: {
        prompt: `Generate ${count} practice problems for ${subject}`,
        modelUsed: aiResponse.model,
        capability: aiResponse.capability,
        generationTime: Date.now() - aiResponse.timestamp,
        tokenUsage: aiResponse.usage
      },
      metadata: {
        estimatedStudyTime: problems.length * 10, // 10 minutes per problem
        learningObjectives: [`Practice ${subject} problem-solving skills`],
        tags: [subject, ...topics]
      }
    });

    await studyMaterial.save();

    // Create AI interaction record
    const interaction = new AIInteraction({
      userId,
      interactionType: 'practice_problems',
      userInput: `Generate ${count} practice problems for ${subject}`,
      aiResponse: aiResponse.content,
      modelUsed: aiResponse.model,
      capability: aiResponse.capability,
      responseTime: Date.now() - aiResponse.timestamp,
      tokenUsage: aiResponse.usage,
      subject,
      difficulty
    });

    await interaction.save();

    res.json({
      success: true,
      practiceProblems: {
        id: studyMaterial._id,
        title: studyMaterial.title,
        problems: problems,
        count: problems.length,
        difficulty: difficulty,
        estimatedTime: studyMaterial.metadata.estimatedStudyTime
      },
      interactionId: interaction._id
    });

  } catch (error) {
    console.error('Generate practice problems error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Submit interactive quiz results
exports.submitQuizResults = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { quizId, results } = req.body;

    // Find the quiz material
    const quizMaterial = await StudyMaterial.findById(quizId);
    if (!quizMaterial || quizMaterial.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Add performance attempt
    const incorrectAnswers = Object.keys(results.selectedAnswers).filter(
      questionIndex => results.feedback[questionIndex] && !results.feedback[questionIndex].isCorrect
    );

    quizMaterial.addPerformanceAttempt(
      results.score,
      results.totalTime,
      incorrectAnswers
    );

    // Update user interaction metrics
    quizMaterial.addTimeSpent(results.totalTime);

    // Save the updated material
    await quizMaterial.save();

    // Create AI interaction record for the quiz completion
    const interaction = new AIInteraction({
      userId,
      interactionType: 'quiz_completion',
      userInput: `Interactive quiz completed: ${quizMaterial.title}`,
      aiResponse: `Quiz completed with score: ${results.score}%`,
      modelUsed: 'interactive_quiz_system',
      capability: 'ASSESSMENT',
      responseTime: results.totalTime * 1000, // Convert to milliseconds
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      subject: quizMaterial.subject,
      difficulty: quizMaterial.difficulty,
      metadata: {
        quizId: quizId,
        score: results.score,
        questionTimes: results.questionTimes,
        totalTime: results.totalTime,
        correctAnswers: Object.keys(results.selectedAnswers).filter(
          questionIndex => results.feedback[questionIndex] && results.feedback[questionIndex].isCorrect
        ).length,
        totalQuestions: Object.keys(results.selectedAnswers).length
      }
    });

    await interaction.save();

    res.json({
      success: true,
      message: 'Quiz results submitted successfully',
      performance: {
        score: results.score,
        totalTime: results.totalTime,
        bestScore: quizMaterial.performanceTracking.bestScore,
        averageScore: quizMaterial.performanceTracking.averageScore,
        improvementRate: quizMaterial.performanceTracking.improvementRate,
        attempts: quizMaterial.performanceTracking.attempts.length
      }
    });

  } catch (error) {
    console.error('Submit quiz results error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Submit adaptive flashcard session results
exports.submitFlashcardSession = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { flashcardsId, sessionData } = req.body;

    // Find the flashcard material
    const flashcardMaterial = await StudyMaterial.findById(flashcardsId);
    if (!flashcardMaterial || flashcardMaterial.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Flashcards not found'
      });
    }

    // Calculate session statistics
    const { sessionStats, results, cardDifficulties } = sessionData;
    const accuracy = sessionStats.cardsStudied > 0 ? (sessionStats.correct / sessionStats.cardsStudied) * 100 : 0;

    // Update flashcard material with session data
    if (!flashcardMaterial.metadata.spacedRepetitionData) {
      flashcardMaterial.metadata.spacedRepetitionData = {};
    }

    // Merge card difficulties with existing data
    Object.keys(cardDifficulties).forEach(cardIndex => {
      flashcardMaterial.metadata.spacedRepetitionData[cardIndex] = cardDifficulties[cardIndex];
    });

    // Add performance tracking for the session
    const sessionScore = accuracy;
    flashcardMaterial.addPerformanceAttempt(
      sessionScore,
      sessionStats.totalTime,
      Object.keys(results).filter(cardIndex => !results[cardIndex].isCorrect)
    );

    // Update user interaction metrics
    flashcardMaterial.addTimeSpent(sessionStats.totalTime);

    // Update learning outcomes
    const conceptsLearned = Object.keys(results).filter(cardIndex => results[cardIndex].isCorrect);
    flashcardMaterial.updateLearningOutcome({
      conceptsLearned: conceptsLearned.map(index => `Card ${parseInt(index) + 1}`),
      completionRate: accuracy,
      masteryLevel: Math.min(accuracy, flashcardMaterial.learningOutcome.masteryLevel || 0)
    });

    // Save the updated material
    await flashcardMaterial.save();

    // Create AI interaction record for the session completion
    const interaction = new AIInteraction({
      userId,
      interactionType: 'flashcard_session',
      userInput: `Adaptive flashcard session completed: ${flashcardMaterial.title}`,
      aiResponse: `Session completed with ${sessionStats.correct}/${sessionStats.cardsStudied} cards correct (${Math.round(accuracy)}%)`,
      modelUsed: 'adaptive_flashcard_system',
      capability: 'SPACED_REPETITION',
      responseTime: sessionStats.totalTime * 1000, // Convert to milliseconds
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      subject: flashcardMaterial.subject,
      difficulty: flashcardMaterial.difficulty,
      metadata: {
        flashcardsId: flashcardsId,
        accuracy: accuracy,
        sessionStats: sessionStats,
        cardDifficulties: cardDifficulties,
        spacedRepetitionData: flashcardMaterial.metadata.spacedRepetitionData
      }
    });

    await interaction.save();

    res.json({
      success: true,
      message: 'Flashcard session submitted successfully',
      performance: {
        accuracy: accuracy,
        cardsStudied: sessionStats.cardsStudied,
        totalTime: sessionStats.totalTime,
        bestScore: flashcardMaterial.performanceTracking.bestScore,
        averageScore: flashcardMaterial.performanceTracking.averageScore,
        improvementRate: flashcardMaterial.performanceTracking.improvementRate,
        sessions: flashcardMaterial.performanceTracking.attempts.length,
        nextReviewCards: Object.keys(cardDifficulties).filter(cardIndex => 
          cardDifficulties[cardIndex].interval === 1 // Cards due for review tomorrow
        ).length
      }
    });

  } catch (error) {
    console.error('Submit flashcard session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Submit interactive practice problems session results
exports.submitPracticeSession = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { problemsId, sessionData } = req.body;

    // Find the practice problems material
    const practiceMaterial = await StudyMaterial.findById(problemsId);
    if (!practiceMaterial || practiceMaterial.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Practice problems not found'
      });
    }

    // Calculate session statistics
    const { sessionStats, results } = sessionData;
    const accuracy = sessionStats.completed > 0 ? (sessionStats.correct / sessionStats.completed) * 100 : 0;

    // Update practice material with session data
    if (!practiceMaterial.metadata.practiceData) {
      practiceMaterial.metadata.practiceData = {};
    }

    // Store session results
    practiceMaterial.metadata.practiceData.lastSession = {
      sessionStats,
      results,
      timestamp: Date.now()
    };

    // Add performance tracking for the session
    const sessionScore = accuracy;
    const incorrectProblems = Object.keys(results).filter(problemIndex => !results[problemIndex].isCorrect);
    
    practiceMaterial.addPerformanceAttempt(
      sessionScore,
      sessionStats.totalTime,
      incorrectProblems
    );

    // Update user interaction metrics
    practiceMaterial.addTimeSpent(sessionStats.totalTime);

    // Update learning outcomes
    const conceptsLearned = Object.keys(results).filter(problemIndex => results[problemIndex].isCorrect);
    practiceMaterial.updateLearningOutcome({
      conceptsLearned: conceptsLearned.map(index => `Problem ${parseInt(index) + 1}`),
      completionRate: accuracy,
      masteryLevel: Math.max(accuracy, practiceMaterial.learningOutcome.masteryLevel || 0)
    });

    // Save the updated material
    await practiceMaterial.save();

    // Create AI interaction record for the session completion
    const interaction = new AIInteraction({
      userId,
      interactionType: 'practice_session',
      userInput: `Interactive practice session completed: ${practiceMaterial.title}`,
      aiResponse: `Session completed with ${sessionStats.correct}/${sessionStats.completed} problems correct (${Math.round(accuracy)}%)`,
      modelUsed: 'interactive_practice_system',
      capability: 'PROBLEM_SOLVING',
      responseTime: sessionStats.totalTime * 1000, // Convert to milliseconds
      tokenUsage: { prompt: 0, completion: 0, total: 0 },
      subject: practiceMaterial.subject,
      difficulty: practiceMaterial.difficulty,
      metadata: {
        problemsId: problemsId,
        accuracy: accuracy,
        sessionStats: sessionStats,
        hintsUsed: sessionStats.hintsUsed,
        stepsViewed: sessionStats.stepsViewed,
        practiceData: practiceMaterial.metadata.practiceData
      }
    });

    await interaction.save();

    res.json({
      success: true,
      message: 'Practice session submitted successfully',
      performance: {
        accuracy: accuracy,
        problemsCompleted: sessionStats.completed,
        totalTime: sessionStats.totalTime,
        hintsUsed: sessionStats.hintsUsed,
        stepsViewed: sessionStats.stepsViewed,
        bestScore: practiceMaterial.performanceTracking.bestScore,
        averageScore: practiceMaterial.performanceTracking.averageScore,
        improvementRate: practiceMaterial.performanceTracking.improvementRate,
        sessions: practiceMaterial.performanceTracking.attempts.length
      }
    });

  } catch (error) {
    console.error('Submit practice session error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get user's generated content
exports.getUserContent = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { type, limit = 20 } = req.query;

    const studyMaterials = await StudyMaterial.findByUserId(userId, type, limit);

    const contentSummary = studyMaterials.map(material => ({
      id: material._id,
      title: material.title,
      type: material.type,
      subject: material.subject,
      topics: material.topics,
      difficulty: material.difficulty,
      createdAt: material.createdAt,
      views: material.userInteraction.views,
      rating: material.userFeedback.rating,
      estimatedTime: material.metadata.estimatedStudyTime
    }));

    res.json({
      success: true,
      content: contentSummary,
      total: contentSummary.length
    });

  } catch (error) {
    console.error('Get user content error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get specific study material
exports.getStudyMaterial = async (req, res) => {
  try {
    const { uid: userId } = req.user;
    const { materialId } = req.params;

    const material = await StudyMaterial.findById(materialId);
    
    if (!material || material.userId !== userId) {
      return res.status(404).json({
        success: false,
        error: 'Study material not found'
      });
    }

    // Record view
    material.recordView();
    await material.save();

    res.json({
      success: true,
      material: {
        id: material._id,
        title: material.title,
        type: material.type,
        subject: material.subject,
        topics: material.topics,
        difficulty: material.difficulty,
        content: material.content,
        structuredContent: material.structuredContent,
        createdAt: material.createdAt,
        metadata: material.metadata,
        userInteraction: material.userInteraction
      }
    });

  } catch (error) {
    console.error('Get study material error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Helper methods
exports.parseStudyGuideContent = async (content) => {
  const sections = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentSection = null;
  
  lines.forEach(line => {
    line = line.trim();
    
    if (line.match(/^#+\s/) || line.match(/^\d+\./)) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^#+\s|^\d+\.\s/, ''),
        content: '',
        keyPoints: []
      };
    } else if (currentSection) {
      if (line.startsWith('-') || line.startsWith('•')) {
        currentSection.keyPoints.push(line.replace(/^[-•]\s*/, ''));
      } else {
        currentSection.content += line + '\n';
      }
    }
  });
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
};

exports.parseQuizContent = async (content) => {
  const questions = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentQuestion = null;
  let collectingOptions = false;
  
  lines.forEach((line, index) => {
    line = line.trim();
    
    // Match question patterns: "1." or "Question 1:" or "Q1."
    if (line.match(/^\d+\./) || line.match(/^Question\s+\d+:/i) || line.match(/^Q\d+\./i)) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      currentQuestion = {
        question: line.replace(/^\d+\.\s*/, '').replace(/^Question\s+\d+:\s*/i, '').replace(/^Q\d+\.\s*/i, ''),
        options: [],
        correctAnswer: '',
        explanation: ''
      };
      collectingOptions = true;
    } 
    // Match options: "A)", "a)", "(A)", etc.
    else if (collectingOptions && line.match(/^[A-Da-d][\)\.]/) || line.match(/^\([A-Da-d]\)/)) {
      if (currentQuestion) {
        currentQuestion.options.push(line);
      }
    } 
    // Match answer patterns
    else if (line.toLowerCase().startsWith('answer:') || 
             line.toLowerCase().startsWith('correct:') || 
             line.toLowerCase().startsWith('correct answer:')) {
      if (currentQuestion) {
        currentQuestion.correctAnswer = line.replace(/^(answer|correct|correct answer):\s*/i, '');
        collectingOptions = false;
      }
    } 
    // Match explanation patterns
    else if (line.toLowerCase().startsWith('explanation:')) {
      if (currentQuestion) {
        currentQuestion.explanation = line.replace(/^explanation:\s*/i, '');
      }
    }
    // If we're collecting options and this line doesn't match any pattern, it might be a continuation
    else if (collectingOptions && currentQuestion && currentQuestion.options.length > 0) {
      // Check if this could be a continuation of the last option
      const lastOptionIndex = currentQuestion.options.length - 1;
      if (line.length > 0 && !line.match(/^\d+\./) && !line.toLowerCase().startsWith('answer:')) {
        currentQuestion.options[lastOptionIndex] += ' ' + line;
      }
    }
  });
  
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  return questions;
};

exports.parseFlashcardContent = async (content) => {
  const cards = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentCard = null;
  
  lines.forEach(line => {
    line = line.trim();
    
    if (line.toLowerCase().startsWith('front:')) {
      if (currentCard) {
        cards.push(currentCard);
      }
      currentCard = {
        front: line.replace(/^front:\s*/i, ''),
        back: ''
      };
    } else if (line.toLowerCase().startsWith('back:') && currentCard) {
      currentCard.back = line.replace(/^back:\s*/i, '');
    }
  });
  
  if (currentCard) {
    cards.push(currentCard);
  }
  
  return cards;
};

exports.parsePracticeProblems = async (content) => {
  const problems = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentProblem = null;
  let collectingSteps = false;
  
  lines.forEach((line, index) => {
    line = line.trim();
    
    // Match problem patterns: "Problem 1:" or "Problem N:" (but not standalone numbers like "1.")
    if (line.match(/^Problem\s+\d+:/i)) {
      if (currentProblem) {
        problems.push(currentProblem);
      }
      currentProblem = {
        problem: line.replace(/^Problem\s+\d+:\s*/i, ''),
        solution: '',
        steps: [],
        hints: []
      };
      collectingSteps = false;
    } 
    // Match solution pattern
    else if (line.toLowerCase().startsWith('solution:')) {
      if (currentProblem) {
        currentProblem.solution = line.replace(/^solution:\s*/i, '');
      }
    } 
    // Match steps pattern
    else if (line.toLowerCase().startsWith('steps:')) {
      collectingSteps = true;
    } 
    // Match hint pattern
    else if (line.toLowerCase().startsWith('hint:')) {
      if (currentProblem) {
        currentProblem.hints.push(line.replace(/^hint:\s*/i, ''));
      }
      collectingSteps = false;
    }
    // Collect steps (numbered or bulleted)
    else if (collectingSteps && (line.match(/^\d+\./) || line.startsWith('-') || line.startsWith('•'))) {
      if (currentProblem) {
        const step = line.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '');
        currentProblem.steps.push(step);
      }
    }
    // Handle continuation lines for steps
    else if (collectingSteps && currentProblem && currentProblem.steps.length > 0 && line.length > 0) {
      // Check if this could be a continuation of the last step
      if (!line.toLowerCase().startsWith('hint:') && !line.toLowerCase().startsWith('solution:') && !line.match(/^Problem\s+\d+:/i)) {
        const lastStepIndex = currentProblem.steps.length - 1;
        currentProblem.steps[lastStepIndex] += ' ' + line;
      }
    }
  });
  
  if (currentProblem) {
    problems.push(currentProblem);
  }
  
  return problems;
};

exports.extractPrimarySubject = async (topics) => {
  // Simple subject extraction from topics
  const subjectMapping = {
    'math': ['algebra', 'calculus', 'geometry', 'trigonometry', 'statistics'],
    'science': ['physics', 'chemistry', 'biology'],
    'programming': ['javascript', 'python', 'java', 'coding', 'algorithm'],
    'english': ['grammar', 'writing', 'literature', 'essay'],
    'history': ['historical', 'ancient', 'modern', 'civilization']
  };
  
  for (const [subject, keywords] of Object.entries(subjectMapping)) {
    if (topics.some(topic => 
      keywords.some(keyword => topic.toLowerCase().includes(keyword))
    )) {
      return subject;
    }
  }
  
  return topics[0] || 'general';
};

exports.calculateEstimatedStudyTime = (content) => {
  // Estimate reading time: ~200 words per minute
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / 200);
};

exports.extractLearningObjectives = (content) => {
  // Extract learning objectives from content
  const objectives = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (line.toLowerCase().includes('objective') || 
        line.toLowerCase().includes('goal') ||
        line.toLowerCase().includes('learn')) {
      objectives.push(line.trim());
    }
  });
  
  return objectives.length > 0 ? objectives : ['Master the key concepts'];
};

// Enhanced study guide content parsing with template support
exports.parseEnhancedStudyGuideContent = async (content, template) => {
  const sections = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if this is a section header
    if (trimmedLine.startsWith('#') || 
        trimmedLine.startsWith('##') ||
        trimmedLine.match(/^[A-Z][^.]*:$/) ||
        trimmedLine.match(/^\d+\./)) {
      
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          ...currentSection,
          content: currentContent.join('\n').trim(),
          keyPoints: this.extractKeyPoints(currentContent.join('\n')),
          examples: this.extractExamples(currentContent.join('\n'))
        });
      }
      
      // Start new section
      currentSection = {
        title: trimmedLine.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').replace(/:$/, ''),
        order: sections.length + 1,
        template: template
      };
      currentContent = [];
    } else {
      if (currentSection) {
        currentContent.push(line);
      }
    }
  }
  
  // Add the last section
  if (currentSection) {
    sections.push({
      ...currentSection,
      content: currentContent.join('\n').trim(),
      keyPoints: this.extractKeyPoints(currentContent.join('\n')),
      examples: this.extractExamples(currentContent.join('\n'))
    });
  }
  
  return sections;
};

// Extract key points from content
exports.extractKeyPoints = (content) => {
  const keyPoints = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('•') || 
        trimmedLine.startsWith('-') ||
        trimmedLine.startsWith('*') ||
        trimmedLine.match(/^\d+\./)) {
      keyPoints.push(trimmedLine.replace(/^[•\-\*]\s*/, '').replace(/^\d+\.\s*/, ''));
    }
  });
  
  return keyPoints;
};

// Extract examples from content
exports.extractExamples = (content) => {
  const examples = [];
  const lines = content.split('\n');
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.toLowerCase().includes('example') ||
        trimmedLine.toLowerCase().includes('for instance') ||
        trimmedLine.toLowerCase().includes('such as')) {
      examples.push(trimmedLine);
    }
  });
  
  return examples;
};

// Calculate content quality score
exports.calculateContentQuality = async (content) => {
  let score = 0;
  const wordCount = content.split(/\s+/).length;
  
  // Length factor (20% of score)
  if (wordCount > 1000) score += 20;
  else if (wordCount > 500) score += 15;
  else if (wordCount > 200) score += 10;
  else score += 5;
  
  // Structure factor (30% of score)
  const sections = (content.match(/^#/gm) || []).length;
  if (sections > 5) score += 30;
  else if (sections > 3) score += 25;
  else if (sections > 1) score += 20;
  else score += 10;
  
  // Examples factor (20% of score)
  const examples = (content.match(/example|for instance|such as/gi) || []).length;
  if (examples > 5) score += 20;
  else if (examples > 3) score += 15;
  else if (examples > 1) score += 10;
  else score += 5;
  
  // Key points factor (20% of score)
  const keyPoints = (content.match(/^[•\-\*]/gm) || []).length;
  if (keyPoints > 10) score += 20;
  else if (keyPoints > 5) score += 15;
  else if (keyPoints > 2) score += 10;
  else score += 5;
  
  // Readability factor (10% of score)
  const averageWordsPerSentence = wordCount / (content.split(/[.!?]+/).length || 1);
  if (averageWordsPerSentence < 20) score += 10;
  else if (averageWordsPerSentence < 25) score += 7;
  else score += 5;
  
  return Math.min(score, 100);
};

// Calculate completeness score
exports.calculateCompleteness = (structuredContent) => {
  let score = 0;
  const sections = structuredContent.length;
  
  // Number of sections (40% of score)
  if (sections > 5) score += 40;
  else if (sections > 3) score += 30;
  else if (sections > 1) score += 20;
  else score += 10;
  
  // Key points coverage (30% of score)
  const totalKeyPoints = structuredContent.reduce((sum, section) => sum + (section.keyPoints?.length || 0), 0);
  if (totalKeyPoints > 15) score += 30;
  else if (totalKeyPoints > 10) score += 25;
  else if (totalKeyPoints > 5) score += 20;
  else score += 10;
  
  // Examples coverage (20% of score)
  const totalExamples = structuredContent.reduce((sum, section) => sum + (section.examples?.length || 0), 0);
  if (totalExamples > 5) score += 20;
  else if (totalExamples > 3) score += 15;
  else if (totalExamples > 1) score += 10;
  else score += 5;
  
  // Content depth (10% of score)
  const averageContentLength = structuredContent.reduce((sum, section) => sum + (section.content?.length || 0), 0) / sections;
  if (averageContentLength > 500) score += 10;
  else if (averageContentLength > 300) score += 7;
  else score += 5;
  
  return Math.min(score, 100);
};

// Validate difficulty level accuracy
exports.validateDifficultyLevel = (content, targetDifficulty) => {
  const complexityIndicators = {
    beginner: ['basic', 'simple', 'introduction', 'fundamental', 'overview'],
    intermediate: ['analysis', 'compare', 'evaluate', 'application', 'implementation'],
    advanced: ['synthesis', 'critique', 'advanced', 'complex', 'theoretical', 'comprehensive']
  };
  
  const contentLower = content.toLowerCase();
  let score = 0;
  
  const targetIndicators = complexityIndicators[targetDifficulty] || [];
  targetIndicators.forEach(indicator => {
    if (contentLower.includes(indicator)) {
      score += 20;
    }
  });
  
  // Check if content doesn't contain indicators from other difficulty levels
  Object.entries(complexityIndicators).forEach(([level, indicators]) => {
    if (level !== targetDifficulty) {
      indicators.forEach(indicator => {
        if (contentLower.includes(indicator)) {
          score -= 10;
        }
      });
    }
  });
  
  return Math.max(0, Math.min(score, 100));
};