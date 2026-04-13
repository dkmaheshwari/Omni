// Interactive Practice Problems Component - Step-by-step problem solving
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';

const InteractivePracticeProblems = ({ problemsData, onPracticeComplete }) => {
  const { user } = useAuth();
  
  // Safety check for problems data
  if (!problemsData || !problemsData.problems || !Array.isArray(problemsData.problems) || problemsData.problems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Practice Problems Data Error</h3>
          <p className="text-sm text-gray-600 mb-4">
            Unable to load practice problems. Please try generating new problems.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Generator
          </button>
        </div>
      </div>
    );
  }

  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showStep, setShowStep] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [problemResults, setProblemResults] = useState({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    completed: 0,
    correct: 0,
    totalTime: 0,
    hintsUsed: 0,
    stepsViewed: 0
  });
  const [problemStartTime, setProblemStartTime] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [hintsUsed, setHintsUsed] = useState([]);
  const [stepsViewed, setStepsViewed] = useState([]);

  useEffect(() => {
    setProblemStartTime(Date.now());
  }, [currentProblemIndex]);

  const currentProblem = problemsData.problems[currentProblemIndex];

  const showNextStep = () => {
    if (currentProblem.steps && currentStepIndex < currentProblem.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setShowStep(true);
      
      // Track step viewing
      const stepKey = `${currentProblemIndex}-${currentStepIndex + 1}`;
      if (!stepsViewed.includes(stepKey)) {
        setStepsViewed(prev => [...prev, stepKey]);
        setSessionStats(prev => ({ ...prev, stepsViewed: prev.stepsViewed + 1 }));
      }
    }
  };

  const showHint = () => {
    if (currentProblem.hints && currentProblem.hints.length > 0) {
      const hintKey = `${currentProblemIndex}-hint`;
      if (!hintsUsed.includes(hintKey)) {
        setHintsUsed(prev => [...prev, hintKey]);
        setSessionStats(prev => ({ ...prev, hintsUsed: prev.hintsUsed + 1 }));
      }
    }
  };

  const submitAnswer = () => {
    const timeSpent = (Date.now() - problemStartTime) / 1000;
    const isCorrect = checkAnswer(userAnswer, currentProblem.solution);
    
    const result = {
      answer: userAnswer,
      isCorrect,
      timeSpent,
      hintsUsed: hintsUsed.filter(hint => hint.startsWith(`${currentProblemIndex}-`)).length,
      stepsViewed: stepsViewed.filter(step => step.startsWith(`${currentProblemIndex}-`)).length,
      timestamp: Date.now()
    };

    setProblemResults(prev => ({
      ...prev,
      [currentProblemIndex]: result
    }));

    setSessionStats(prev => ({
      ...prev,
      completed: prev.completed + 1,
      correct: isCorrect ? prev.correct + 1 : prev.correct,
      totalTime: prev.totalTime + timeSpent
    }));

    setShowSolution(true);
  };

  const checkAnswer = (userAnswer, correctSolution) => {
    // Simple answer checking - can be enhanced with more sophisticated comparison
    const userNormalized = userAnswer.toString().toLowerCase().trim();
    const correctNormalized = correctSolution.toString().toLowerCase().trim();
    
    // Check for exact match
    if (userNormalized === correctNormalized) return true;
    
    // Check for numeric answers with tolerance
    const userNum = parseFloat(userAnswer);
    const correctNum = parseFloat(correctSolution);
    if (!isNaN(userNum) && !isNaN(correctNum)) {
      return Math.abs(userNum - correctNum) < 0.001;
    }
    
    // Check if user answer contains the correct solution
    if (correctNormalized.includes(userNormalized) || userNormalized.includes(correctNormalized)) {
      return true;
    }
    
    return false;
  };

  const nextProblem = () => {
    if (currentProblemIndex < problemsData.problems.length - 1) {
      setCurrentProblemIndex(prev => prev + 1);
      setCurrentStepIndex(0);
      setShowStep(false);
      setUserAnswer('');
      setShowSolution(false);
      setProblemStartTime(Date.now());
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    setSessionComplete(true);
    const totalTime = (Date.now() - sessionStartTime) / 1000;
    
    const sessionData = {
      problemsId: problemsData.id,
      results: problemResults,
      sessionStats: {
        ...sessionStats,
        totalTime,
        sessionComplete: true
      }
    };

    if (onPracticeComplete) {
      onPracticeComplete(sessionData);
    }

    // Save session data to backend
    try {
      await axios.post('/ai/generate/practice-problems/submit-session', {
        problemsId: problemsData.id,
        sessionData,
        userId: user.uid
      });
    } catch (error) {
      console.error('Error saving practice session:', error);
    }
  };

  const resetSession = () => {
    setCurrentProblemIndex(0);
    setCurrentStepIndex(0);
    setShowStep(false);
    setUserAnswer('');
    setShowSolution(false);
    setProblemResults({});
    setSessionComplete(false);
    setSessionStats({
      completed: 0,
      correct: 0,
      totalTime: 0,
      hintsUsed: 0,
      stepsViewed: 0
    });
    setHintsUsed([]);
    setStepsViewed([]);
    setProblemStartTime(Date.now());
  };

  const getProgressPercentage = () => {
    return (Object.keys(problemResults).length / problemsData.problems.length) * 100;
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'hard': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  if (sessionComplete) {
    const accuracy = sessionStats.completed > 0 ? (sessionStats.correct / sessionStats.completed) * 100 : 0;
    
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-6xl mb-2">
              {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '📚'}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Practice Session Complete!</h2>
            <div className="text-lg text-gray-600">
              Score: {sessionStats.correct}/{sessionStats.completed} ({Math.round(accuracy)}%)
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Problems Solved:</span>
                <span className="ml-2 font-medium">{sessionStats.completed}</span>
              </div>
              <div>
                <span className="text-gray-600">Time Spent:</span>
                <span className="ml-2 font-medium">{Math.round(sessionStats.totalTime / 60)}m {Math.round(sessionStats.totalTime % 60)}s</span>
              </div>
              <div>
                <span className="text-gray-600">Hints Used:</span>
                <span className="ml-2 font-medium">{sessionStats.hintsUsed}</span>
              </div>
              <div>
                <span className="text-gray-600">Steps Viewed:</span>
                <span className="ml-2 font-medium">{sessionStats.stepsViewed}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Problem Results</h3>
            <div className="space-y-2">
              {Object.keys(problemResults).map(problemIndex => {
                const result = problemResults[problemIndex];
                return (
                  <div key={problemIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">Problem {parseInt(problemIndex) + 1}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.isCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                      <span className="text-xs text-gray-500">{Math.round(result.timeSpent)}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetSession}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Practice Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Back to Generator
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Problem {currentProblemIndex + 1} of {problemsData.problems.length}
          </span>
          <span className="text-sm text-gray-500">
            Accuracy: {sessionStats.completed > 0 ? Math.round((sessionStats.correct / sessionStats.completed) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Problem Display */}
      <div className="mb-6">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Problem {currentProblemIndex + 1}
            </h3>
            {currentProblem.difficulty && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(currentProblem.difficulty)}`}>
                {currentProblem.difficulty}
              </span>
            )}
          </div>
          
          <div className="text-gray-800 mb-4 whitespace-pre-wrap">
            {currentProblem.problem}
          </div>

          {/* Answer Input */}
          {!showSolution && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Answer:
              </label>
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Enter your solution here..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {!showSolution && (
              <>
                <button
                  onClick={submitAnswer}
                  disabled={!userAnswer.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
                
                {currentProblem.hints && currentProblem.hints.length > 0 && (
                  <button
                    onClick={showHint}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                  >
                    Show Hint
                  </button>
                )}
                
                {currentProblem.steps && currentProblem.steps.length > 0 && (
                  <button
                    onClick={showNextStep}
                    disabled={currentStepIndex >= currentProblem.steps.length - 1 && showStep}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {showStep ? 'Next Step' : 'Show Step-by-Step'}
                  </button>
                )}
              </>
            )}

            {showSolution && (
              <button
                onClick={nextProblem}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {currentProblemIndex < problemsData.problems.length - 1 ? 'Next Problem' : 'Complete Session'}
              </button>
            )}
          </div>
        </div>

        {/* Hints Display */}
        {hintsUsed.some(hint => hint.startsWith(`${currentProblemIndex}-`)) && currentProblem.hints && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">💡 Hint:</h4>
            <div className="text-yellow-700">
              {currentProblem.hints[0]}
            </div>
          </div>
        )}

        {/* Step-by-Step Display */}
        {showStep && currentProblem.steps && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">📝 Step {currentStepIndex + 1}:</h4>
            <div className="text-green-700 mb-2">
              {currentProblem.steps[currentStepIndex]}
            </div>
            <div className="text-sm text-green-600">
              Step {currentStepIndex + 1} of {currentProblem.steps.length}
            </div>
          </div>
        )}

        {/* Solution Display */}
        {showSolution && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-800">Solution:</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                problemResults[currentProblemIndex]?.isCorrect 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {problemResults[currentProblemIndex]?.isCorrect ? 'Correct!' : 'Incorrect'}
              </span>
            </div>
            
            <div className="text-gray-700 mb-3 whitespace-pre-wrap">
              {currentProblem.solution}
            </div>

            {currentProblem.steps && (
              <div className="mt-4">
                <h5 className="font-medium text-gray-800 mb-2">Complete Solution Steps:</h5>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  {currentProblem.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {!problemResults[currentProblemIndex]?.isCorrect && (
              <div className="mt-3 p-3 bg-blue-50 rounded">
                <h5 className="font-medium text-blue-800 mb-1">Your Answer:</h5>
                <div className="text-blue-700">{userAnswer}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Stats */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <div className="flex justify-center space-x-6">
          <span>Completed: <span className="text-blue-600 font-medium">{sessionStats.completed}</span></span>
          <span>Correct: <span className="text-green-600 font-medium">{sessionStats.correct}</span></span>
          <span>Hints: <span className="text-yellow-600 font-medium">{sessionStats.hintsUsed}</span></span>
          <span>Steps: <span className="text-purple-600 font-medium">{sessionStats.stepsViewed}</span></span>
        </div>
      </div>
    </div>
  );
};

export default InteractivePracticeProblems;