// backend/utils/aiDecisionEngine.test.js - AI decision engine tests (85% coverage target)
const {
  shouldAIRespond,
  detectQuestion,
  detectAcademicIntent,
  analyzeConversationContext,
  determineTutorMode,
  calculateResponsePriority,
  filterInappropriateContent,
  generateContextualPrompt,
} = require('../utils/aiDecisionEngine');

// Mock thread and message data
const createMockThread = (overrides = {}) => ({
  _id: 'thread-123',
  title: 'Study Group Discussion',
  participants: ['student1@example.com', 'student2@example.com'],
  isPublic: true,
  subject: 'Computer Science',
  ...overrides,
});

const createMockMessage = (overrides = {}) => ({
  _id: 'message-123',
  content: 'Test message content',
  sender: 'student1@example.com',
  isAI: false,
  timestamp: new Date().toISOString(),
  ...overrides,
});

describe('AI Response Decision Logic', () => {
  describe('shouldAIRespond', () => {
    it('should respond to direct AI mentions in multi-user threads', () => {
      const thread = createMockThread({ participants: ['user1@example.com', 'user2@example.com'] });
      const message = createMockMessage({ content: 'Hey AI, can you help with this math problem?' });
      const recentMessages = [message];

      const result = shouldAIRespond(message, thread, recentMessages);
      
      expect(result.shouldRespond).toBe(true);
      expect(result.reason).toContain('direct mention');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should respond to questions in solo learning mode', () => {
      const thread = createMockThread({ participants: ['student@example.com'] }); // Solo thread
      const message = createMockMessage({ content: 'What is the difference between let and var in JavaScript?' });
      const recentMessages = [message];

      const result = shouldAIRespond(message, thread, recentMessages);
      
      expect(result.shouldRespond).toBe(true);
      expect(result.reason).toContain('solo mode');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not respond to casual conversation in multi-user threads', () => {
      const thread = createMockThread({ participants: ['user1@example.com', 'user2@example.com'] });
      const message = createMockMessage({ content: 'Hey, how was your weekend?' });
      const recentMessages = [message];

      const result = shouldAIRespond(message, thread, recentMessages);
      
      expect(result.shouldRespond).toBe(false);
      expect(result.reason).toContain('casual conversation');
      expect(result.confidence).toBeLessThan(0.3);
    });

    it('should respond to academic content even without direct mention', () => {
      const thread = createMockThread({ 
        participants: ['user1@example.com', 'user2@example.com'],
        subject: 'Mathematics'
      });
      const message = createMockMessage({ 
        content: 'I\'m struggling with calculus derivatives. The chain rule is confusing.' 
      });
      const recentMessages = [message];

      const result = shouldAIRespond(message, thread, recentMessages);
      
      expect(result.shouldRespond).toBe(true);
      expect(result.reason).toContain('academic content');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should consider conversation context and timing', () => {
      const thread = createMockThread({ participants: ['user1@example.com', 'user2@example.com'] });
      const oldMessage = createMockMessage({ 
        content: 'AI, explain photosynthesis',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      });
      const newMessage = createMockMessage({ 
        content: 'Thanks, that was helpful!' 
      });
      const recentMessages = [oldMessage, newMessage];

      const result = shouldAIRespond(newMessage, thread, recentMessages);
      
      // Should not respond to thanks message, but context should show recent AI interaction
      expect(result.shouldRespond).toBe(false);
      expect(result.context.hasRecentAIInteraction).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      const testCases = [
        { message: null, thread: createMockThread(), recentMessages: [] },
        { message: createMockMessage(), thread: null, recentMessages: [] },
        { message: createMockMessage({ content: '' }), thread: createMockThread(), recentMessages: [] },
        { message: createMockMessage(), thread: createMockThread(), recentMessages: null },
      ];

      testCases.forEach(({ message, thread, recentMessages }) => {
        expect(() => shouldAIRespond(message, thread, recentMessages)).not.toThrow();
        const result = shouldAIRespond(message, thread, recentMessages);
        expect(result).toHaveProperty('shouldRespond');
        expect(result).toHaveProperty('confidence');
      });
    });
  });

  describe('detectQuestion', () => {
    it('should detect explicit questions', () => {
      const questions = [
        'What is the meaning of life?',
        'How do I solve this equation?',
        'Can you explain photosynthesis?',
        'Why does this code not work?',
        'Is this the correct approach?',
        'Where can I find more information?',
        'When should I use recursion?',
        'Who invented the computer?',
      ];

      questions.forEach(question => {
        const result = detectQuestion(question);
        expect(result.isQuestion).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.questionType).toBeTruthy();
      });
    });

    it('should detect implicit questions and help requests', () => {
      const implicitQuestions = [
        'I need help with this problem',
        'I\'m confused about arrays',
        'This doesn\'t make sense',
        'I\'m stuck on question 5',
        'Could someone clarify this concept',
        'I don\'t understand the solution',
      ];

      implicitQuestions.forEach(question => {
        const result = detectQuestion(question);
        expect(result.isQuestion).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.5);
      });
    });

    it('should not detect statements as questions', () => {
      const statements = [
        'I finished the assignment',
        'The weather is nice today',
        'I agree with your point',
        'Here is my solution',
        'Thanks for the help',
        'Good morning everyone',
      ];

      statements.forEach(statement => {
        const result = detectQuestion(statement);
        expect(result.isQuestion).toBe(false);
        expect(result.confidence).toBeLessThan(0.3);
      });
    });

    it('should classify question types correctly', () => {
      const questionTypes = [
        { text: 'What is JavaScript?', expectedType: 'definition' },
        { text: 'How do I implement binary search?', expectedType: 'how-to' },
        { text: 'Why is my code throwing an error?', expectedType: 'debugging' },
        { text: 'Can you explain the concept?', expectedType: 'explanation' },
        { text: 'Is this approach correct?', expectedType: 'validation' },
      ];

      questionTypes.forEach(({ text, expectedType }) => {
        const result = detectQuestion(text);
        expect(result.isQuestion).toBe(true);
        expect(result.questionType).toContain(expectedType);
      });
    });
  });

  describe('detectAcademicIntent', () => {
    it('should detect academic subjects and topics', () => {
      const academicContent = [
        'Explain photosynthesis in plants',
        'Solve this calculus derivative problem',
        'JavaScript array methods explanation',
        'World War II historical events',
        'Quantum physics principles',
        'Database normalization concepts',
        'Linear algebra matrix operations',
        'Organic chemistry reactions',
      ];

      academicContent.forEach(content => {
        const result = detectAcademicIntent(content);
        expect(result.isAcademic).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.subject).toBeTruthy();
      });
    });

    it('should identify learning indicators', () => {
      const learningContent = [
        'I need to study for my exam',
        'Help me understand this concept',
        'Practice problems for homework',
        'Research project on climate change',
        'Study group for final exams',
        'Learning objectives for today',
      ];

      learningContent.forEach(content => {
        const result = detectAcademicIntent(content);
        expect(result.isAcademic).toBe(true);
        expect(result.indicators).toContain('study');
      });
    });

    it('should not classify casual content as academic', () => {
      const casualContent = [
        'What\'s for lunch today?',
        'Did you watch the game last night?',
        'Happy birthday!',
        'See you at the party',
        'Nice weather we\'re having',
        'I bought a new phone',
      ];

      casualContent.forEach(content => {
        const result = detectAcademicIntent(content);
        expect(result.isAcademic).toBe(false);
        expect(result.confidence).toBeLessThan(0.3);
      });
    });

    it('should handle mixed content appropriately', () => {
      const mixedContent = [
        'After lunch, let\'s study calculus together',
        'The weather is nice, perfect for outdoor physics experiments',
        'Happy birthday! Did you finish your math homework?',
      ];

      mixedContent.forEach(content => {
        const result = detectAcademicIntent(content);
        // Should detect academic elements even in mixed context
        expect(result.isAcademic).toBe(true);
        expect(result.confidence).toBeGreaterThan(0.4);
      });
    });
  });

  describe('analyzeConversationContext', () => {
    it('should analyze conversation flow and topics', () => {
      const messages = [
        createMockMessage({ content: 'Let\'s study JavaScript today', sender: 'user1@example.com' }),
        createMockMessage({ content: 'Great! I need help with async/await', sender: 'user2@example.com' }),
        createMockMessage({ content: 'AI, can you explain promises first?', sender: 'user1@example.com' }),
        createMockMessage({ content: 'Sure! Promises are...', sender: 'ai@system.com', isAI: true }),
      ];

      const result = analyzeConversationContext(messages);
      
      expect(result.topics).toContain('JavaScript');
      expect(result.hasRecentAIInteraction).toBe(true);
      expect(result.conversationFlow.length).toBeGreaterThan(0);
      expect(result.dominantTone).toBeTruthy();
    });

    it('should detect conversation momentum', () => {
      const activeMessages = Array.from({ length: 5 }, (_, i) => 
        createMockMessage({ 
          content: `Message ${i + 1}`,
          timestamp: new Date(Date.now() - i * 30000).toISOString() // 30 seconds apart
        })
      );

      const result = analyzeConversationContext(activeMessages);
      expect(result.momentum).toBeGreaterThan(0.5); // High momentum
      expect(result.participationLevel).toBeGreaterThan(0.3);
    });

    it('should handle empty or sparse conversations', () => {
      const result = analyzeConversationContext([]);
      expect(result.topics).toEqual([]);
      expect(result.momentum).toBe(0);
      expect(result.hasRecentAIInteraction).toBe(false);
    });
  });
});

