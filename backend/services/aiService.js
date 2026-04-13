// AI Service Layer - Centralized AI processing service
const { aiClient } = require('../groqClient');

class AIService {
  constructor() {
    this.aiClient = aiClient;
    this.rateLimitMap = new Map(); // Simple in-memory rate limiting
  }

  // CRITICAL FIX: Enhanced rate limiting check with better limits for authenticated users
  checkRateLimit(userId, endpoint) {
    const now = Date.now();
    const key = `${userId}:${endpoint}`;
    const userRequests = this.rateLimitMap.get(key) || [];
    
    // Filter requests from last minute
    const recentRequests = userRequests.filter(time => now - time < 60000);
    
    // CRITICAL FIX: Increased rate limits for authenticated users (100 requests/min for most endpoints)
    const rateLimits = {
      'tutoring': 100,
      'tutor-question': 100,
      'learning-path': 50,
      'study-guide': 50,
      'quiz': 50,
      'flashcards': 50,
      'practice-problems': 50,
      'code-review': 100,
      'writing-assistance': 100,
      'math-solving': 100,
      'research': 50,
      'analysis': 50,
      'learning-style': 30,
      'knowledge-gaps': 30
    };
    
    const limit = rateLimits[endpoint] || 100; // Default to 100 requests/min
    
    if (recentRequests.length >= limit) {
      console.warn(`Rate limit exceeded for user ${userId} on endpoint ${endpoint}: ${recentRequests.length}/${limit}`);
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.rateLimitMap.set(key, recentRequests);
    
    return true;
  }

  // AI Tutoring Services
  async startTutoringSession(userId, subject, difficulty = 'intermediate') {
    if (!this.checkRateLimit(userId, 'tutoring')) {
      throw new Error('Rate limit exceeded for tutoring sessions');
    }

    const prompt = `
      Start a tutoring session for ${subject} at ${difficulty} level.
      Introduce yourself as an AI tutor and ask what specific topic the student would like to explore.
      Be encouraging and adapt your teaching style to help the student learn effectively.
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'TUTORING', {
          userId,
          maxTokens: 400,
          temperature: 0.7
        });
      });
    } catch (error) {
      console.error(`Tutoring session failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async askTutorQuestion(userId, question, context = [], learningStyle = 'visual') {
    if (!this.checkRateLimit(userId, 'tutor-question')) {
      throw new Error('Rate limit exceeded for tutor questions');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateTutoringResponse(question, context, learningStyle);
      });
    } catch (error) {
      console.error(`Tutor question failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async generateLearningPath(userId, subject, currentLevel, goals) {
    if (!this.checkRateLimit(userId, 'learning-path')) {
      throw new Error('Rate limit exceeded for learning path generation');
    }

    const prompt = `
      Create a personalized learning path for:
      Subject: ${subject}
      Current Level: ${currentLevel}
      Learning Goals: ${goals}
      
      Provide:
      1. Step-by-step learning progression
      2. Key milestones and checkpoints
      3. Recommended resources and materials
      4. Practice exercises for each step
      5. Assessment criteria
      
      Make it engaging and achievable.
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'TUTORING', {
          userId,
          maxTokens: 1000,
          temperature: 0.6
        });
      });
    } catch (error) {
      console.error(`Learning path generation failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Content Generation Services
  async generateStudyGuide(userId, topics, difficulty = 'intermediate', format = 'comprehensive') {
    if (!this.checkRateLimit(userId, 'study-guide')) {
      throw new Error('Rate limit exceeded for study guide generation');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateStudyGuide(topics, difficulty);
      });
    } catch (error) {
      console.error(`Study guide generation failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Enhanced study guide generation with templates and customization
  async generateEnhancedStudyGuide(userId, topics, difficulty = 'intermediate', options = {}) {
    if (!this.checkRateLimit(userId, 'study-guide')) {
      throw new Error('Rate limit exceeded for study guide generation');
    }

    const {
      template = 'comprehensive',
      customization = {},
      learningObjectives = [],
      studyTimeTarget = 60,
      includeExamples = true,
      includeKeyPoints = true,
      includeQuizQuestions = false
    } = options;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateEnhancedStudyGuide(
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
      });
    } catch (error) {
      console.error(`Enhanced study guide generation failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async generateQuiz(userId, topics, questionCount = 5, difficulty = 'intermediate', quizType = 'multiple-choice') {
    if (!this.checkRateLimit(userId, 'quiz')) {
      throw new Error('Rate limit exceeded for quiz generation');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateQuiz(topics, questionCount, difficulty);
      });
    } catch (error) {
      console.error(`Quiz generation failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async generateFlashcards(userId, content, count = 10) {
    if (!this.checkRateLimit(userId, 'flashcards')) {
      throw new Error('Rate limit exceeded for flashcard generation');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateFlashcards(content, count);
      });
    } catch (error) {
      console.error(`Flashcard generation failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async generatePracticeProblems(userId, subject, difficulty = 'intermediate', count = 5) {
    if (!this.checkRateLimit(userId, 'practice-problems')) {
      throw new Error('Rate limit exceeded for practice problem generation');
    }

    const prompt = `
      Generate ${count} practice problems for ${subject} at ${difficulty} level.
      
      Format each problem EXACTLY as shown in this example:
      
      Problem 1: Calculate the derivative of f(x) = 3x² + 2x - 1
      Solution: f'(x) = 6x + 2
      Steps:
      1. Apply the power rule to each term
      2. Derivative of 3x² is 6x
      3. Derivative of 2x is 2
      4. Derivative of constant -1 is 0
      5. Combine all terms: 6x + 2
      Hint: Remember the power rule: d/dx(x^n) = n*x^(n-1)
      
      Problem 2: Solve the equation 2x + 5 = 13
      Solution: x = 4
      Steps:
      1. Subtract 5 from both sides: 2x = 8
      2. Divide both sides by 2: x = 4
      3. Check: 2(4) + 5 = 13 ✓
      Hint: Isolate the variable by performing inverse operations
      
      REQUIREMENTS:
      - Start each problem with "Problem N:"
      - Include "Solution:" with the final answer
      - Include "Steps:" with numbered step-by-step solution
      - Include "Hint:" with a helpful hint for solving
      - Make problems progressively challenging
      - Ensure all steps are clear and educational
      - Include verification steps where applicable
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'CONTENT_GENERATION', {
          userId,
          maxTokens: 1500,
          temperature: 0.4
        });
      });
    } catch (error) {
      console.error(`Practice problems generation failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Intelligent Assistance Services
  async reviewCode(userId, code, language = 'javascript', focusAreas = []) {
    if (!this.checkRateLimit(userId, 'code-review')) {
      throw new Error('Rate limit exceeded for code review');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.reviewCode(code, language);
      });
    } catch (error) {
      console.error(`Code review failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async assistWithWriting(userId, text, assistanceType = 'grammar') {
    if (!this.checkRateLimit(userId, 'writing-assistance')) {
      throw new Error('Rate limit exceeded for writing assistance');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.assistWithWriting(text, assistanceType);
      });
    } catch (error) {
      console.error(`Writing assistance failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async solveMathProblem(userId, problem, showSteps = true, difficulty = 'intermediate') {
    if (!this.checkRateLimit(userId, 'math-solving')) {
      throw new Error('Rate limit exceeded for math solving');
    }

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.solveMathProblem(problem, showSteps);
      });
    } catch (error) {
      console.error(`Math problem solving failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async researchAssistance(userId, topic, sources = 'academic', depth = 'moderate') {
    if (!this.checkRateLimit(userId, 'research')) {
      throw new Error('Rate limit exceeded for research assistance');
    }

    const prompt = `
      Provide research assistance for: ${topic}
      Source preference: ${sources}
      Depth level: ${depth}
      
      Please help with:
      1. Key research directions and questions
      2. Relevant academic sources and citations
      3. Important concepts and terminology
      4. Current state of research in this area
      5. Suggested further reading
      
      Focus on academic quality and reliability.
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'RESEARCH_ASSISTANT', {
          userId,
          maxTokens: 800,
          temperature: 0.4
        });
      });
    } catch (error) {
      console.error(`Research assistance failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Analytics and Insights
  async analyzeConversation(userId, conversationHistory) {
    if (!this.checkRateLimit(userId, 'analysis')) {
      throw new Error('Rate limit exceeded for conversation analysis');
    }

    const prompt = `
      Analyze this conversation history to provide insights:
      
      ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}
      
      Provide:
      1. Key topics discussed
      2. Learning patterns observed
      3. Areas of strength and weakness
      4. Recommended next steps
      5. Suggested study materials
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'GENERAL', {
          userId,
          maxTokens: 600,
          temperature: 0.3
        });
      });
    } catch (error) {
      console.error(`Conversation analysis failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  async detectLearningStyle(userId, interactionHistory) {
    if (!this.checkRateLimit(userId, 'learning-style')) {
      throw new Error('Rate limit exceeded for learning style detection');
    }

    const prompt = `
      Analyze these user interactions to detect learning style preferences:
      
      ${interactionHistory.map(interaction => `${interaction.type}: ${interaction.content}`).join('\n')}
      
      Determine:
      1. Primary learning style (visual, auditory, kinesthetic, reading/writing)
      2. Learning preferences and patterns
      3. Effective teaching strategies for this learner
      4. Recommended content formats
      5. Engagement strategies
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'GENERAL', {
          userId,
          maxTokens: 500,
          temperature: 0.2
        });
      });
    } catch (error) {
      console.error(`Learning style detection failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Knowledge gap analysis
  async analyzeKnowledgeGaps(userId, subject, assessmentResults) {
    if (!this.checkRateLimit(userId, 'knowledge-gaps')) {
      throw new Error('Rate limit exceeded for knowledge gap analysis');
    }

    const prompt = `
      Analyze knowledge gaps in ${subject} based on these assessment results:
      
      ${JSON.stringify(assessmentResults, null, 2)}
      
      Provide:
      1. Identified knowledge gaps
      2. Priority areas for improvement
      3. Prerequisite concepts to review
      4. Recommended learning sequence
      5. Specific study strategies
    `;

    try {
      return await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse(prompt, 'GENERAL', {
          userId,
          maxTokens: 700,
          temperature: 0.3
        });
      });
    } catch (error) {
      console.error(`Knowledge gaps analysis failed for user ${userId}:`, error);
      throw new Error(this.formatError(error));
    }
  }

  // Content filtering and safety
  filterContent(content) {
    // Basic content filtering - can be enhanced with more sophisticated filters
    const inappropriatePatterns = [
      /\b(hate|violence|inappropriate|harmful)\b/gi,
      // Add more patterns as needed
    ];

    let filteredContent = content;
    inappropriatePatterns.forEach(pattern => {
      filteredContent = filteredContent.replace(pattern, '[FILTERED]');
    });

    return filteredContent;
  }

  // CRITICAL FIX: Enhanced error handling with exponential backoff retry logic
  async callWithRetry(operation, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on authentication or rate limit errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          throw error;
        }
        
        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate exponential backoff delay
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`AI service attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  // Enhanced error handling for user-friendly messages
  formatError(error) {
    if (error.response?.status === 429) {
      return 'AI service is temporarily busy. Please try again in a moment.';
    }
    if (error.response?.status >= 500) {
      return 'AI service is temporarily unavailable. Please try again later.';
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND') {
      return 'Network connection issue. Please check your internet connection.';
    }
    if (error.response?.data?.error?.message) {
      return `AI Error: ${error.response.data.error.message}`;
    }
    return 'AI service encountered an error. Please try again.';
  }

  // Health check with enhanced monitoring
  async healthCheck() {
    try {
      const startTime = Date.now();
      const response = await this.callWithRetry(async () => {
        return await this.aiClient.generateResponse('Test connection', 'GENERAL', {
          maxTokens: 10,
          temperature: 0.1
        });
      });
      
      const responseTime = Date.now() - startTime;
      
      return { 
        status: 'healthy', 
        message: 'AI service is operational',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return { 
        status: 'error', 
        message: this.formatError(error),
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Create singleton instance
const aiService = new AIService();

module.exports = aiService;