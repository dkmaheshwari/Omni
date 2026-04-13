// Adaptive Flashcards Component - Spaced repetition learning system
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';

const AdaptiveFlashcards = ({ flashcardsData, onStudyComplete }) => {
  const { user } = useAuth();
  
  // Safety check for flashcards data
  if (!flashcardsData || !flashcardsData.cards || !Array.isArray(flashcardsData.cards) || flashcardsData.cards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Flashcards Data Error</h3>
          <p className="text-sm text-gray-600 mb-4">
            Unable to load flashcards. Please try generating new flashcards.
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

  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyResults, setStudyResults] = useState({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [studyStats, setStudyStats] = useState({
    correct: 0,
    incorrect: 0,
    totalTime: 0,
    cardsStudied: 0
  });
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  const [sessionStartTime] = useState(Date.now());
  const [showAnswer, setShowAnswer] = useState(false);
  
  // Spaced repetition algorithm state
  const [cardDifficulties, setCardDifficulties] = useState(() => {
    // Initialize all cards with default difficulty (1 = easy, 2 = medium, 3 = hard)
    const initial = {};
    flashcardsData.cards.forEach((_, index) => {
      initial[index] = {
        difficulty: 2, // Start with medium difficulty
        interval: 1, // Days until next review
        repetitions: 0,
        easeFactor: 2.5, // Initial ease factor for spaced repetition
        lastReviewed: null,
        totalReviews: 0,
        correctStreak: 0
      };
    });
    return initial;
  });

  // Get cards ordered by spaced repetition priority
  const getNextCardIndex = () => {
    const unreviewed = flashcardsData.cards
      .map((_, index) => index)
      .filter(index => !studyResults[index]);
    
    if (unreviewed.length === 0) {
      return null; // All cards reviewed
    }

    // Sort by priority: hardest cards and cards due for review first
    unreviewed.sort((a, b) => {
      const aDiff = cardDifficulties[a];
      const bDiff = cardDifficulties[b];
      
      // Prioritize cards that haven't been reviewed yet
      if (aDiff.totalReviews === 0 && bDiff.totalReviews > 0) return -1;
      if (bDiff.totalReviews === 0 && aDiff.totalReviews > 0) return 1;
      
      // Then prioritize by difficulty (harder cards first)
      if (aDiff.difficulty !== bDiff.difficulty) {
        return bDiff.difficulty - aDiff.difficulty;
      }
      
      // Then by ease factor (lower ease = needs more practice)
      return aDiff.easeFactor - bDiff.easeFactor;
    });

    return unreviewed[0];
  };

  useEffect(() => {
    setCardStartTime(Date.now());
  }, [currentCardIndex]);

  const handleDifficultyResponse = (difficulty) => {
    const timeSpent = (Date.now() - cardStartTime) / 1000;
    
    // Update study results
    const isCorrect = difficulty <= 2; // Easy (1) or Medium (2) considered correct
    const newResults = {
      ...studyResults,
      [currentCardIndex]: {
        difficulty,
        timeSpent,
        isCorrect,
        timestamp: Date.now()
      }
    };
    setStudyResults(newResults);

    // Update statistics
    setStudyStats(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'incorrect']: prev[isCorrect ? 'correct' : 'incorrect'] + 1,
      totalTime: prev.totalTime + timeSpent,
      cardsStudied: prev.cardsStudied + 1
    }));

    // Update spaced repetition data
    updateSpacedRepetitionData(currentCardIndex, difficulty, timeSpent);

    // Move to next card or complete session
    const nextIndex = getNextCardIndex();
    if (nextIndex !== null && Object.keys(newResults).length < flashcardsData.cards.length) {
      setCurrentCardIndex(nextIndex);
      setIsFlipped(false);
      setShowAnswer(false);
    } else {
      completeSession(newResults);
    }
  };

  const updateSpacedRepetitionData = (cardIndex, difficulty, timeSpent) => {
    setCardDifficulties(prev => {
      const current = prev[cardIndex];
      let newEaseFactor = current.easeFactor;
      let newInterval = current.interval;
      let newRepetitions = current.repetitions + 1;
      let newCorrectStreak = difficulty <= 2 ? current.correctStreak + 1 : 0;

      // Spaced repetition algorithm (SM-2 inspired)
      if (difficulty === 1) { // Easy
        newEaseFactor = Math.min(newEaseFactor + 0.15, 3.0);
        newInterval = Math.max(1, Math.round(newInterval * newEaseFactor));
      } else if (difficulty === 2) { // Medium  
        newEaseFactor = Math.max(newEaseFactor - 0.05, 1.3);
        newInterval = Math.max(1, Math.round(newInterval * newEaseFactor * 0.8));
      } else { // Hard (3) or Very Hard (4)
        newEaseFactor = Math.max(newEaseFactor - 0.2, 1.3);
        newInterval = 1; // Reset to daily review
        newCorrectStreak = 0;
      }

      return {
        ...prev,
        [cardIndex]: {
          ...current,
          difficulty: difficulty,
          interval: newInterval,
          repetitions: newRepetitions,
          easeFactor: newEaseFactor,
          lastReviewed: Date.now(),
          totalReviews: current.totalReviews + 1,
          correctStreak: newCorrectStreak
        }
      };
    });
  };

  const completeSession = async (finalResults) => {
    setSessionComplete(true);
    const totalTime = (Date.now() - sessionStartTime) / 1000;
    
    const sessionData = {
      flashcardsId: flashcardsData.id,
      results: finalResults,
      cardDifficulties,
      sessionStats: {
        ...studyStats,
        totalTime,
        sessionComplete: true
      }
    };

    if (onStudyComplete) {
      onStudyComplete(sessionData);
    }

    // Save session data to backend
    try {
      await axios.post('/ai/generate/flashcards/submit-session', {
        flashcardsId: flashcardsData.id,
        sessionData,
        userId: user.uid
      });
    } catch (error) {
      console.error('Error saving flashcard session:', error);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const resetSession = () => {
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setShowAnswer(false);
    setStudyResults({});
    setSessionComplete(false);
    setStudyStats({
      correct: 0,
      incorrect: 0,
      totalTime: 0,
      cardsStudied: 0
    });
    setCardStartTime(Date.now());
  };

  const getProgressPercentage = () => {
    return (Object.keys(studyResults).length / flashcardsData.cards.length) * 100;
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 1: return 'text-green-600 bg-green-50 border-green-200';
      case 2: return 'text-blue-600 bg-blue-50 border-blue-200';
      case 3: return 'text-orange-600 bg-orange-50 border-orange-200';
      case 4: return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (sessionComplete) {
    const accuracy = studyStats.cardsStudied > 0 ? (studyStats.correct / studyStats.cardsStudied) * 100 : 0;
    
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <div className="mb-4">
            <div className="text-6xl mb-2">
              {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '📚'}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Study Session Complete!</h2>
            <div className="text-lg text-gray-600">
              Accuracy: {Math.round(accuracy)}% ({studyStats.correct}/{studyStats.cardsStudied})
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Cards Studied:</span>
                <span className="ml-2 font-medium">{studyStats.cardsStudied}</span>
              </div>
              <div>
                <span className="text-gray-600">Time Spent:</span>
                <span className="ml-2 font-medium">{Math.round(studyStats.totalTime / 60)}m {Math.round(studyStats.totalTime % 60)}s</span>
              </div>
              <div>
                <span className="text-gray-600">Correct:</span>
                <span className="ml-2 font-medium text-green-600">{studyStats.correct}</span>
              </div>
              <div>
                <span className="text-gray-600">Need Review:</span>
                <span className="ml-2 font-medium text-orange-600">{studyStats.incorrect}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={resetSession}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Study Again
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

  const currentCard = flashcardsData.cards[currentCardIndex];
  const cardProgress = cardDifficulties[currentCardIndex];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Card {Object.keys(studyResults).length + 1} of {flashcardsData.cards.length}
          </span>
          <span className="text-sm text-gray-500">
            Accuracy: {studyStats.cardsStudied > 0 ? Math.round((studyStats.correct / studyStats.cardsStudied) * 100) : 0}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Card Display */}
      <div className="mb-6">
        <div 
          className="relative h-64 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border-2 border-blue-200 cursor-pointer transition-all duration-300 hover:shadow-lg"
          onClick={flipCard}
        >
          <div className="absolute inset-0 p-6 flex items-center justify-center">
            <div className="text-center">
              {!showAnswer ? (
                <div>
                  <div className="text-sm text-blue-600 mb-2">FRONT</div>
                  <div className="text-lg font-medium text-gray-800">
                    {currentCard.front}
                  </div>
                  <div className="text-sm text-gray-500 mt-4">Click to reveal answer</div>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-green-600 mb-2">BACK</div>
                  <div className="text-lg font-medium text-gray-800">
                    {currentCard.back}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Card flip indicator */}
          <div className="absolute top-2 right-2">
            <div className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card Metadata */}
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Reviews: {cardProgress.totalReviews}</span>
          <span>Streak: {cardProgress.correctStreak}</span>
          <span>Next: {cardProgress.interval} day(s)</span>
        </div>
      </div>

      {/* Difficulty Response Buttons */}
      {showAnswer && (
        <div className="space-y-3">
          <div className="text-center text-sm text-gray-600 mb-4">
            How well did you know this card?
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDifficultyResponse(1)}
              className="p-3 border-2 border-green-200 bg-green-50 text-green-800 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="font-medium">Easy</div>
              <div className="text-xs">Knew it well</div>
            </button>
            
            <button
              onClick={() => handleDifficultyResponse(2)}
              className="p-3 border-2 border-blue-200 bg-blue-50 text-blue-800 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="font-medium">Good</div>
              <div className="text-xs">Remembered</div>
            </button>
            
            <button
              onClick={() => handleDifficultyResponse(3)}
              className="p-3 border-2 border-orange-200 bg-orange-50 text-orange-800 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="font-medium">Hard</div>
              <div className="text-xs">Struggled</div>
            </button>
            
            <button
              onClick={() => handleDifficultyResponse(4)}
              className="p-3 border-2 border-red-200 bg-red-50 text-red-800 rounded-lg hover:bg-red-100 transition-colors"
            >
              <div className="font-medium">Again</div>
              <div className="text-xs">Didn't know</div>
            </button>
          </div>
        </div>
      )}

      {/* Study Stats */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <div className="flex justify-center space-x-4">
          <span>Correct: <span className="text-green-600 font-medium">{studyStats.correct}</span></span>
          <span>Incorrect: <span className="text-red-600 font-medium">{studyStats.incorrect}</span></span>
          <span>Time: {Math.round(studyStats.totalTime / 60)}m {Math.round(studyStats.totalTime % 60)}s</span>
        </div>
      </div>
    </div>
  );
};

export default AdaptiveFlashcards;