describe('Tutor Mode Logic', () => {
  describe('determineTutorMode', () => {
    it('should determine solo tutor mode for single participant', () => {
      const thread = createMockThread({ participants: ['student@example.com'] });
      const context = { topics: ['Mathematics'], momentum: 0.7 };

      const result = determineTutorMode(thread, context);
      
      expect(result.mode).toBe('solo');
      expect(result.responsiveness).toBeGreaterThan(0.8);
      expect(result.characteristics).toContain('proactive');
    });

    it('should determine collaborative mode for multiple participants', () => {
      const thread = createMockThread({ 
        participants: ['student1@example.com', 'student2@example.com', 'student3@example.com'] 
      });
      const context = { topics: ['Physics'], momentum: 0.5, participationLevel: 0.8 };

      const result = determineTutorMode(thread, context);
      
      expect(result.mode).toBe('collaborative');
      expect(result.responsiveness).toBeLessThan(0.7); // More selective
      expect(result.characteristics).toContain('supportive');
    });

    it('should adapt to conversation context', () => {
      const thread = createMockThread({ participants: ['user1@example.com', 'user2@example.com'] });
      
      const academicContext = { 
        topics: ['Computer Science'], 
        momentum: 0.8, 
        dominantTone: 'academic',
        hasRecentAIInteraction: false 
      };
      
      const casualContext = { 
        topics: [], 
        momentum: 0.3, 
        dominantTone: 'casual',
        hasRecentAIInteraction: false 
      };

      const academicResult = determineTutorMode(thread, academicContext);
      const casualResult = determineTutorMode(thread, casualContext);

      expect(academicResult.responsiveness).toBeGreaterThan(casualResult.responsiveness);
      expect(academicResult.characteristics).toContain('educational');
    });
  });

  describe('calculateResponsePriority', () => {
    it('should prioritize explicit AI mentions highly', () => {
      const message = createMockMessage({ content: 'AI, please help me understand this concept' });
      const context = { hasRecentAIInteraction: false, momentum: 0.5 };

      const result = calculateResponsePriority(message, context);
      
      expect(result.priority).toBeGreaterThan(0.8);
      expect(result.factors.explicitMention).toBe(true);
    });

    it('should prioritize urgent academic questions', () => {
      const message = createMockMessage({ 
        content: 'I\'m stuck on this exam question and need help urgently!' 
      });
      const context = { topics: ['Mathematics'], momentum: 0.7 };

      const result = calculateResponsePriority(message, context);
      
      expect(result.priority).toBeGreaterThan(0.7);
      expect(result.factors.urgency).toBeGreaterThan(0.5);
    });

    it('should deprioritize recent AI interactions to avoid spam', () => {
      const message = createMockMessage({ content: 'AI, what about this other question?' });
      const context = { 
        hasRecentAIInteraction: true, 
        lastAIResponse: new Date(Date.now() - 30000).toISOString() // 30 seconds ago
      };

      const result = calculateResponsePriority(message, context);
      
      expect(result.priority).toBeLessThan(0.6);
      expect(result.factors.recentInteraction).toBe(true);
    });

    it('should balance multiple priority factors', () => {
      const message = createMockMessage({ 
        content: 'Can someone help me understand this physics problem? It\'s for my exam tomorrow.' 
      });
      const context = { 
        topics: ['Physics'], 
        momentum: 0.8, 
        hasRecentAIInteraction: false,
        participationLevel: 0.4 // Low participation = higher AI priority
      };

      const result = calculateResponsePriority(message, context);
      
      expect(result.priority).toBeGreaterThan(0.6);
      expect(result.factors.academicContent).toBe(true);
      expect(result.factors.lowParticipation).toBe(true);
    });
  });
});

