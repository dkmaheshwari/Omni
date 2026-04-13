// Interactive Quiz Component - Real-time quiz with immediate feedback
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const InteractiveQuiz = ({ quizData, onQuizComplete }) => {
  const { user } = useAuth();
  
  // Safety check for quiz data
  if (!quizData || !quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Quiz Data Error</h3>
          <p className="text-sm text-gray-600 mb-4">
            Unable to load quiz questions. Please try generating a new quiz.
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

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showFeedback, setShowFeedback] = useState({});
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState({});

  useEffect(() => {
    setQuestionStartTime(Date.now());
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  const handleAnswerSelect = (questionIndex, selectedOption) => {
    const currentTime = Date.now();
    const timeForQuestion = (currentTime - questionStartTime) / 1000;
    
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));

    setQuestionTimes(prev => ({
      ...prev,
      [questionIndex]: timeForQuestion
    }));

    // Show immediate feedback
    const question = quizData.questions[questionIndex];
    if (!question) {
      console.error('Question not found at index:', questionIndex);
      return;
    }
    const isCorrect = selectedOption === question.correctAnswer;
    
    setShowFeedback(prev => ({
      ...prev,
      [questionIndex]: {
        isCorrect,
        explanation: question.explanation,
        correctAnswer: question.correctAnswer,
        selectedAnswer: selectedOption
      }
    }));

    // Update score
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Auto-advance after showing feedback
    setTimeout(() => {
      if (questionIndex < quizData.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setQuestionStartTime(Date.now());
      } else {
        completeQuiz();
      }
    }, 2000);
  };

  const completeQuiz = () => {
    setQuizCompleted(true);
    const finalScore = (score / quizData.questions.length) * 100;
    const totalTime = Object.values(questionTimes).reduce((sum, time) => sum + time, 0);
    
    if (onQuizComplete) {
      onQuizComplete({
        score: finalScore,
        totalTime,
        questionTimes,
        selectedAnswers,
        feedback: showFeedback
      });
    }
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowFeedback({});
    setQuizCompleted(false);
    setScore(0);
    setTimeSpent(0);
    setQuestionTimes({});
    setQuestionStartTime(Date.now());
  };

  const getProgressPercentage = () => {
    return ((currentQuestionIndex + 1) / quizData.questions.length) * 100;
  };

  const getFeedbackColor = (isCorrect) => {
    return isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  };

  const getFeedbackTextColor = (isCorrect) => {
    return isCorrect ? 'text-green-800' : 'text-red-800';
  };

  if (quizCompleted) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-6xl mb-2">
              {score / quizData.questions.length >= 0.8 ? '🎉' : 
               score / quizData.questions.length >= 0.6 ? '👍' : '📚'}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Quiz Complete!</h2>
            <div className="text-lg text-gray-600">
              Your Score: {score}/{quizData.questions.length} ({Math.round((score / quizData.questions.length) * 100)}%)
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Time Spent:</span>
                <span className="ml-2 font-medium">{Math.round(timeSpent / 60)}m {timeSpent % 60}s</span>
              </div>
              <div>
                <span className="text-gray-600">Average per Question:</span>
                <span className="ml-2 font-medium">{Math.round(timeSpent / quizData.questions.length)}s</span>
              </div>
              <div>
                <span className="text-gray-600">Correct Rate:</span>
                <span className="ml-2 font-medium">{Math.round((score / quizData.questions.length) * 100)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Performance:</span>
                <span className="ml-2 font-medium">
                  {score / quizData.questions.length >= 0.8 ? 'Excellent' : 
                   score / quizData.questions.length >= 0.6 ? 'Good' : 'Needs Practice'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetQuiz}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Retake Quiz
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

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const hasFeedback = showFeedback[currentQuestionIndex];
  
  // Safety check for current question
  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-500 mb-4">Error: Question not found</div>
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Question {currentQuestionIndex + 1} of {quizData.questions.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {currentQuestion.question}
        </h3>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options && currentQuestion.options.map((option, index) => {
            const optionLetter = String.fromCharCode(65 + index);
            const isSelected = selectedAnswers[currentQuestionIndex] === option;
            const isCorrect = option === currentQuestion.correctAnswer;
            
            let buttonClasses = "w-full p-3 text-left border-2 rounded-lg transition-all duration-200 ";
            
            if (hasFeedback) {
              if (isSelected) {
                buttonClasses += isCorrect 
                  ? "bg-green-100 border-green-300 text-green-800" 
                  : "bg-red-100 border-red-300 text-red-800";
              } else if (isCorrect) {
                buttonClasses += "bg-green-50 border-green-200 text-green-700";
              } else {
                buttonClasses += "bg-gray-50 border-gray-200 text-gray-600";
              }
            } else {
              buttonClasses += isSelected
                ? "bg-blue-50 border-blue-300 text-blue-800"
                : "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:border-gray-300";
            }

            return (
              <button
                key={index}
                onClick={() => !hasFeedback && handleAnswerSelect(currentQuestionIndex, option)}
                disabled={hasFeedback}
                className={buttonClasses}
              >
                <span className="font-medium">{optionLetter})</span> {option}
                {hasFeedback && isCorrect && (
                  <span className="float-right text-green-600">✓</span>
                )}
                {hasFeedback && isSelected && !isCorrect && (
                  <span className="float-right text-red-600">✗</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Immediate Feedback */}
      {hasFeedback && (
        <div className={`p-4 rounded-lg border-2 ${getFeedbackColor(hasFeedback.isCorrect)}`}>
          <div className={`font-semibold mb-2 ${getFeedbackTextColor(hasFeedback.isCorrect)}`}>
            {hasFeedback.isCorrect ? (
              <span className="flex items-center">
                <span className="text-green-600 mr-2">✓</span>
                Correct!
              </span>
            ) : (
              <span className="flex items-center">
                <span className="text-red-600 mr-2">✗</span>
                Incorrect
              </span>
            )}
          </div>
          
          {!hasFeedback.isCorrect && (
            <div className="mb-2 text-sm text-gray-700">
              <strong>Correct Answer:</strong> {hasFeedback.correctAnswer}
            </div>
          )}
          
          {hasFeedback.explanation && (
            <div className="text-sm text-gray-700">
              <strong>Explanation:</strong> {hasFeedback.explanation}
            </div>
          )}
          
          <div className="mt-3 text-xs text-gray-600">
            {currentQuestionIndex < quizData.questions.length - 1 
              ? "Moving to next question..." 
              : "Completing quiz..."}
          </div>
        </div>
      )}

      {/* Skip Button (only if no feedback shown) */}
      {!hasFeedback && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => handleAnswerSelect(currentQuestionIndex, '')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Skip Question
          </button>
          <div className="text-sm text-gray-500">
            Score: {score}/{currentQuestionIndex + (selectedAnswers[currentQuestionIndex] ? 1 : 0)}
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveQuiz;