// Content Generator Component - Generate study materials using AI
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';
import InteractiveQuiz from './InteractiveQuiz';
import AdaptiveFlashcards from './AdaptiveFlashcards';
import InteractivePracticeProblems from './InteractivePracticeProblems';

// FormField component moved outside to prevent re-creation
const FormField = ({ label, type = 'text', value, onChange, placeholder, options = null }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    {type === 'select' ? (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ) : type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows="4"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    )}
  </div>
);

// TabButton component moved outside to prevent re-creation
const TabButton = ({ id, label, isActive, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {label}
  </button>
);

const ContentGenerator = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('study-guide');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [userContent, setUserContent] = useState([]);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [interactiveMode, setInteractiveMode] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  // Enhanced Study Guide Form
  const [studyGuideForm, setStudyGuideForm] = useState({
    topics: '',
    difficulty: 'intermediate',
    title: '',
    template: 'comprehensive',
    studyTimeTarget: 60,
    includeExamples: true,
    includeKeyPoints: true,
    includeQuizQuestions: false,
    learningObjectives: '',
    focusAreas: '',
    additionalRequirements: ''
  });

  // Quiz Form
  const [quizForm, setQuizForm] = useState({
    topics: '',
    questionCount: 5,
    difficulty: 'intermediate',
    interactiveMode: false
  });

  // Flashcards Form
  const [flashcardsForm, setFlashcardsForm] = useState({
    content: '',
    count: 10,
    title: '',
    adaptiveMode: false
  });

  // Practice Problems Form
  const [practiceForm, setPracticeForm] = useState({
    subject: '',
    difficulty: 'intermediate',
    count: 5,
    interactiveMode: false
  });

  useEffect(() => {
    fetchUserContent();
  }, []);

  const fetchUserContent = async () => {
    setIsLoadingContent(true);
    try {
      const response = await axios.get('/ai/generate/content');
      if (response.data.success) {
        setUserContent(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching user content:', error);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const generateStudyGuide = async () => {
    if (!studyGuideForm.topics.trim()) {
      alert('Please enter topics for the study guide');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('/ai/generate/study-guide', {
        topics: studyGuideForm.topics.split(',').map(t => t.trim()),
        difficulty: studyGuideForm.difficulty,
        title: studyGuideForm.title,
        template: studyGuideForm.template,
        studyTimeTarget: parseInt(studyGuideForm.studyTimeTarget),
        includeExamples: studyGuideForm.includeExamples,
        includeKeyPoints: studyGuideForm.includeKeyPoints,
        includeQuizQuestions: studyGuideForm.includeQuizQuestions,
        learningObjectives: studyGuideForm.learningObjectives.split(',').map(o => o.trim()).filter(o => o),
        customization: {
          focusAreas: studyGuideForm.focusAreas.split(',').map(a => a.trim()).filter(a => a),
          additionalRequirements: studyGuideForm.additionalRequirements
        }
      });

      if (response.data.success) {
        setGeneratedContent({
          type: 'study-guide',
          data: response.data.studyGuide
        });
        fetchUserContent(); // Refresh user content
      }
    } catch (error) {
      console.error('Error generating study guide:', error);
      alert('Failed to generate study guide. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateQuiz = async () => {
    if (!quizForm.topics.trim()) {
      alert('Please enter topics for the quiz');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('/ai/generate/quiz', {
        topics: quizForm.topics.split(',').map(t => t.trim()),
        questionCount: parseInt(quizForm.questionCount),
        difficulty: quizForm.difficulty
      });

      if (response.data.success) {
        setGeneratedContent({
          type: 'quiz',
          data: response.data.quiz
        });
        setInteractiveMode(quizForm.interactiveMode);
        fetchUserContent();
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
      alert('Failed to generate quiz. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateFlashcards = async () => {
    if (!flashcardsForm.content.trim()) {
      alert('Please enter content for flashcards');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('/ai/generate/flashcards', {
        content: flashcardsForm.content,
        count: parseInt(flashcardsForm.count),
        title: flashcardsForm.title
      });

      if (response.data.success) {
        setGeneratedContent({
          type: 'flashcards',
          data: response.data.flashcards
        });
        setAdaptiveMode(flashcardsForm.adaptiveMode);
        fetchUserContent();
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Failed to generate flashcards. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePracticeProblems = async () => {
    if (!practiceForm.subject.trim()) {
      alert('Please enter a subject for practice problems');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await axios.post('/ai/generate/practice-problems', {
        subject: practiceForm.subject,
        difficulty: practiceForm.difficulty,
        count: parseInt(practiceForm.count)
      });

      if (response.data.success) {
        setGeneratedContent({
          type: 'practice-problems',
          data: response.data.practiceProblems
        });
        setPracticeMode(practiceForm.interactiveMode);
        fetchUserContent();
      }
    } catch (error) {
      console.error('Error generating practice problems:', error);
      alert('Failed to generate practice problems. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleInteractiveQuizComplete = async (quizResults) => {
    try {
      // Send quiz results to backend for analysis and learning tracking
      await axios.post('/ai/generate/quiz/submit-results', {
        quizId: generatedContent.data.id,
        results: quizResults,
        userId: user.uid
      });
      
      console.log('Interactive quiz completed:', quizResults);
      
      // Reset interactive mode
      setInteractiveMode(false);
      
      // Show completion message
      alert(`Quiz completed! Score: ${Math.round(quizResults.score)}%`);
      
    } catch (error) {
      console.error('Error submitting quiz results:', error);
      alert('Quiz completed but failed to save results. Please try again.');
    }
  };

  const handleAdaptiveFlashcardsComplete = async (sessionData) => {
    try {
      // Send flashcard session data to backend for spaced repetition tracking
      await axios.post('/ai/generate/flashcards/submit-session', {
        flashcardsId: generatedContent.data.id,
        sessionData,
        userId: user.uid
      });
      
      console.log('Adaptive flashcards session completed:', sessionData);
      
      // Reset adaptive mode
      setAdaptiveMode(false);
      
      // Show completion message
      const accuracy = sessionData.sessionStats.cardsStudied > 0 
        ? (sessionData.sessionStats.correct / sessionData.sessionStats.cardsStudied) * 100 
        : 0;
      alert(`Study session completed! Accuracy: ${Math.round(accuracy)}%`);
      
    } catch (error) {
      console.error('Error submitting flashcard session:', error);
      alert('Session completed but failed to save progress. Please try again.');
    }
  };

  const handleInteractivePracticeComplete = async (sessionData) => {
    try {
      // Send practice session data to backend for progress tracking
      await axios.post('/ai/generate/practice-problems/submit-session', {
        problemsId: generatedContent.data.id,
        sessionData,
        userId: user.uid
      });
      
      console.log('Interactive practice session completed:', sessionData);
      
      // Reset practice mode
      setPracticeMode(false);
      
      // Show completion message
      const accuracy = sessionData.sessionStats.completed > 0 
        ? (sessionData.sessionStats.correct / sessionData.sessionStats.completed) * 100 
        : 0;
      alert(`Practice session completed! Score: ${sessionData.sessionStats.correct}/${sessionData.sessionStats.completed} (${Math.round(accuracy)}%)`);
      
    } catch (error) {
      console.error('Error submitting practice session:', error);
      alert('Session completed but failed to save progress. Please try again.');
    }
  };


  const renderGeneratedContent = () => {
    if (!generatedContent) return null;

    const { type, data } = generatedContent;

    switch (type) {
      case 'study-guide':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{data.title}</h3>
              <div className="flex items-center space-x-2">
                {data.metadata?.template && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {data.metadata.template}
                  </span>
                )}
                {data.metadata?.qualityScore && (
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    data.metadata.qualityScore >= 80 ? 'bg-green-100 text-green-800' :
                    data.metadata.qualityScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Quality: {data.metadata.qualityScore}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Quality Metrics */}
            {data.metadata && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Study Guide Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-600">Quality Score:</span>
                    <span className="ml-1 font-medium">{data.metadata.qualityScore || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Completeness:</span>
                    <span className="ml-1 font-medium">{data.metadata.completenessScore || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Difficulty Match:</span>
                    <span className="ml-1 font-medium">{data.metadata.difficultyAccuracy || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Study Time:</span>
                    <span className="ml-1 font-medium">{data.metadata.estimatedStudyTime || 0} min</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Learning Objectives */}
            {data.metadata?.learningObjectives && data.metadata.learningObjectives.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Learning Objectives</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {data.metadata.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Study Guide Content */}
            <div className="prose max-w-none">
              {data.structuredContent?.sections ? (
                <div className="space-y-6">
                  {data.structuredContent.sections.map((section, index) => (
                    <div key={index} className="border-l-4 border-blue-200 pl-4">
                      <h4 className="text-lg font-semibold text-gray-800 mb-3">{section.title}</h4>
                      <div className="whitespace-pre-wrap text-gray-700 mb-3">{section.content}</div>
                      
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-600 mb-2">Key Points:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {section.keyPoints.map((point, pointIndex) => (
                              <li key={pointIndex} className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {section.examples && section.examples.length > 0 && (
                        <div className="mb-3">
                          <h5 className="text-sm font-medium text-gray-600 mb-2">Examples:</h5>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {section.examples.map((example, exampleIndex) => (
                              <li key={exampleIndex} className="italic text-gray-600">
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{data.content}</div>
              )}
            </div>
            
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600 border-t pt-4">
              <span>Topics: {data.topics.join(', ')}</span>
              <span>Estimated study time: {data.estimatedStudyTime || data.metadata?.estimatedStudyTime || 0} minutes</span>
            </div>
          </div>
        );

      case 'quiz':
        // Use InteractiveQuiz component if interactive mode is enabled
        if (interactiveMode) {
          return (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{data.title}</h3>
                <button
                  onClick={() => setInteractiveMode(false)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Switch to Static View
                </button>
              </div>
              <InteractiveQuiz 
                quizData={data} 
                onQuizComplete={handleInteractiveQuizComplete}
              />
            </div>
          );
        }
        
        // Static quiz view with option to switch to interactive mode
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{data.title}</h3>
              <button
                onClick={() => setInteractiveMode(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Start Interactive Quiz
              </button>
            </div>
            <div className="space-y-6">
              {data.questions.map((question, index) => (
                <div key={index} className="border-b pb-4">
                  <h4 className="font-medium text-gray-800 mb-2">
                    {index + 1}. {question.question}
                  </h4>
                  <div className="space-y-1 ml-4">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="text-gray-700">
                        {option}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 text-sm text-green-600">
                    <strong>Answer:</strong> {question.correctAnswer}
                  </div>
                  {question.explanation && (
                    <div className="mt-2 text-sm text-gray-600">
                      <strong>Explanation:</strong> {question.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {data.questionCount} questions • Estimated time: {data.estimatedTime} minutes
            </div>
          </div>
        );

      case 'flashcards':
        // Use AdaptiveFlashcards component if adaptive mode is enabled
        if (adaptiveMode) {
          return (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{data.title}</h3>
                <button
                  onClick={() => setAdaptiveMode(false)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Switch to Static View
                </button>
              </div>
              <AdaptiveFlashcards 
                flashcardsData={data} 
                onStudyComplete={handleAdaptiveFlashcardsComplete}
              />
            </div>
          );
        }
        
        // Static flashcards view with option to switch to adaptive mode
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{data.title}</h3>
              <button
                onClick={() => setAdaptiveMode(true)}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Start Adaptive Study
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.cards.map((card, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="border-b pb-2 mb-2">
                    <h4 className="font-medium text-gray-800">Front</h4>
                    <p className="text-gray-700">{card.front}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">Back</h4>
                    <p className="text-gray-700">{card.back}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {data.count} cards • Estimated time: {data.estimatedTime} minutes
            </div>
          </div>
        );

      case 'practice-problems':
        // Use InteractivePracticeProblems component if practice mode is enabled
        if (practiceMode) {
          return (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold">{data.title}</h3>
                <button
                  onClick={() => setPracticeMode(false)}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Switch to Static View
                </button>
              </div>
              <InteractivePracticeProblems 
                problemsData={data} 
                onPracticeComplete={handleInteractivePracticeComplete}
              />
            </div>
          );
        }
        
        // Static practice problems view with option to switch to interactive mode
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{data.title}</h3>
              <button
                onClick={() => setPracticeMode(true)}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Start Interactive Practice
              </button>
            </div>
            <div className="space-y-6">
              {data.problems.map((problem, index) => (
                <div key={index} className="border-b pb-4">
                  <h4 className="font-medium text-gray-800 mb-2">
                    Problem {index + 1}
                  </h4>
                  <p className="text-gray-700 mb-3">{problem.problem}</p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-1">Solution:</h5>
                    <p className="text-gray-700">{problem.solution}</p>
                    {problem.steps && problem.steps.length > 0 && (
                      <div className="mt-2">
                        <h5 className="font-medium text-gray-800 mb-1">Steps:</h5>
                        <ol className="list-decimal list-inside text-sm text-gray-600">
                          {problem.steps.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              {data.count} problems • Estimated time: {data.estimatedTime} minutes
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Content Generator</h2>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        <TabButton
          id="study-guide"
          label="Study Guide"
          isActive={activeTab === 'study-guide'}
          onClick={setActiveTab}
        />
        <TabButton
          id="quiz"
          label="Quiz"
          isActive={activeTab === 'quiz'}
          onClick={setActiveTab}
        />
        <TabButton
          id="flashcards"
          label="Flashcards"
          isActive={activeTab === 'flashcards'}
          onClick={setActiveTab}
        />
        <TabButton
          id="practice"
          label="Practice Problems"
          isActive={activeTab === 'practice'}
          onClick={setActiveTab}
        />
        <TabButton
          id="library"
          label="My Library"
          isActive={activeTab === 'library'}
          onClick={setActiveTab}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">
              {activeTab === 'study-guide' && 'Generate Study Guide'}
              {activeTab === 'quiz' && 'Generate Quiz'}
              {activeTab === 'flashcards' && 'Generate Flashcards'}
              {activeTab === 'practice' && 'Generate Practice Problems'}
              {activeTab === 'library' && 'My Content Library'}
            </h3>

            {activeTab === 'study-guide' && (
              <div>
                <FormField
                  label="Topics (comma-separated)"
                  value={studyGuideForm.topics}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, topics: value }))}
                  placeholder="e.g., algebra, quadratic equations, graphing"
                />
                <FormField
                  label="Title (optional)"
                  value={studyGuideForm.title}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, title: value }))}
                  placeholder="Custom study guide title"
                />
                <FormField
                  label="Template"
                  type="select"
                  value={studyGuideForm.template}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, template: value }))}
                  options={[
                    { value: 'comprehensive', label: 'Comprehensive' },
                    { value: 'outline', label: 'Outline Style' },
                    { value: 'visual', label: 'Visual Guide' },
                    { value: 'quick_review', label: 'Quick Review' },
                    { value: 'exam_prep', label: 'Exam Preparation' }
                  ]}
                />
                <FormField
                  label="Difficulty Level"
                  type="select"
                  value={studyGuideForm.difficulty}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, difficulty: value }))}
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' }
                  ]}
                />
                <FormField
                  label="Study Time Target (minutes)"
                  type="number"
                  value={studyGuideForm.studyTimeTarget}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, studyTimeTarget: value }))}
                  placeholder="60"
                />
                <FormField
                  label="Learning Objectives (comma-separated, optional)"
                  value={studyGuideForm.learningObjectives}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, learningObjectives: value }))}
                  placeholder="e.g., understand basic concepts, apply formulas, solve problems"
                />
                <FormField
                  label="Focus Areas (comma-separated, optional)"
                  value={studyGuideForm.focusAreas}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, focusAreas: value }))}
                  placeholder="e.g., problem solving, theoretical concepts, practical applications"
                />
                <FormField
                  label="Additional Requirements (optional)"
                  type="textarea"
                  value={studyGuideForm.additionalRequirements}
                  onChange={(value) => setStudyGuideForm(prev => ({ ...prev, additionalRequirements: value }))}
                  placeholder="Any specific requirements or preferences..."
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={studyGuideForm.includeExamples}
                        onChange={(e) => setStudyGuideForm(prev => ({ ...prev, includeExamples: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Examples</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={studyGuideForm.includeKeyPoints}
                        onChange={(e) => setStudyGuideForm(prev => ({ ...prev, includeKeyPoints: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Key Points</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={studyGuideForm.includeQuizQuestions}
                        onChange={(e) => setStudyGuideForm(prev => ({ ...prev, includeQuizQuestions: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Include Quiz Questions</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={generateStudyGuide}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Enhanced Study Guide'}
                </button>
              </div>
            )}

            {activeTab === 'quiz' && (
              <div>
                <FormField
                  label="Topics (comma-separated)"
                  value={quizForm.topics}
                  onChange={(value) => setQuizForm(prev => ({ ...prev, topics: value }))}
                  placeholder="e.g., photosynthesis, cell division, genetics"
                />
                <FormField
                  label="Number of Questions"
                  type="number"
                  value={quizForm.questionCount}
                  onChange={(value) => setQuizForm(prev => ({ ...prev, questionCount: value }))}
                />
                <FormField
                  label="Difficulty Level"
                  type="select"
                  value={quizForm.difficulty}
                  onChange={(value) => setQuizForm(prev => ({ ...prev, difficulty: value }))}
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' }
                  ]}
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Mode</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={quizForm.interactiveMode}
                        onChange={(e) => setQuizForm(prev => ({ ...prev, interactiveMode: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Interactive Mode (immediate feedback)</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={generateQuiz}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : quizForm.interactiveMode ? 'Generate Interactive Quiz' : 'Generate Quiz'}
                </button>
              </div>
            )}

            {activeTab === 'flashcards' && (
              <div>
                <FormField
                  label="Content"
                  type="textarea"
                  value={flashcardsForm.content}
                  onChange={(value) => setFlashcardsForm(prev => ({ ...prev, content: value }))}
                  placeholder="Enter the text content you want to create flashcards from..."
                />
                <FormField
                  label="Title (optional)"
                  value={flashcardsForm.title}
                  onChange={(value) => setFlashcardsForm(prev => ({ ...prev, title: value }))}
                  placeholder="Custom flashcard set title"
                />
                <FormField
                  label="Number of Cards"
                  type="number"
                  value={flashcardsForm.count}
                  onChange={(value) => setFlashcardsForm(prev => ({ ...prev, count: value }))}
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Study Mode</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={flashcardsForm.adaptiveMode}
                        onChange={(e) => setFlashcardsForm(prev => ({ ...prev, adaptiveMode: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Adaptive Mode (spaced repetition)</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={generateFlashcards}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : flashcardsForm.adaptiveMode ? 'Generate Adaptive Flashcards' : 'Generate Flashcards'}
                </button>
              </div>
            )}

            {activeTab === 'practice' && (
              <div>
                <FormField
                  label="Subject"
                  value={practiceForm.subject}
                  onChange={(value) => setPracticeForm(prev => ({ ...prev, subject: value }))}
                  placeholder="e.g., calculus, physics, chemistry"
                />
                <FormField
                  label="Number of Problems"
                  type="number"
                  value={practiceForm.count}
                  onChange={(value) => setPracticeForm(prev => ({ ...prev, count: value }))}
                />
                <FormField
                  label="Difficulty Level"
                  type="select"
                  value={practiceForm.difficulty}
                  onChange={(value) => setPracticeForm(prev => ({ ...prev, difficulty: value }))}
                  options={[
                    { value: 'beginner', label: 'Beginner' },
                    { value: 'intermediate', label: 'Intermediate' },
                    { value: 'advanced', label: 'Advanced' }
                  ]}
                />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Practice Mode</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={practiceForm.interactiveMode}
                        onChange={(e) => setPracticeForm(prev => ({ ...prev, interactiveMode: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Interactive Mode (step-by-step guidance)</span>
                    </label>
                  </div>
                </div>
                <button
                  onClick={generatePracticeProblems}
                  disabled={isGenerating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : practiceForm.interactiveMode ? 'Generate Interactive Practice' : 'Generate Practice Problems'}
                </button>
              </div>
            )}

            {activeTab === 'library' && (
              <div>
                <p className="text-gray-600 mb-4">Your generated content appears in the main area.</p>
                <button
                  onClick={fetchUserContent}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Refresh Library
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generated Content */}
        <div className="lg:col-span-2">
          {activeTab === 'library' ? (
            <div>
              <h3 className="text-xl font-semibold mb-4">My Content Library</h3>
              {isLoadingContent ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : userContent.length > 0 ? (
                <div className="space-y-4">
                  {userContent.map((item, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-800">{item.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.type === 'study_guide' ? 'bg-blue-100 text-blue-800' :
                          item.type === 'quiz' ? 'bg-green-100 text-green-800' :
                          item.type === 'flashcards' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {item.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Subject: {item.subject} • Difficulty: {item.difficulty}
                      </p>
                      <p className="text-sm text-gray-600">
                        Topics: {item.topics.join(', ')}
                      </p>
                      <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-2">
                          <span>👁 {item.views}</span>
                          {item.rating && <span>⭐ {item.rating}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No content generated yet. Start creating study materials!</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4">Generated Content</h3>
              {isGenerating ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : generatedContent ? (
                renderGeneratedContent()
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <p className="text-gray-500">Fill out the form and click generate to create content</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentGenerator;