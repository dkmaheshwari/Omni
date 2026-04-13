// backend/groqClient.js

const axios = require("axios");

// AI Model configurations
const AI_MODELS = {
  GENERAL: "llama-3.3-70b-versatile",
  TUTORING: "llama-3.3-70b-versatile",
  CONTENT_GENERATION: "llama-3.3-70b-versatile",
  CODE_REVIEW: "llama-3.3-70b-versatile",
  MATH_SOLVING: "llama-3.3-70b-versatile"
};

// System prompts for different AI capabilities
const SYSTEM_PROMPTS = {
  GENERAL: "You are a helpful academic assistant.",
  TUTORING: "You are an expert AI tutor. Provide personalized, step-by-step explanations. Ask follow-up questions to ensure understanding. Adapt your teaching style to the student's needs.",
  CONTENT_GENERATION: "You are an expert content generator for educational materials. Create clear, structured, and engaging study materials.",
  CODE_REVIEW: "You are an expert code reviewer. Provide detailed, constructive feedback on code quality, best practices, and potential improvements.",
  MATH_SOLVING: "You are an expert mathematics tutor. Provide step-by-step solutions with clear explanations for each step.",
  WRITING_ASSISTANT: "You are an expert writing assistant. Help improve grammar, style, clarity, and structure of written content.",
  RESEARCH_ASSISTANT: "You are an expert research assistant. Help find relevant academic sources and provide proper citations."
};

// Enhanced AI client with multiple capabilities
class AdvancedAIClient {
  constructor() {
    this.baseURL = "https://api.groq.com/openai/v1/chat/completions";
    this.apiKey = process.env.GROQ_API_KEY;
  }

