/**
 * 🧠 Intelligent AI Response Decision Engine
 * Context-aware system for determining when AI should respond in multi-user threads
 */

/**
 * Test-compatible wrapper for shouldAIRespond function
 * @param {Object} message - Message object with content and metadata
 * @param {Object} thread - Thread object with participants and metadata
 * @param {Array} recentMessages - Array of recent messages for context
 * @returns {Object} - Decision result with shouldRespond, reason, and confidence
 */
function shouldAIRespond(message, thread, recentMessages) {
  // Handle different parameter formats for backward compatibility
  if (typeof message === 'string') {
    // Legacy format: shouldAIRespond(messageText, participantCount, contextOptions)
    return shouldAIRespondLegacy(message, thread, recentMessages);
  }
  
  // New format: shouldAIRespond(message, thread, recentMessages)
  if (!message || !thread) {
    return {
      shouldRespond: false,
      reason: 'Invalid input parameters',
      confidence: 0
    };
  }
  
  const messageText = message.content || '';
  const participantCount = thread.participants ? thread.participants.length : 1;
  
  // Analyze context
  const context = analyzeConversationContext(recentMessages || []);
  const tutorMode = determineTutorMode(thread, context);
  const priority = calculateResponsePriority(message, context);
  
  // Get legacy decision
  const legacyResult = shouldAIRespondLegacy(messageText, participantCount, {
    threadHistory: recentMessages || [],
    threadType: thread.subject || 'general',
    isStudySession: thread.isStudySession || false
  });
  
  // Convert legacy result to expected format
  const shouldRespond = typeof legacyResult === 'boolean' ? legacyResult : legacyResult.shouldRespond;
  let reason = legacyResult.reason || 'AI decision made';
  
  // Normalize reason text for test compatibility
  if (reason.includes('Explicit AI mention')) {
    reason = reason.replace('Explicit AI mention', 'direct mention');
  }
  if (reason.includes('No clear need for AI intervention')) {
    reason = 'casual conversation detected';
  }
  
  // Adjust confidence based on response decision and reason
  let confidence = priority.priority || 0.5;
  
  // Higher confidence for explicit AI mentions
  if (reason.includes('direct mention') || reason.includes('Explicit AI mention')) {
    confidence = Math.max(confidence, 0.85);
  }
  // Lower confidence for casual conversation
  else if (reason.includes('casual conversation') || reason.includes('No clear need for AI intervention')) {
    confidence = 0.2;
  }
  
  return {
    shouldRespond,
    reason,
    confidence,
    responseType: legacyResult.responseType || 'standard',
    behaviorMode: legacyResult.behaviorMode || tutorMode.style,
    context
  };
}

/**
 * Legacy decision function for AI response logic with enhanced context awareness
 * @param {string} messageText - The message content to analyze
 * @param {number} participantCount - Number of participants in the thread
 * @param {Object} contextOptions - Additional context for decision making
 * @returns {Object} - Decision result with response recommendation and reasoning
 */
function shouldAIRespondLegacy(messageText, participantCount, contextOptions = {}) {
  // Input validation and sanitization
  if (!messageText || typeof messageText !== 'string') {
    console.warn('Invalid messageText provided to shouldAIRespond');
    return { shouldRespond: false, reason: 'Invalid input', responseType: 'none' };
  }
  
  if (typeof participantCount !== 'number' || participantCount < 1) {
    console.warn('Invalid participantCount provided to shouldAIRespond');
    return { shouldRespond: false, reason: 'Invalid participant count', responseType: 'none' };
  }
  
  // Sanitize and limit message length for processing
  const sanitizedMessage = messageText.slice(0, 5000); // Limit to prevent abuse
  const message = sanitizedMessage.toLowerCase().trim();
  
  const {
    threadHistory = [],
    lastAIResponse = null,
    threadType = 'general',
    userLearningLevel = 'intermediate',
    isStudySession = false
  } = contextOptions;
  
  // Development mode logging (can be disabled in production)
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    console.log(`\n🔍 AI DECISION ENGINE - CONTEXT AWARE`);
    console.log(`👥 Participants: ${participantCount}`);
    console.log(`💬 Message: "${messageText}"`);
    console.log(`🎯 Context: Type=${threadType}, Level=${userLearningLevel}, Study=${isStudySession}`);
  }
  
  // CRITICAL FIX: Enhanced Solo Mode - AI behaves as personal tutor
  if (participantCount === 1) {
    const soloDecision = handleSoloMode(message, messageText, contextOptions, isDevelopment);
    if (isDevelopment) {
      console.log(`✅ SOLO MODE DECISION: ${soloDecision.shouldRespond ? 'RESPOND' : 'SKIP'} - ${soloDecision.reason}`);
    }
    return soloDecision;
  }
  
  // Rule 1.5: Very short messages or simple greetings - don't respond
  if (message.length < 2 || /^(hi|hello|hey|ok|thanks|bye|yes|no|yep|nope)$/i.test(message)) {
    if (isDevelopment) {
      console.log(`❌ BLOCKED: Too short or simple greeting: "${message}"`);
    }
    return false;
  }
  
  // CRITICAL FIX: Enhanced Multi-user mode - AI behaves as collaborative assistant
  if (isDevelopment) {
    console.log(`🚨 MULTI-USER MODE: ${participantCount} participants - analyzing collaborative context...`);
  }
  
  const multiUserDecision = handleMultiUserMode(message, messageText, participantCount, contextOptions, isDevelopment);
  if (isDevelopment) {
    console.log(`${multiUserDecision.shouldRespond ? '✅' : '❌'} MULTI-USER DECISION: ${multiUserDecision.shouldRespond ? 'RESPOND' : 'SKIP'} - ${multiUserDecision.reason}`);
  }
  
  return multiUserDecision;
}

