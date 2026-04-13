// Custom hook for real-time analytics tracking
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../axios';

export const useAnalyticsTracker = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const sessionStartTime = useRef(null);
  const lastActivityTime = useRef(null);
  const activityBuffer = useRef([]);
  const flushTimer = useRef(null);

  // Start a new analytics session
  const startSession = useCallback(async (sessionType = 'study') => {
    if (!user || currentSession) return;

    try {
      const response = await axios.post('/analytics/session/start', {
        sessionType
      });

      if (response.data.success) {
        const sessionId = response.data.sessionId;
        setCurrentSession(sessionId);
        setIsTracking(true);
        sessionStartTime.current = Date.now();
        lastActivityTime.current = Date.now();

        // Start activity tracking
        startActivityTracking(sessionId);

        return sessionId;
      }
    } catch (error) {
      console.error('Error starting analytics session:', error);
    }
  }, [user, currentSession]);

  // End current analytics session
  const endSession = useCallback(async () => {
    if (!currentSession) return;

    try {
      // Flush any pending activities
      await flushActivityBuffer();

      // End the session
      await axios.post('/analytics/session/end', {
        sessionId: currentSession
      });

      // Clean up
      setCurrentSession(null);
      setIsTracking(false);
      sessionStartTime.current = null;
      lastActivityTime.current = null;
      
      if (flushTimer.current) {
        clearInterval(flushTimer.current);
        flushTimer.current = null;
      }
    } catch (error) {
      console.error('Error ending analytics session:', error);
    }
  }, [currentSession]);

  // Track a specific event
  const trackEvent = useCallback(async (eventType, eventData) => {
    if (!currentSession) return;

    try {
      await axios.post('/analytics/track/event', {
        sessionId: currentSession,
        eventType,
        eventData
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [currentSession]);

  // Track AI interaction
  const trackAIInteraction = useCallback(async (interactionData) => {
    if (!user) return;

    try {
      const response = await axios.post('/analytics/track/ai-interaction', {
        ...interactionData,
        sessionId: currentSession
      });

      // Also track as session event
      if (currentSession) {
        await trackEvent('ai_interaction', {
          interactionType: interactionData.interactionType,
          subject: interactionData.subject,
          responseTime: interactionData.responseTime,
          effectiveness: response.data.interaction?.effectiveness
        });
      }

      return response.data.interaction;
    } catch (error) {
      console.error('Error tracking AI interaction:', error);
    }
  }, [user, currentSession, trackEvent]);

  // Track learning progress
  const trackLearningProgress = useCallback(async (progressData) => {
    if (!user) return;

    try {
      await axios.post('/analytics/track/learning-progress', {
        ...progressData,
        sessionId: currentSession
      });

      // Also track as session event
      if (currentSession) {
        await trackEvent('learning_progress', progressData);
      }
    } catch (error) {
      console.error('Error tracking learning progress:', error);
    }
  }, [user, currentSession, trackEvent]);

  // Track study material usage
  const trackStudyMaterialUsage = useCallback(async (materialData) => {
    if (!user) return;

    try {
      await axios.post('/analytics/track/study-material', {
        ...materialData,
        sessionId: currentSession
      });

      // Also track as session event
      if (currentSession) {
        await trackEvent('study_material_usage', materialData);
      }
    } catch (error) {
      console.error('Error tracking study material usage:', error);
    }
  }, [user, currentSession, trackEvent]);

  // Track engagement (buffered for performance)
  const trackEngagement = useCallback((engagementData) => {
    if (!user || !currentSession) return;

    // Add to buffer
    activityBuffer.current.push({
      timestamp: Date.now(),
      type: 'engagement',
      data: engagementData
    });

    // Update last activity time
    lastActivityTime.current = Date.now();
  }, [user, currentSession]);

  // Track page view
  const trackPageView = useCallback((page, duration) => {
    if (!currentSession) return;

    trackEvent('page_view', {
      page,
      duration,
      timestamp: Date.now()
    });
  }, [currentSession, trackEvent]);

  // Track click event
  const trackClick = useCallback((element, context) => {
    if (!currentSession) return;

    trackEvent('click', {
      element,
      context,
      timestamp: Date.now()
    });
  }, [currentSession, trackEvent]);

  // Track keyboard input
  const trackKeyboardInput = useCallback((inputType, inputLength) => {
    if (!currentSession) return;

    // Add to buffer (keyboard events are frequent)
    activityBuffer.current.push({
      timestamp: Date.now(),
      type: 'keyboard_input',
      data: {
        inputType,
        inputLength
      }
    });

    lastActivityTime.current = Date.now();
  }, [currentSession]);

  // Calculate current session duration
  const getSessionDuration = useCallback(() => {
    if (!sessionStartTime.current) return 0;
    return Date.now() - sessionStartTime.current;
  }, []);

  // Calculate time since last activity
  const getTimeSinceLastActivity = useCallback(() => {
    if (!lastActivityTime.current) return 0;
    return Date.now() - lastActivityTime.current;
  }, []);

  // Calculate engagement score based on activity
  const calculateEngagementScore = useCallback(() => {
    const sessionDuration = getSessionDuration();
    const timeSinceLastActivity = getTimeSinceLastActivity();
    
    if (sessionDuration === 0) return 0;

    // Base engagement on recency of activity
    const activityScore = Math.max(0, 100 - (timeSinceLastActivity / 1000 / 60 * 10)); // Decay over 10 minutes
    
    // Factor in session length (longer sessions = higher engagement up to a point)
    const sessionScore = Math.min(100, sessionDuration / 1000 / 60 * 2); // 2 points per minute, max 100
    
    return Math.round((activityScore + sessionScore) / 2);
  }, [getSessionDuration, getTimeSinceLastActivity]);

  // Start activity tracking
  const startActivityTracking = useCallback((sessionId) => {
    // Set up periodic flush of activity buffer
    flushTimer.current = setInterval(async () => {
      await flushActivityBuffer();
    }, 30000); // Flush every 30 seconds

    // Track mouse movement (throttled)
    let lastMouseMove = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMove > 5000) { // Throttle to once per 5 seconds
        lastMouseMove = now;
        lastActivityTime.current = now;
        
        activityBuffer.current.push({
          timestamp: now,
          type: 'mouse_activity',
          data: { activity: 'move' }
        });
      }
    };

    // Track scroll events (throttled)
    let lastScroll = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScroll > 2000) { // Throttle to once per 2 seconds
        lastScroll = now;
        lastActivityTime.current = now;
        
        activityBuffer.current.push({
          timestamp: now,
          type: 'scroll_activity',
          data: { 
            scrollY: window.scrollY,
            scrollX: window.scrollX
          }
        });
      }
    };

    // Track window focus/blur
    const handleFocus = () => {
      lastActivityTime.current = Date.now();
      activityBuffer.current.push({
        timestamp: Date.now(),
        type: 'window_focus',
        data: { focused: true }
      });
    };

    const handleBlur = () => {
      activityBuffer.current.push({
        timestamp: Date.now(),
        type: 'window_focus',
        data: { focused: false }
      });
    };

    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Clean up function
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Flush activity buffer to server
  const flushActivityBuffer = useCallback(async () => {
    if (!currentSession || activityBuffer.current.length === 0) return;

    try {
      // Calculate engagement metrics from buffer
      const engagementScore = calculateEngagementScore();
      const activityCount = activityBuffer.current.length;
      const sessionDuration = getSessionDuration();

      // Send engagement data
      await axios.post('/analytics/track/engagement', {
        sessionId: currentSession,
        activityType: 'mixed',
        duration: sessionDuration,
        interactionCount: activityCount,
        focusScore: engagementScore
      });

      // Clear buffer
      activityBuffer.current = [];
    } catch (error) {
      console.error('Error flushing activity buffer:', error);
    }
  }, [currentSession, calculateEngagementScore, getSessionDuration]);

  // Auto-start session when user logs in
  useEffect(() => {
    if (user && !currentSession) {
      startSession();
    }
  }, [user, currentSession, startSession]);

  // Auto-end session when user logs out or component unmounts
  useEffect(() => {
    return () => {
      if (currentSession) {
        endSession();
      }
    };
  }, [currentSession, endSession]);

  // Periodic engagement tracking
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      const engagementScore = calculateEngagementScore();
      trackEngagement({
        activityType: 'periodic',
        duration: getSessionDuration(),
        interactionCount: activityBuffer.current.length,
        focusScore: engagementScore
      });
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isTracking, calculateEngagementScore, trackEngagement, getSessionDuration]);

  return {
    // Session management
    currentSession,
    isTracking,
    startSession,
    endSession,
    
    // Event tracking
    trackEvent,
    trackAIInteraction,
    trackLearningProgress,
    trackStudyMaterialUsage,
    trackEngagement,
    trackPageView,
    trackClick,
    trackKeyboardInput,
    
    // Metrics
    getSessionDuration,
    getTimeSinceLastActivity,
    calculateEngagementScore,
    
    // Utilities
    flushActivityBuffer
  };
};

export default useAnalyticsTracker;