  async generateResponse(prompt, capability = 'GENERAL', options = {}) {
    const {
      maxTokens = 500,
      temperature = 0.7,
      context = [],
      userId = null
    } = options;

    const systemPrompt = SYSTEM_PROMPTS[capability] || SYSTEM_PROMPTS.GENERAL;
    const model = AI_MODELS[capability] || AI_MODELS.GENERAL;

    const messages = [
      { role: "system", content: systemPrompt },
      ...context,
      { role: "user", content: prompt }
    ];

    try {
      const response = await axios.post(
        this.baseURL,
        {
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        content: response.data.choices[0].message.content,
        model: model,
        capability: capability,
        usage: response.data.usage,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('AI Client Error:', error.response?.data || error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  // Tutoring-specific methods
  async generateTutoringResponse(prompt, context = [], learningStyle = 'visual') {
    const enhancedPrompt = `
      Learning Style: ${learningStyle}
      Student Question: ${prompt}
      
      Please provide a personalized explanation that:
      1. Addresses the specific question
      2. Adapts to the ${learningStyle} learning style
      3. Includes follow-up questions to check understanding
      4. Suggests next steps for deeper learning
    `;

    return await this.generateResponse(enhancedPrompt, 'TUTORING', {
      context,
      maxTokens: 800,
      temperature: 0.6
    });
  }

  // Content generation methods
  async generateStudyGuide(topics, difficulty = 'intermediate') {
    const prompt = `
      Create a comprehensive study guide for the following topics: ${topics.join(', ')}
      Difficulty level: ${difficulty}
      
      Include:
      1. Key concepts and definitions
      2. Important formulas or principles
      3. Practice questions
      4. Summary points
      5. Additional resources for further study
    `;

    return await this.generateResponse(prompt, 'CONTENT_GENERATION', {
      maxTokens: 1000,
      temperature: 0.5
    });
  }

  // Enhanced study guide generation with templates and customization
  async generateEnhancedStudyGuide(topics, difficulty = 'intermediate', options = {}) {
    const {
      template = 'comprehensive',
      customization = {},
      learningObjectives = [],
      studyTimeTarget = 60,
      includeExamples = true,
      includeKeyPoints = true,
      includeQuizQuestions = false
    } = options;

    // Template-specific prompts
    const templatePrompts = {
      comprehensive: `Create a comprehensive study guide`,
      outline: `Create a detailed outline-style study guide`,
      flashcard: `Create a flashcard-style study guide with key terms and definitions`,
      visual: `Create a visual study guide with diagrams and concept maps`,
      quick_review: `Create a quick review study guide focusing on essential points`,
      exam_prep: `Create an exam preparation study guide with practice questions`
    };

    const basePrompt = templatePrompts[template] || templatePrompts.comprehensive;
    
    let prompt = `
      ${basePrompt} for the following topics: ${topics.join(', ')}
      Difficulty level: ${difficulty}
      Target study time: ${studyTimeTarget} minutes
      
      ${learningObjectives.length > 0 ? `Learning Objectives:
      ${learningObjectives.map(obj => `- ${obj}`).join('\n')}` : ''}
      
      Structure the guide with:
      1. Clear section headers
      2. ${includeKeyPoints ? 'Key points for each section' : 'Detailed explanations'}
      3. ${includeExamples ? 'Practical examples and applications' : 'Theoretical concepts'}
      4. Summary of main concepts
      ${includeQuizQuestions ? '5. Practice questions at the end' : ''}
      
      ${customization.focusAreas ? `Focus especially on: ${customization.focusAreas.join(', ')}` : ''}
      ${customization.excludeTopics ? `Exclude: ${customization.excludeTopics.join(', ')}` : ''}
      ${customization.additionalRequirements ? `Additional requirements: ${customization.additionalRequirements}` : ''}
      
      Format the response with clear markdown headers and bullet points.
    `;

    return await this.generateResponse(prompt, 'CONTENT_GENERATION', {
      maxTokens: 2000,
      temperature: 0.4 // Lower temperature for more structured output
    });
  }

  async generateQuiz(topics, questionCount = 5, difficulty = 'intermediate') {
    const prompt = `
      Create a ${questionCount}-question quiz on: ${topics.join(', ')}
      Difficulty level: ${difficulty}
      
      Format each question EXACTLY as shown in this example:
      
      1. What is the capital of France?
      A) London
      B) Paris
      C) Berlin
      D) Madrid
      Answer: B) Paris
      Explanation: Paris is the capital and largest city of France.
      
      2. Which planet is closest to the Sun?
      A) Venus
      B) Mercury
      C) Earth
      D) Mars
      Answer: B) Mercury
      Explanation: Mercury is the innermost planet in our solar system.
      
      REQUIREMENTS:
      - Number each question (1., 2., 3., etc.)
      - Provide exactly 4 options labeled A), B), C), D)
      - Include "Answer:" followed by the correct option
      - Include "Explanation:" with a brief explanation
      - Ensure questions test understanding, not just memorization
      - Make sure each question is complete and well-formed
    `;

    return await this.generateResponse(prompt, 'CONTENT_GENERATION', {
      maxTokens: 1200,
      temperature: 0.4
    });
  }

  async generateFlashcards(content, count = 10) {
    const prompt = `
      Create ${count} flashcards from this content: ${content}
      
      Format each flashcard as:
      Front: [Question or term]
      Back: [Answer or definition]
      
      Focus on key concepts, definitions, and important facts.
    `;

    return await this.generateResponse(prompt, 'CONTENT_GENERATION', {
      maxTokens: 600,
      temperature: 0.3
    });
  }

  // Intelligent assistance methods
  async reviewCode(code, language = 'javascript') {
    const prompt = `
      Review this ${language} code and provide detailed feedback:
      
      \`\`\`${language}
      ${code}
      \`\`\`
      
      Please analyze:
      1. Code quality and best practices
      2. Potential bugs or issues
      3. Performance improvements
      4. Security considerations
      5. Suggestions for refactoring
    `;

    return await this.generateResponse(prompt, 'CODE_REVIEW', {
      maxTokens: 800,
      temperature: 0.3
    });
  }

  async assistWithWriting(text, assistanceType = 'grammar') {
    const prompt = `
      Provide ${assistanceType} assistance for this text:
      
      "${text}"
      
      Please help with:
      1. Grammar and spelling corrections
      2. Style and clarity improvements
      3. Structure and flow suggestions
      4. Word choice enhancements
    `;

    return await this.generateResponse(prompt, 'WRITING_ASSISTANT', {
      maxTokens: 600,
      temperature: 0.4
    });
  }

  async solveMathProblem(problem, showSteps = true) {
    const prompt = `
      Solve this math problem: ${problem}
      
      ${showSteps ? 'Provide step-by-step solution with explanations for each step.' : 'Provide the solution with brief explanation.'}
      
      Include:
      1. Problem analysis
      2. Solution steps
      3. Final answer
      4. Key concepts used
    `;

    return await this.generateResponse(prompt, 'MATH_SOLVING', {
      maxTokens: 700,
      temperature: 0.2
    });
  }
}

// Create singleton instance
const aiClient = new AdvancedAIClient();

// Legacy compatibility
exports.generateAIReply = async (prompt) => {
  const response = await aiClient.generateResponse(prompt);
  return response.content;
};

// Export the enhanced client
exports.AdvancedAIClient = AdvancedAIClient;
exports.aiClient = aiClient;