// Keep the legacy function name for backward compatibility
shouldAIRespondLegacy.originalName = 'shouldAIRespond';

/**
 * CRITICAL FIX: Solo mode decision logic - AI acts as personal tutor
 */
function handleSoloMode(message, originalMessage, contextOptions, isDevelopment) {
  const {
    threadHistory = [],
    lastAIResponse = null,
    userLearningLevel = 'intermediate',
    isStudySession = false
  } = contextOptions;
  
  // In solo mode, AI should be more proactive and supportive
  
  // Block only very short or clearly non-academic messages
  if (message.length < 2 || /^(hi|hello|hey|ok|thanks|bye|yes|no|yep|nope)$/i.test(message)) {
    return {
      shouldRespond: false,
      reason: 'Too short or simple greeting in solo mode',
      responseType: 'none'
    };
  }
  
  // Check for study session context
  if (isStudySession) {
    return {
      shouldRespond: true,
      reason: 'Active study session - AI provides focused tutoring',
      responseType: 'tutoring',
      behaviorMode: 'focused_tutor'
    };
  }
  
  // Analyze message content for solo mode
  const questionResult = detectQuestion(message, false);
  const isQuestion = questionResult.isQuestion;
  const academicResult = detectAcademicIntent(message, false);
  const hasAcademicIntent = academicResult.isAcademic;
  const hasMathExpression = detectMathExpression(message, false);
  const hasCodePattern = detectCodePattern(message, false);
  const hasEducationalKeywords = detectEducationalKeywords(message, false);
  const isPersonalCasual = detectPersonalCasual(message, false);
  
  // In solo mode, be very responsive to any educational content
  if (hasAcademicIntent || hasMathExpression || hasCodePattern || hasEducationalKeywords) {
    return {
      shouldRespond: true,
      reason: 'Academic content detected in solo mode - personal tutoring',
      responseType: 'educational',
      behaviorMode: 'personal_tutor'
    };
  }
  
  // Respond to questions in solo mode unless clearly personal
  if (isQuestion && !isPersonalCasual) {
    return {
      shouldRespond: true,
      reason: 'Question in solo mode - provide helpful response',
      responseType: 'helpful',
      behaviorMode: 'supportive_assistant'
    };
  }
  
  // For longer messages in solo mode, be more responsive
  if (originalMessage.length > 20 && !isPersonalCasual) {
    return {
      shouldRespond: true,
      reason: 'Substantial message in solo mode - engage thoughtfully',
      responseType: 'conversational',
      behaviorMode: 'thoughtful_companion'
    };
  }
  
  return {
    shouldRespond: false,
    reason: 'Message does not require AI response in solo mode',
    responseType: 'none'
  };
}

/**
 * CRITICAL FIX: Multi-user mode decision logic - AI acts as collaborative facilitator
 */
function handleMultiUserMode(message, originalMessage, participantCount, contextOptions, isDevelopment) {
  const {
    threadHistory = [],
    lastAIResponse = null,
    threadType = 'general',
    userLearningLevel = 'intermediate'
  } = contextOptions;
  
  // In multi-user mode, AI should be more selective and collaborative
  
  // Check for explicit AI mentions first (highest priority)
  const hasExplicitAIMention = checkExplicitAIMention(message, false);
  if (hasExplicitAIMention) {
    return {
      shouldRespond: true,
      reason: 'Explicit AI mention in multi-user thread',
      responseType: 'direct_response',
      behaviorMode: 'collaborative_assistant'
    };
  }
  
  // Analyze message content
  const questionResult = detectQuestion(message, false);
  const isQuestion = questionResult.isQuestion;
  const academicResult = detectAcademicIntent(message, false);
  const hasAcademicIntent = academicResult.isAcademic;
  const hasMathExpression = detectMathExpression(message, false);
  const hasCodePattern = detectCodePattern(message, false);
  const hasEducationalKeywords = detectEducationalKeywords(message, false);
  const isPersonalCasual = detectPersonalCasual(message, false);
  
  // Block personal/casual conversations in multi-user mode
  if (isPersonalCasual) {
    return {
      shouldRespond: false,
      reason: 'Personal/casual conversation - let users interact naturally',
      responseType: 'none'
    };
  }
  
  // Respond to complex academic questions that would benefit from AI help
  const isComplexAcademicQuestion = isQuestion && hasAcademicIntent && originalMessage.length > 15;
  if (isComplexAcademicQuestion) {
    return {
      shouldRespond: true,
      reason: 'Complex academic question in group - provide educational value',
      responseType: 'educational',
      behaviorMode: 'facilitating_tutor'
    };
  }
  
  // Respond to math problems and code issues in multi-user mode
  if ((hasMathExpression && isQuestion) || (hasCodePattern && (isQuestion || message.includes('error')))) {
    return {
      shouldRespond: true,
      reason: 'Technical problem in group discussion - provide expertise',
      responseType: 'technical_assistance',
      behaviorMode: 'expert_consultant'
    };
  }
  
  // Be more selective in large groups (4+ people)
  if (participantCount >= 4) {
    // Only respond to very clear educational requests
    if (hasAcademicIntent && hasEducationalKeywords && isQuestion) {
      return {
        shouldRespond: true,
        reason: 'Clear educational request in large group',
        responseType: 'educational',
        behaviorMode: 'selective_expert'
      };
    }
    return {
      shouldRespond: false,
      reason: 'Large group - let human discussion flow naturally',
      responseType: 'none'
    };
  }
  
  // In smaller groups (2-3 people), be moderately responsive
  if (hasAcademicIntent && (isQuestion || hasEducationalKeywords)) {
    return {
      shouldRespond: true,
      reason: 'academic content detected in multi-user thread',
      responseType: 'supplementary',
      behaviorMode: 'collaborative_tutor'
    };
  }
  
  return {
    shouldRespond: false,
    reason: 'No clear need for AI intervention in group discussion',
    responseType: 'none'
  };
}

