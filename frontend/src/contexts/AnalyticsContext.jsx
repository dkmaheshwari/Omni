// Analytics Context - Centralized analytics state management
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useAnalyticsTracker } from '../hooks/useAnalyticsTracker';

const AnalyticsContext = createContext();

// Analytics state reducer
const analyticsReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LEARNING_PROFILE':
      return {
        ...state,
        learningProfile: action.payload,
        isLoading: false
      };
    
    case 'SET_PERFORMANCE_METRICS':
      return {
        ...state,
        performanceMetrics: action.payload,
        isLoading: false
      };
    
    case 'SET_ENGAGEMENT_STATS':
      return {
        ...state,
        engagementStats: action.payload,
        isLoading: false
      };
    
    case 'SET_ANALYTICS_REPORT':
      return {
        ...state,
        analyticsReport: action.payload,
        isLoading: false
      };
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    
    case 'UPDATE_REAL_TIME_METRICS':
      return {
        ...state,
        realTimeMetrics: {
          ...state.realTimeMetrics,
          ...action.payload
        }
      };
    
    case 'ADD_INSIGHT':
      return {
        ...state,
        insights: [...state.insights, action.payload]
      };
    
    case 'UPDATE_SESSION_METRICS':
      return {
        ...state,
        sessionMetrics: {
          ...state.sessionMetrics,
          ...action.payload
        }
      };
    
    case 'CLEAR_ANALYTICS':
      return {
        ...initialState
      };
    
    default:
      return state;
  }
};

// Initial state
const initialState = {
  learningProfile: null,
  performanceMetrics: null,
  engagementStats: null,
  analyticsReport: null,
  realTimeMetrics: {
    currentSession: null,
    sessionDuration: 0,
    engagementScore: 0,
    activitiesCount: 0,
    aiInteractions: 0,
    learningProgress: 0
  },
  sessionMetrics: {
    totalTime: 0,
    focusTime: 0,
    breakTime: 0,
    productivityScore: 0
  },
  insights: [],
  isLoading: false,
  error: null
};

