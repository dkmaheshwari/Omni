import { useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Custom hook for managing typing indicators with proper debouncing
 * @param {string} threadId - The thread ID for the typing indicator
 * @param {string} userName - Optional user name override
 * @returns {object} Typing indicator functions and state
 */
export const useTypingIndicator = (threadId, userName) => {
  const { startTyping, stopTyping, isConnected } = useSocket();
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const lastTypingTimeRef = useRef(0);

  // Debounced start typing function
  const handleStartTyping = useCallback(() => {
    if (!isConnected || !threadId) return;

    const now = Date.now();
    
    // Debounce rapid typing events (don't send more than once per second)
    if (now - lastTypingTimeRef.current < 1000) {
      return;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing if not already typing
    if (!isTypingRef.current) {
      startTyping(threadId, userName);
      isTypingRef.current = true;
      lastTypingTimeRef.current = now;
    }

    // Set timeout to automatically stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 3000);
  }, [threadId, userName, startTyping, isConnected]);

  // Stop typing function
  const handleStopTyping = useCallback(() => {
    if (!isConnected || !threadId || !isTypingRef.current) return;

    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Stop typing
    stopTyping(threadId);
    isTypingRef.current = false;
  }, [threadId, stopTyping, isConnected]);

  // Cleanup on unmount or threadId change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current && threadId) {
        stopTyping(threadId);
        isTypingRef.current = false;
      }
    };
  }, [threadId, stopTyping]);

  // Stop typing when component unmounts or connection is lost
  useEffect(() => {
    if (!isConnected && isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  }, [isConnected]);

  return {
    startTyping: handleStartTyping,
    stopTyping: handleStopTyping,
    isTyping: isTypingRef.current
  };
};

/**
 * Hook for managing input field typing indicators
 * @param {string} threadId - The thread ID
 * @param {string} userName - Optional user name
 * @returns {object} Input event handlers
 */
export const useInputTypingIndicator = (threadId, userName) => {
  const { startTyping, stopTyping } = useTypingIndicator(threadId, userName);

  const handleInputChange = useCallback((event) => {
    // Start typing when user types
    if (event.target.value.length > 0) {
      startTyping();
    }
  }, [startTyping]);

  const handleInputFocus = useCallback(() => {
    // Optionally start typing when input is focused
    // This could be enabled based on user preferences
  }, []);

  const handleInputBlur = useCallback(() => {
    // Stop typing when input loses focus
    stopTyping();
  }, [stopTyping]);

  const handleKeyDown = useCallback((event) => {
    // Handle special keys
    if (event.key === 'Enter' || event.key === 'Escape') {
      stopTyping();
    } else if (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete') {
      // Start typing for actual content changes
      startTyping();
    }
  }, [startTyping, stopTyping]);

  return {
    onInputChange: handleInputChange,
    onFocus: handleInputFocus,
    onBlur: handleInputBlur,
    onKeyDown: handleKeyDown,
    startTyping,
    stopTyping
  };
};

export default useTypingIndicator;