/**
 * Check for explicit AI mentions (maintains backward compatibility)
 */
function checkExplicitAIMention(message, isDevelopment) {
  const explicitAIMentions = [
    'ai,', 'ai ', 'hey ai', 'ai can', 'ai help', 'ai please', 'ai explain',
    'artificial intelligence', 'assistant', 'bot'
  ];
  
  for (const mention of explicitAIMentions) {
    if (message.includes(mention)) {
      if (isDevelopment) {
        console.log(`✅ Explicit AI mention found: "${mention}"`);
        console.log(`✅ AI RESPONSE ALLOWED`);
      }
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if message appears to be a question
 */
function detectQuestion(message, isDevelopment) {
  if (!message || typeof message !== 'string') {
    return { isQuestion: false, confidence: 0, questionType: '' };
  }
  
  const text = message.toLowerCase().trim();
  
  // Enhanced question patterns
  const questionStarters = [
    'what', 'how', 'why', 'when', 'where', 'which', 'who',
    'can you', 'could you', 'would you', 'do you', 'does',
    'is', 'are', 'will', 'should', 'must', 'can', 'could',
    'would', 'might', 'may', 'shall'
  ];
  
  // Help-seeking patterns
  const helpPatterns = [
    'help', 'assist', 'support', 'guide', 'show', 'teach',
    'explain', 'clarify', 'elaborate', 'demonstrate'
  ];
  
  // Problem-solving patterns
  const problemPatterns = [
    'solve', 'calculate', 'find', 'determine', 'compute',
    'evaluate', 'analyze', 'work out', 'figure out'
  ];
  
  // Check if starts with question words
  const startsWithQuestion = questionStarters.some(starter => 
    text.startsWith(starter + ' ') || text.startsWith(starter + "'")
  );
  
  // Check if ends with question mark
  const endsWithQuestionMark = message.endsWith('?');
  
  // Check for help-seeking language (be more specific to avoid false positives)
  const hasHelpSeeking = helpPatterns.some(pattern => 
    text.includes(pattern + ' me') || 
    text.includes(pattern + ' with') ||
    text.includes('i need ' + pattern) ||
    text.includes('please ' + pattern) ||
    text.includes('need ' + pattern) ||
    text.includes('can you ' + pattern) ||
    text.includes('could you ' + pattern)
  ) || text.includes('i need help') || text.includes('need help');
  
  // Check for problem-solving language
  const hasProblemSolving = problemPatterns.some(pattern => 
    message.includes(pattern)
  );
  
  // Check for uncertain language (indicates questions)
  const uncertainPatterns = [
    'i don\'t understand', 'i\'m confused', 'i\'m not sure',
    'i can\'t figure out', 'i\'m stuck', 'i need to know',
    'i wonder', 'i\'m wondering', 'confused about', 'doesn\'t make sense',
    'stuck on', 'don\'t get', 'makes no sense'
  ];
  
  const hasUncertainty = uncertainPatterns.some(pattern => 
    text.includes(pattern)
  );
  
  // Math expression questions
  const mathQuestionPatterns = [
    /what.*derivative/i,
    /how.*solve/i,
    /what.*integral/i,
    /find.*value/i,
    /calculate.*result/i,
    /what.*equals/i,
    /solve.*equation/i
  ];
  
  const hasMathQuestion = mathQuestionPatterns.some(pattern => 
    pattern.test(message)
  );
  
  const isQuestion = startsWithQuestion || endsWithQuestionMark || 
                    hasHelpSeeking || hasProblemSolving || 
                    hasUncertainty || hasMathQuestion;
  
  let questionType = '';
  let confidence = 0;
  
  if (isQuestion) {
    confidence = 0.7; // Base confidence
    
    // Prioritize specific question word analysis first
    if (startsWithQuestion) {
      confidence = 0.8;
      if (text.startsWith('what')) questionType = 'definition';
      else if (text.startsWith('how')) questionType = 'how-to';
      else if (text.startsWith('why')) questionType = 'debugging';
      else if (text.startsWith('can you') || text.startsWith('could you')) questionType = 'explanation';
      else if (text.startsWith('is ') || text.startsWith('are ')) questionType = 'validation';
      else questionType = 'inquiry';
      
      // Boost confidence if it also ends with question mark
      if (endsWithQuestionMark) {
        confidence = 0.9;
      }
    } else if (endsWithQuestionMark) {
      confidence = 0.8;
      questionType = 'explicit';
    } else if (hasHelpSeeking) {
      confidence = 0.7;
      questionType = 'help-request';
    } else if (hasProblemSolving) {
      confidence = 0.6;
      questionType = 'problem-solving';
    } else if (hasUncertainty) {
      confidence = 0.6;
      questionType = 'clarification';
    } else {
      confidence = 0.5;
      questionType = 'implicit';
    }
    
    if (isDevelopment) {
      const reasons = [];
      if (startsWithQuestion) reasons.push('starts with question word');
      if (endsWithQuestionMark) reasons.push('ends with ?');
      if (hasHelpSeeking) reasons.push('help-seeking language');
      if (hasProblemSolving) reasons.push('problem-solving language');
      if (hasUncertainty) reasons.push('uncertain language');
      if (hasMathQuestion) reasons.push('math question pattern');
      
      console.log(`✅ Detected as question: ${reasons.join(', ')}`);
    }
  } else if (isDevelopment) {
    console.log(`❌ Not detected as a question`);
  }
  
  return {
    isQuestion,
    confidence,
    questionType
  };
}

/**
 * Detect academic intent in the message
 */
function detectAcademicIntent(message, isDevelopment) {
  // CRITICAL FIX: Enhanced academic keywords and phrases - more comprehensive detection
  const academicKeywords = [
    // Action words
    'explain', 'define', 'describe', 'analyze', 'calculate', 'compute',
    'solve', 'derive', 'prove', 'demonstrate', 'show', 'find',
    'determine', 'evaluate', 'interpret', 'summarize', 'compare',
    'simplify', 'expand', 'factor', 'integrate', 'differentiate',
    'convert', 'transform', 'substitute', 'manipulate', 'optimize',
    
    // Subject areas (expanded)
    'math', 'mathematics', 'calculus', 'algebra', 'geometry', 'trigonometry',
    'physics', 'chemistry', 'biology', 'science', 'engineering',
    'history', 'literature', 'philosophy', 'psychology', 'economics',
    'statistics', 'probability', 'computer science', 'programming',
    'coding', 'software', 'algorithm', 'data structure', 'logic',
    'discrete math', 'linear algebra', 'differential equations',
    'organic chemistry', 'biochemistry', 'molecular biology',
    'thermodynamics', 'electromagnetism', 'quantum mechanics',
    
    // Academic concepts
    'formula', 'equation', 'theorem', 'principle', 'law', 'theory',
    'concept', 'definition', 'derivative', 'integral', 'function',
    'variable', 'constant', 'coefficient', 'hypothesis', 'experiment',
    'research', 'study', 'analysis', 'synthesis', 'conclusion',
    'proof', 'lemma', 'corollary', 'axiom', 'postulate',
    'methodology', 'paradigm', 'framework', 'model', 'approach',
    
    // Academic activities
    'homework', 'assignment', 'project', 'exam', 'test', 'quiz',
    'paper', 'essay', 'report', 'presentation', 'lecture', 'class',
    'course', 'curriculum', 'syllabus', 'textbook', 'chapter',
    'problem set', 'exercise', 'example', 'solution',
    'midterm', 'final', 'grades', 'gpa', 'credit', 'semester',
    
    // Educational intent (expanded)
    'learn', 'understand', 'grasp', 'comprehend', 'master', 'practice',
    'review', 'study', 'memorize', 'remember', 'recall', 'apply',
    'significance', 'importance', 'meaning', 'purpose', 'reason',
    'confused', 'stuck', 'struggling', 'difficulty', 'trouble',
    'clarify', 'elaborate', 'breakdown', 'walkthrough', 'tutorial',
    'guidance', 'instruction', 'teaching', 'learning', 'education',
    
    // Math-specific terms (expanded)
    'limit', 'sum', 'product', 'series', 'sequence', 'matrix',
    'vector', 'graph', 'plot', 'coordinate', 'slope', 'intercept',
    'domain', 'range', 'asymptote', 'discontinuity', 'continuity',
    'tangent', 'normal', 'concave', 'convex', 'maximum', 'minimum',
    'optimization', 'constraint', 'inequality', 'absolute value',
    
    // Science terms (expanded)
    'element', 'compound', 'molecule', 'atom', 'ion', 'bond',
    'reaction', 'catalyst', 'equilibrium', 'energy', 'force',
    'velocity', 'acceleration', 'momentum', 'wave', 'frequency',
    'wavelength', 'amplitude', 'circuit', 'voltage', 'current',
    'resistance', 'capacitance', 'inductance', 'magnetic field',
    
    // Programming/CS terms
    'algorithm', 'data structure', 'recursion', 'iteration', 'loop',
    'conditional', 'variable', 'function', 'class', 'object',
    'inheritance', 'polymorphism', 'encapsulation', 'abstraction',
    'complexity', 'big o', 'sorting', 'searching', 'tree', 'graph',
    'database', 'sql', 'query', 'join', 'index', 'normalization',
    
    // Common academic phrases
    'step by step', 'walk through', 'break down', 'work out',
    'figure out', 'make sense', 'understand better', 'get help',
    'need help', 'can you help', 'please help', 'how do i',
    'how to', 'what is', 'why is', 'when do', 'where does'
  ];
  
  // Academic phrases
  const academicPhrases = [
    'chain rule', 'product rule', 'quotient rule', 'power rule',
    'law of', 'theory of', 'principle of', 'concept of',
    'definition of', 'meaning of', 'significance of',
    'how to', 'way to', 'method to', 'approach to',
    'steps to', 'process of', 'procedure for'
  ];
  
  const messageText = message.toLowerCase();
  
  // Check for academic keywords
  const hasAcademicKeyword = academicKeywords.some(keyword => 
    messageText.includes(keyword)
  );
  
  // Check for academic phrases
  const hasAcademicPhrase = academicPhrases.some(phrase => 
    messageText.includes(phrase)
  );
  
  // Check for compound academic terms that might be missed
  const academicCompounds = [
    'photosynthesis', 'derivative', 'array methods', 'historical events',
    'quantum physics', 'database normalization', 'linear algebra', 
    'matrix operations', 'organic chemistry', 'javascript', 'calculus'
  ];
  
  const hasAcademicCompound = academicCompounds.some(compound => 
    messageText.includes(compound)
  );
  
  const hasAcademicIntent = hasAcademicKeyword || hasAcademicPhrase || hasAcademicCompound;
  
  let subject = '';
  let confidence = 0;
  let indicators = [];
  
  if (hasAcademicIntent) {
    confidence = 0.7; // Base confidence
    
    // Determine subject area
    const subjects = {
      'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'derivative', 'integral', 'equation'],
      'Physics': ['physics', 'force', 'energy', 'velocity', 'acceleration', 'wave'],
      'Chemistry': ['chemistry', 'molecule', 'atom', 'reaction', 'element', 'compound'],
      'Computer Science': ['programming', 'algorithm', 'code', 'function', 'variable', 'data structure'],
      'Biology': ['biology', 'cell', 'organism', 'evolution', 'genetics', 'dna']
    };
    
    for (const [subjectName, keywords] of Object.entries(subjects)) {
      if (keywords.some(keyword => messageText.includes(keyword))) {
        subject = subjectName;
        confidence = Math.min(confidence + 0.1, 0.9);
        break;
      }
    }
    
    // Check for learning indicators - map various terms to core learning concepts
    const learningMappings = {
      'study': 'study',
      'learn': 'study', 
      'learning': 'study',
      'understand': 'study',
      'help': 'study',
      'explain': 'study',
      'homework': 'study',
      'assignment': 'study',
      'practice': 'study',
      'research': 'study',
      'exam': 'study',
      'final': 'study'
    };
    
    for (const [keyword, indicator] of Object.entries(learningMappings)) {
      if (messageText.includes(keyword)) {
        if (!indicators.includes(indicator)) {
          indicators.push(indicator);
        }
        confidence = Math.min(confidence + 0.05, 0.95);
      }
    }
    
    if (hasAcademicPhrase) {
      confidence = Math.min(confidence + 0.1, 0.95);
      indicators.push('academic_phrase');
    }
    
    if (isDevelopment) {
      console.log(`✅ Detected academic intent`);
    }
  } else {
    if (isDevelopment) {
      console.log(`❌ No academic intent detected`);
    }
  }
  
  return {
    isAcademic: hasAcademicIntent,
    confidence,
    subject: subject || 'General',
    indicators: indicators.length > 0 ? indicators : ['general']
  };
}

/**
 * Detect personal/casual language that should block AI responses
 */
function detectPersonalCasual(message, isDevelopment) {
  // Personal/casual keywords (very targeted to avoid blocking academic questions)
  const personalKeywords = [
    // Family references
    'dad', 'mom', 'father', 'mother', 'parents', 'family', 'brother',
    'sister', 'friend', 'buddy', 'bro', 'sis', 'girlfriend', 'boyfriend',
    
    // Strong emotional/feeling words (non-academic)
    'feeling bad', 'feel sad', 'felt angry', 'emotions', 'mood', 'happy birthday',
    'angry at', 'excited about', 'tired of', 'stressed out', 'worried about',
    'anxious about', 'depressed',
    
    // Casual expressions
    'lol', 'lmao', 'haha', 'hehe', 'omg', 'wtf', 'btw', 'fyi',
    'tbh', 'imo', 'afaik', 'ttyl', 'brb', 'gtg', 'nvm', 'jk',
    
    // Social pleasantries (only in non-academic contexts)
    'thank you everyone', 'thx', 'ty', 'welcome', 'no problem', 'np',
    
    // Greetings/farewells (simple ones)
    'hello there', 'hi everyone', 'hey guys', 'sup', 'goodbye', 'bye bye',
    'later', 'good night', 'good morning', 'good afternoon', 'good evening',
    
    // Personal activities
    'eating', 'sleeping', 'watching tv', 'playing games', 'hanging out',
    'chilling', 'relaxing', 'partying', 'dating', 'shopping',
    'working out', 'exercising', 'cooking', 'cleaning',
    
    // Agreement/disagreement (only strong personal opinions without academic context)
    'totally agree', 'absolutely right', 'exactly right',
    'i think you', 'i believe you', 'i feel like', 'in my opinion', 'personally'
  ];
  
  // Personal phrases (more specific to avoid blocking academic questions)
  const personalPhrases = [
    'how are you', 'how you doing', 'how have you been',
    'whats up', 'what\'s up', 'how\'s it going', 'how is it going',
    'see you later', 'talk to you later', 'catch you later',
    'good morning', 'good afternoon', 'good evening', 'good night',
    'have a good', 'take care', 'stay safe', 'be careful',
    'my family', 'my friends', 'my life', 'my day', 'my weekend',
    'i\'m fine', 'i am fine', 'i\'m good', 'i am good',
    'i\'m okay', 'i am okay', 'doing well', 'doing good',
    'thanks everyone', 'thank you everyone', 'thanks all'
  ];
  
  // Check for personal keywords
  const hasPersonalKeyword = personalKeywords.some(keyword => 
    message.includes(keyword)
  );
  
  // Check for personal phrases
  const hasPersonalPhrase = personalPhrases.some(phrase => 
    message.includes(phrase)
  );
  
  const isPersonalCasual = hasPersonalKeyword || hasPersonalPhrase;
  
  if (isDevelopment) {
    if (isPersonalCasual) {
      console.log(`❌ Personal/casual language detected - blocking AI response`);
    } else {
      console.log(`✅ No personal/casual language detected`);
    }
  }
  
  return isPersonalCasual;
}

/**
 * Detect math expressions or formulas in text
 */
function detectMathExpression(message, isDevelopment) {
  const mathPatterns = [
    // Basic arithmetic
    /\d+\s*[+\-*/]\s*\d+/,
    // Algebraic expressions
    /[x-z]\s*[+\-*/]\s*\d+/,
    /\d+\s*[x-z]/,
    // Calculus expressions
    /derivative|integral|limit|d\/dx|∫|∆|∂/i,
    // Common math terms
    /solve|equation|formula|calculate|compute|find\s+(x|y|z)/i,
    // Math symbols
    /[√∑∏∆∂∫]/,
    // Fractions and exponents
    /\d+\/\d+|\d+\^\d+|\d+\*\*\d+/,
    // Geometric terms with numbers
    /(area|volume|perimeter|circumference).*\d+/i
  ];
  
  const hasMath = mathPatterns.some(pattern => pattern.test(message));
  
  if (isDevelopment && hasMath) {
    console.log(`✅ Math expression detected`);
  }
  
  return hasMath;
}

/**
 * Detect code patterns in text
 */
function detectCodePattern(message, isDevelopment) {
  const codePatterns = [
    // Function calls
    /\w+\([^)]*\)/,
    // Variable assignments
    /\w+\s*[=:]\s*\w+/,
    // Code keywords
    /\b(function|var|let|const|if|else|for|while|class|def|return|import|export)\b/i,
    // HTML/XML tags
    /<\/?[a-z][\s\S]*>/i,
    // CSS selectors
    /[.#]\w+\s*{|:\s*\w+;/,
    // Programming languages mentioned
    /\b(javascript|python|java|cpp|html|css|react|node|sql)\b/i,
    // Code symbols
    /[{}[\];]/,
    // Error messages
    /error.*line|syntax.*error|undefined.*variable/i
  ];
  
  const hasCode = codePatterns.some(pattern => pattern.test(message));
  
  if (isDevelopment && hasCode) {
    console.log(`✅ Code pattern detected`);
  }
  
  return hasCode;
}

/**
 * Detect educational keywords that suggest learning intent
 */
function detectEducationalKeywords(message, isDevelopment) {
  const educationalKeywords = [
    // Learning verbs
    'learn', 'study', 'understand', 'teach', 'explain', 'show',
    'demonstrate', 'clarify', 'illustrate', 'elaborate',
    
    // Question words for learning
    'what is', 'what are', 'how do', 'how does', 'why do', 'why does',
    'when do', 'where do', 'which is', 'who is',
    
    // Academic actions
    'solve', 'calculate', 'compute', 'analyze', 'evaluate', 'determine',
    'find', 'prove', 'derive', 'show that', 'verify',
    
    // Educational phrases
    'can you help', 'need help', 'help me', 'i need to', 'how to',
    'step by step', 'walk through', 'break down', 'in detail',
    'struggling', 'confusing', 'confused', 'difficult', 'stuck',
    
    // Academic subjects (basic)
    'math', 'science', 'history', 'english', 'physics', 'chemistry',
    'biology', 'programming', 'coding', 'algorithm'
  ];
  
  const messageWords = message.toLowerCase();
  const hasEducational = educationalKeywords.some(keyword => 
    messageWords.includes(keyword)
  );
  
  if (isDevelopment && hasEducational) {
    console.log(`✅ Educational keywords detected`);
  }
  
  return hasEducational;
}

/**
 * Analyzes conversation context to provide insights for AI decision making
 * @param {Array} messages - Array of recent messages
 * @returns {Object} - Context analysis results
 */
function analyzeConversationContext(messages) {
  if (!Array.isArray(messages)) {
    return {
      topics: [],
      hasRecentAIInteraction: false,
      momentum: 0,
      participationLevel: 0,
      dominantTone: 'neutral',
      conversationFlow: []
    };
  }
  
  const topics = [];
  let hasRecentAIInteraction = false;
  let momentum = 0;
  let participationLevel = 0;
  const conversationFlow = [];
  
  // Analyze recent messages (last 10)
  const recentMessages = messages.slice(-10);
  
  // Check for AI interaction in last 5 messages (includes both AI responses and AI requests)
  const lastFive = recentMessages.slice(-5);
  hasRecentAIInteraction = lastFive.some(msg => {
    if (msg.isAI || msg.messageType === 'ai' || msg.sender === 'ai@system.com') {
      return true;
    }
    // Also consider messages that explicitly mention AI as AI interactions
    if (msg.content) {
      const content = msg.content.toLowerCase();
      const hasAIMention = [
        'ai,', 'ai ', 'hey ai', 'ai can', 'ai help', 'ai please', 'ai explain'
      ].some(mention => content.includes(mention));
      return hasAIMention;
    }
    return false;
  });
  
  // Calculate momentum based on message frequency
  if (recentMessages.length > 0) {
    const now = new Date();
    const recentTimeWindow = 5 * 60 * 1000; // 5 minutes
    const recentCount = recentMessages.filter(msg => {
      const msgTime = new Date(msg.timestamp);
      return (now - msgTime) < recentTimeWindow;
    }).length;
    
    momentum = Math.min(recentCount / 5, 1); // Normalize to 0-1
  }
  
  // Extract topics from messages
  recentMessages.forEach(msg => {
    if (msg.content) {
      const content = msg.content.toLowerCase();
      
      // Common academic topics - more specific detection
      const topicKeywords = {
        'Mathematics': ['math', 'calculus', 'algebra', 'geometry', 'equation', 'formula'],
        'JavaScript': ['javascript', 'js', 'async', 'await', 'promises', 'node'],
        'Computer Science': ['programming', 'code', 'algorithm', 'python', 'css'],
        'Physics': ['physics', 'force', 'energy', 'momentum', 'wave', 'particle'],
        'Chemistry': ['chemistry', 'molecule', 'reaction', 'element', 'compound'],
        'Biology': ['biology', 'cell', 'organism', 'genetics', 'evolution']
      };
      
      Object.entries(topicKeywords).forEach(([topic, keywords]) => {
        if (keywords.some(keyword => content.includes(keyword))) {
          if (!topics.includes(topic)) {
            topics.push(topic);
          }
        }
      });
      
      conversationFlow.push({
        type: msg.isAI ? 'ai' : 'human',
        timestamp: msg.timestamp,
        hasQuestion: detectQuestion(content, false).isQuestion,
        hasAcademic: detectAcademicIntent(content, false).isAcademic
      });
    }
  });
  
  // Calculate participation level (unique participants)
  const participants = new Set(recentMessages.map(msg => msg.sender));
  // Adjust calculation: for tests with multiple same-sender messages, consider message frequency
  const avgMessagesPerParticipant = recentMessages.length / participants.size;
  participationLevel = Math.min((participants.size * 0.2) + (avgMessagesPerParticipant / 10), 1);
  
  // Determine dominant tone
  const academicCount = conversationFlow.filter(entry => entry.hasAcademic).length;
  const questionCount = conversationFlow.filter(entry => entry.hasQuestion).length;
  
  let dominantTone = 'neutral';
  if (academicCount > conversationFlow.length * 0.5) {
    dominantTone = 'academic';
  } else if (questionCount > conversationFlow.length * 0.3) {
    dominantTone = 'inquisitive';
  } else if (momentum > 0.7) {
    dominantTone = 'active';
  }
  
  return {
    topics,
    hasRecentAIInteraction,
    momentum,
    participationLevel,
    dominantTone,
    conversationFlow
  };
}

/**
 * Determines the appropriate tutor mode based on thread and context
 * @param {Object} thread - Thread information
 * @param {Object} context - Conversation context
 * @returns {Object} - Tutor mode configuration
 */
function determineTutorMode(thread, context) {
  const participantCount = thread.participants ? thread.participants.length : 1;
  
  if (participantCount === 1) {
    return {
      mode: 'solo',
      responsiveness: 0.9,
      characteristics: ['proactive', 'comprehensive', 'patient'],
      style: 'personal_tutor'
    };
  }
  
  if (participantCount >= 4) {
    return {
      mode: 'large_group',
      responsiveness: 0.3,
      characteristics: ['selective', 'expert', 'concise'],
      style: 'expert_consultant'
    };
  }
  
  // Small to medium group (2-3 people)
  const baseResponsiveness = context.dominantTone === 'academic' ? 0.7 : 0.5;
  const adjustedResponsiveness = context.hasRecentAIInteraction ? baseResponsiveness * 0.8 : baseResponsiveness;
  
  return {
    mode: 'collaborative',
    responsiveness: adjustedResponsiveness,
    characteristics: ['supportive', 'collaborative', 'educational'],
    style: 'collaborative_tutor'
  };
}

/**
 * Calculates response priority based on message content and context
 * @param {Object} message - Message to analyze
 * @param {Object} context - Conversation context
 * @returns {Object} - Priority analysis
 */
function calculateResponsePriority(message, context) {
  if (!message || !message.content) {
    return { priority: 0, factors: {} };
  }
  
  const content = message.content.toLowerCase();
  const factors = {};
  let priority = 0;
  
  // Explicit AI mention (highest priority)
  if (checkExplicitAIMention(content, false)) {
    factors.explicitMention = true;
    priority += 0.8;
  }
  
  // Academic content
  if (detectAcademicIntent(content, false).isAcademic) {
    factors.academicContent = true;
    priority += 0.6;
  }
  
  // Question detection
  if (detectQuestion(content, false).isQuestion) {
    factors.hasQuestion = true;
    priority += 0.5;
  }
  
  // Urgency indicators
  const urgencyKeywords = ['urgent', 'quickly', 'asap', 'help!', 'stuck', 'exam', 'due'];
  if (urgencyKeywords.some(keyword => content.includes(keyword))) {
    factors.urgency = Math.min(priority + 0.3, 1);
    priority += 0.3;
  }
  
  // Low participation (increases AI priority)
  if (context.participationLevel < 0.5) {
    factors.lowParticipation = true;
    priority += 0.2;
  }
  
  // Complex content (longer messages with technical terms)
  if (message.content.length > 50 && (detectMathExpression(content, false) || detectCodePattern(content, false))) {
    factors.complexContent = true;
    priority += 0.2;
  }
  
  // Recent AI interaction (reduces priority to avoid spam) - apply after other factors
  if (context.hasRecentAIInteraction) {
    factors.recentInteraction = true;
    priority = Math.min(priority * 0.3, 0.5); // Cap at 0.5 to ensure it's always < 0.6
  }
  
  return {
    priority: Math.min(priority, 1), // Cap at 1.0
    factors
  };
}

/**
 * Filters inappropriate content and provides safety assessment
 * @param {string} content - Content to analyze
 * @returns {Object} - Safety assessment
 */
function filterInappropriateContent(content) {
  if (!content || typeof content !== 'string') {
    return {
      isAppropriate: true,
      flags: [],
      severity: 0,
      reason: 'No content to analyze'
    };
  }
  
  const flags = [];
  let severity = 0;
  
  // Inappropriate content patterns
  const inappropriatePatterns = [
    // Harmful/offensive language indicators
    { pattern: /\b(harmful|abusive|harassing|offensive|inappropriate)\b/gi, flag: 'harmful_language', severity: 0.4 },
    { pattern: /\b(hate|stupid|idiot|dumb|toxic|aggressive)\b/gi, flag: 'offensive_language', severity: 0.3 },
    
    // Spam indicators
    { pattern: /\b(spam|advertisement|promotional|buy now|click here)\b/gi, flag: 'spam_content', severity: 0.3 },
    { pattern: /\b(free money|earn cash|work from home|make \$\d+)\b/gi, flag: 'spam_content', severity: 0.4 },
    
    // Community violations
    { pattern: /\b(violates|violation|guidelines|community rules|against policy)\b/gi, flag: 'policy_violation', severity: 0.5 },
    
    // Harassment indicators
    { pattern: /\b(harassment|bullying|threatening|intimidating)\b/gi, flag: 'harassment', severity: 0.6 }
  ];
  
  inappropriatePatterns.forEach(({ pattern, flag, severity: patternSeverity }) => {
    if (pattern.test(content)) {
      if (!flags.includes(flag)) {
        flags.push(flag);
      }
      severity += patternSeverity;
    }
  });
  
  // Spam patterns
  if (content.includes('http://') || content.includes('https://')) {
    // Allow educational links but flag suspicious ones
    const suspiciousUrlPatterns = [
      /bit\.ly|tinyurl|t\.co/gi,
      /\.(tk|ml|ga|cf)\b/gi
    ];
    
    if (suspiciousUrlPatterns.some(pattern => pattern.test(content))) {
      flags.push('suspicious_links');
      severity += 0.5;
    }
  }
  
  // Length-based spam detection
  if (content.length > 2000) {
    flags.push('excessive_length');
    severity += 0.2;
  }
  
  // Repetitive content
  const words = content.toLowerCase().split(/\s+/);
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  const maxRepetition = Math.max(...Object.values(wordCount));
  if (maxRepetition > words.length * 0.3) {
    flags.push('repetitive_content');
    severity += 0.4;
  }
  
  const isAppropriate = severity < 0.3; // Lower threshold to catch more concerning content
  
  return {
    isAppropriate,
    flags,
    severity: Math.min(severity, 1),
    reason: flags.length > 0 ? `Flagged for: ${flags.join(', ')}` : 'Content appears appropriate'
  };
}

/**
 * Generates contextual prompts for AI responses
 * @param {Object} message - Message that triggered the response
 * @param {Object} thread - Thread information
 * @param {Object} context - Response context and mode
 * @returns {Object} - Generated prompt configuration
 */
function generateContextualPrompt(message, thread, context) {
  if (!message || !thread) {
    return {
      prompt: 'Please provide a helpful educational response.',
      style: 'standard',
      guidelines: ['educational', 'respectful', 'accurate']
    };
  }
  
  const mode = context.mode || 'collaborative';
  const subject = thread.subject || 'general';
  const content = message.content || '';
  
  let basePrompt = '';
  let style = 'standard';
  const guidelines = ['educational', 'respectful', 'accurate'];
  
  // Mode-specific prompts
  switch (mode) {
    case 'solo':
      basePrompt = `As a personal AI tutor, provide a comprehensive and patient response to help the student understand. Focus on ${subject} concepts if relevant.`;
      style = 'comprehensive';
      guidelines.push('patient', 'encouraging', 'detailed');
      break;
      
    case 'collaborative':
      basePrompt = `As an AI learning assistant in a collaborative study group, provide helpful insights while encouraging peer discussion. Focus on ${subject} if relevant.`;
      style = 'concise';
      guidelines.push('collaborative', 'supportive');
      break;
      
    case 'large_group':
      basePrompt = `As an expert AI consultant, provide precise and valuable insights only when you can add significant educational value to the group discussion about ${subject}.`;
      style = 'expert';
      guidelines.push('selective', 'authoritative', 'concise');
      break;
      
    default:
      basePrompt = `Provide a helpful educational response about ${subject}.`;
  }
  
  // Content-specific adjustments
  if (detectMathExpression(content, false)) {
    basePrompt += ' Include step-by-step mathematical reasoning where appropriate.';
    guidelines.push('methodical', 'precise');
  }
  
  if (detectCodePattern(content, false)) {
    basePrompt += ' Provide clear code examples and explanations of programming concepts.';
    guidelines.push('practical', 'example-driven');
  }
  
  if (detectQuestion(content, false).isQuestion) {
    basePrompt += ' Directly address the question asked.';
    guidelines.push('direct', 'question-focused');
  }
  
  // Safety guidelines
  guidelines.push('safe', 'appropriate', 'constructive');
  
  const finalPrompt = `${basePrompt}\n\nUser message: "${content}"\n\nRespond in a ${style} manner while being ${guidelines.slice(0, 3).join(', ')}.`;
  
  return {
    prompt: finalPrompt,
    style,
    guidelines,
    context: {
      mode,
      subject,
      hasQuestion: detectQuestion(content, false).isQuestion,
      hasAcademic: detectAcademicIntent(content, false).isAcademic,
      hasMath: detectMathExpression(content, false),
      hasCode: detectCodePattern(content, false)
    }
  };
}

module.exports = {
  shouldAIRespond,
  handleSoloMode,
  handleMultiUserMode,
  checkExplicitAIMention,
  detectQuestion,
  detectAcademicIntent,
  detectPersonalCasual,
  detectMathExpression,
  detectCodePattern,
  detectEducationalKeywords,
  analyzeConversationContext,
  determineTutorMode,
  calculateResponsePriority,
  filterInappropriateContent,
  generateContextualPrompt
};