export const AnalyticsProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(analyticsReducer, initialState);
  const analyticsTracker = useAnalyticsTracker();

  // Update real-time metrics periodically
  useEffect(() => {
    if (!analyticsTracker.isTracking) return;

    const interval = setInterval(() => {
      const sessionDuration = analyticsTracker.getSessionDuration();
      const engagementScore = analyticsTracker.calculateEngagementScore();
      
      dispatch({
        type: 'UPDATE_REAL_TIME_METRICS',
        payload: {
          currentSession: analyticsTracker.currentSession,
          sessionDuration,
          engagementScore
        }
      });
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [analyticsTracker]);

  // Enhanced tracking functions with state updates
  const trackAIInteractionWithState = async (interactionData) => {
    const interaction = await analyticsTracker.trackAIInteraction(interactionData);
    
    // Update real-time metrics
    dispatch({
      type: 'UPDATE_REAL_TIME_METRICS',
      payload: {
        aiInteractions: (state.realTimeMetrics.aiInteractions || 0) + 1
      }
    });

    // Generate insight if high-quality interaction
    if (interaction?.effectiveness?.overallScore > 80) {
      dispatch({
        type: 'ADD_INSIGHT',
        payload: {
          id: Date.now(),
          type: 'success',
          title: 'Great AI Interaction!',
          message: 'Your recent AI interaction was highly effective.',
          timestamp: new Date(),
          score: interaction.effectiveness.overallScore
        }
      });
    }

    return interaction;
  };

  const trackLearningProgressWithState = async (progressData) => {
    await analyticsTracker.trackLearningProgress(progressData);
    
    // Update real-time metrics
    dispatch({
      type: 'UPDATE_REAL_TIME_METRICS',
      payload: {
        learningProgress: (state.realTimeMetrics.learningProgress || 0) + (progressData.improvementRate || 0)
      }
    });

    // Generate insight for significant progress
    if (progressData.improvementRate > 20) {
      dispatch({
        type: 'ADD_INSIGHT',
        payload: {
          id: Date.now(),
          type: 'achievement',
          title: 'Significant Progress!',
          message: `Great improvement in ${progressData.subject || 'your studies'}!`,
          timestamp: new Date(),
          improvement: progressData.improvementRate
        }
      });
    }
  };

  const trackStudyMaterialWithState = async (materialData) => {
    await analyticsTracker.trackStudyMaterialUsage(materialData);
    
    // Update session metrics
    dispatch({
      type: 'UPDATE_SESSION_METRICS',
      payload: {
        totalTime: (state.sessionMetrics.totalTime || 0) + (materialData.timeSpent || 0)
      }
    });
  };

  const trackEngagementWithState = (engagementData) => {
    analyticsTracker.trackEngagement(engagementData);
    
    // Update real-time metrics
    dispatch({
      type: 'UPDATE_REAL_TIME_METRICS',
      payload: {
        activitiesCount: (state.realTimeMetrics.activitiesCount || 0) + 1
      }
    });

    // Generate insight for sustained high engagement
    if (engagementData.focusScore > 85) {
      dispatch({
        type: 'ADD_INSIGHT',
        payload: {
          id: Date.now(),
          type: 'engagement',
          title: 'Excellent Focus!',
          message: 'You\'re maintaining excellent focus and engagement.',
          timestamp: new Date(),
          focusScore: engagementData.focusScore
        }
      });
    }
  };

  // Session management with state updates
  const startSessionWithState = async (sessionType) => {
    const sessionId = await analyticsTracker.startSession(sessionType);
    
    dispatch({
      type: 'UPDATE_REAL_TIME_METRICS',
      payload: {
        currentSession: sessionId,
        sessionDuration: 0,
        engagementScore: 0,
        activitiesCount: 0,
        aiInteractions: 0,
        learningProgress: 0
      }
    });

    dispatch({
      type: 'UPDATE_SESSION_METRICS',
      payload: {
        totalTime: 0,
        focusTime: 0,
        breakTime: 0,
        productivityScore: 0
      }
    });

    return sessionId;
  };

  const endSessionWithState = async () => {
    await analyticsTracker.endSession();
    
    // Generate session summary insight
    const sessionDuration = state.realTimeMetrics.sessionDuration;
    const engagementScore = state.realTimeMetrics.engagementScore;
    
    dispatch({
      type: 'ADD_INSIGHT',
      payload: {
        id: Date.now(),
        type: 'session_summary',
        title: 'Session Complete',
        message: `Study session completed! Duration: ${Math.round(sessionDuration / 60000)}m, Engagement: ${engagementScore}%`,
        timestamp: new Date(),
        sessionData: {
          duration: sessionDuration,
          engagement: engagementScore,
          activities: state.realTimeMetrics.activitiesCount,
          aiInteractions: state.realTimeMetrics.aiInteractions
        }
      }
    });

    // Reset real-time metrics
    dispatch({
      type: 'UPDATE_REAL_TIME_METRICS',
      payload: {
        currentSession: null,
        sessionDuration: 0,
        engagementScore: 0,
        activitiesCount: 0,
        aiInteractions: 0,
        learningProgress: 0
      }
    });
  };

  // Productivity score calculation
  const calculateProductivityScore = () => {
    const { sessionDuration, engagementScore, aiInteractions, learningProgress } = state.realTimeMetrics;
    
    if (sessionDuration === 0) return 0;
    
    // Base score on engagement
    let score = engagementScore * 0.4;
    
    // Add points for AI interactions (up to a reasonable limit)
    const aiScore = Math.min(aiInteractions * 2, 30);
    score += aiScore * 0.3;
    
    // Add points for learning progress
    score += learningProgress * 0.3;
    
    // Time factor (longer sessions get slight bonus)
    const timeBonus = Math.min(sessionDuration / 60000 * 0.5, 10);
    score += timeBonus;
    
    return Math.round(Math.min(score, 100));
  };

  // Learning streak calculation
  const calculateLearningStreak = () => {
    // This would typically be calculated from historical data
    // For now, return a placeholder
    return 0;
  };

  // Weekly progress calculation
  const calculateWeeklyProgress = () => {
    // This would be calculated from weekly analytics data
    return 0;
  };

  // Generate personalized recommendations
  const generateRecommendations = () => {
    const recommendations = [];
    const { engagementScore, aiInteractions, sessionDuration } = state.realTimeMetrics;
    
    // Engagement-based recommendations
    if (engagementScore < 50) {
      recommendations.push({
        id: 'low_engagement',
        type: 'engagement',
        title: 'Improve Focus',
        message: 'Consider taking a short break or changing your study environment.',
        priority: 'high',
        action: 'Try the Pomodoro technique for better focus.'
      });
    }
    
    // AI interaction recommendations
    if (aiInteractions === 0 && sessionDuration > 600000) { // 10 minutes
      recommendations.push({
        id: 'no_ai_help',
        type: 'ai_usage',
        title: 'Need Help?',
        message: 'Don\'t hesitate to ask the AI tutor if you have questions.',
        priority: 'medium',
        action: 'Ask the AI tutor for clarification on difficult concepts.'
      });
    }
    
    // Session length recommendations
    if (sessionDuration > 7200000) { // 2 hours
      recommendations.push({
        id: 'long_session',
        type: 'break',
        title: 'Take a Break',
        message: 'You\'ve been studying for over 2 hours. Consider taking a break.',
        priority: 'high',
        action: 'Take a 15-minute break to refresh your mind.'
      });
    }
    
    return recommendations;
  };

  // Clear insights older than 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const filteredInsights = state.insights.filter(insight => 
        new Date(insight.timestamp) > oneDayAgo
      );
      
      if (filteredInsights.length !== state.insights.length) {
        dispatch({
          type: 'CLEAR_ANALYTICS'
        });
        state.insights = filteredInsights;
      }
    }, 3600000); // Check every hour

    return () => clearInterval(interval);
  }, [state.insights]);

  const value = {
    // State
    ...state,
    
    // Enhanced tracking functions
    trackAIInteraction: trackAIInteractionWithState,
    trackLearningProgress: trackLearningProgressWithState,
    trackStudyMaterial: trackStudyMaterialWithState,
    trackEngagement: trackEngagementWithState,
    
    // Session management
    startSession: startSessionWithState,
    endSession: endSessionWithState,
    
    // Original tracker functions
    trackEvent: analyticsTracker.trackEvent,
    trackPageView: analyticsTracker.trackPageView,
    trackClick: analyticsTracker.trackClick,
    trackKeyboardInput: analyticsTracker.trackKeyboardInput,
    
    // Metrics calculations
    calculateProductivityScore,
    calculateLearningStreak,
    calculateWeeklyProgress,
    generateRecommendations,
    
    // Utility functions
    getSessionDuration: analyticsTracker.getSessionDuration,
    getTimeSinceLastActivity: analyticsTracker.getTimeSinceLastActivity,
    calculateEngagementScore: analyticsTracker.calculateEngagementScore,
    
    // State management
    dispatch,
    
    // Tracker state
    currentSession: analyticsTracker.currentSession,
    isTracking: analyticsTracker.isTracking
  };

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};

export default AnalyticsContext;