describe('Content Filtering and Safety', () => {
  describe('filterInappropriateContent', () => {
    it('should detect and flag inappropriate content', () => {
      const inappropriateContent = [
        'This content contains harmful language',
        'Spam message with promotional links',
        'Content that violates community guidelines',
        'Abusive or harassing language',
      ];

      inappropriateContent.forEach(content => {
        const result = filterInappropriateContent(content);
        expect(result.isAppropriate).toBe(false);
        expect(result.flags.length).toBeGreaterThan(0);
        expect(result.severity).toBeGreaterThan(0);
      });
    });

    it('should allow appropriate educational content', () => {
      const appropriateContent = [
        'Can you explain how photosynthesis works?',
        'I need help with my calculus homework',
        'What are the best practices for JavaScript?',
        'Let\'s discuss the historical significance of this event',
      ];

      appropriateContent.forEach(content => {
        const result = filterInappropriateContent(content);
        expect(result.isAppropriate).toBe(true);
        expect(result.flags.length).toBe(0);
        expect(result.severity).toBe(0);
      });
    });

    it('should handle edge cases and provide detailed feedback', () => {
      const edgeCases = [
        '', // Empty content
        'A'.repeat(10000), // Very long content
        '🤖📚✨', // Only emojis
        'Mixed content: appropriate question with minor concern',
      ];

      edgeCases.forEach(content => {
        expect(() => filterInappropriateContent(content)).not.toThrow();
        const result = filterInappropriateContent(content);
        expect(result).toHaveProperty('isAppropriate');
        expect(result).toHaveProperty('flags');
        expect(result).toHaveProperty('severity');
      });
    });
  });

  describe('generateContextualPrompt', () => {
    it('should generate appropriate prompts based on context', () => {
      const contexts = [
        {
          message: createMockMessage({ content: 'Explain quantum mechanics' }),
          thread: createMockThread({ subject: 'Physics' }),
          mode: 'solo',
          expected: ['physics', 'quantum', 'explain']
        },
        {
          message: createMockMessage({ content: 'Help with JavaScript promises' }),
          thread: createMockThread({ subject: 'Computer Science' }),
          mode: 'collaborative',
          expected: ['javascript', 'promises', 'programming']
        },
      ];

      contexts.forEach(({ message, thread, mode, expected }) => {
        const result = generateContextualPrompt(message, thread, { mode });
        
        expect(result.prompt).toBeTruthy();
        expect(result.prompt.length).toBeGreaterThan(50); // Reasonable length
        
        expected.forEach(keyword => {
          expect(result.prompt.toLowerCase()).toContain(keyword.toLowerCase());
        });
      });
    });

    it('should adapt prompt style to tutor mode', () => {
      const message = createMockMessage({ content: 'What is recursion?' });
      const thread = createMockThread({ subject: 'Computer Science' });

      const soloPrompt = generateContextualPrompt(message, thread, { mode: 'solo' });
      const collaborativePrompt = generateContextualPrompt(message, thread, { mode: 'collaborative' });

      expect(soloPrompt.style).toBe('comprehensive');
      expect(collaborativePrompt.style).toBe('concise');
      expect(soloPrompt.prompt).not.toBe(collaborativePrompt.prompt);
    });

    it('should include safety guidelines in prompts', () => {
      const message = createMockMessage({ content: 'Explain this controversial topic' });
      const thread = createMockThread();

      const result = generateContextualPrompt(message, thread, { mode: 'solo' });
      
      expect(result.guidelines).toContain('educational');
      expect(result.guidelines).toContain('respectful');
      expect(result.guidelines).toContain('accurate');
    });
  });
});

describe('Performance and Integration', () => {
  it('should handle high-frequency decision requests efficiently', () => {
    const thread = createMockThread();
    const messages = Array.from({ length: 100 }, (_, i) => 
      createMockMessage({ content: `Test message ${i}` })
    );

    const start = performance.now();
    
    messages.forEach(message => {
      shouldAIRespond(message, thread, messages.slice(-10)); // Last 10 messages
    });
    
    const end = performance.now();
    expect(end - start).toBeLessThan(1000); // Should complete in reasonable time
  });

  it('should provide consistent decisions for identical inputs', () => {
    const message = createMockMessage({ content: 'AI, explain photosynthesis' });
    const thread = createMockThread();
    const recentMessages = [message];

    const results = Array.from({ length: 5 }, () => 
      shouldAIRespond(message, thread, recentMessages)
    );

    // All results should be identical
    const firstResult = results[0];
    results.slice(1).forEach(result => {
      expect(result.shouldRespond).toBe(firstResult.shouldRespond);
      expect(result.confidence).toBeCloseTo(firstResult.confidence, 2);
    });
  });
});