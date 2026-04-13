// frontend/src/contexts/MessageContext.jsx

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import axios from "../axios";
import { handleApiError, isAuthError } from "../utils/errorHandler";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

// Student-friendly error messages for chat functionality
const getChatFriendlyErrorMessage = (error, context) => {
  const status = error?.response?.status;
  const errorType = error?.response?.data?.errorType;
  
  // Network connectivity issues
  if (error?.code === 'ERR_NETWORK' || error?.code === 'ETIMEDOUT') {
    return `🌐 Connection lost! Your messages are safe. Check your internet and we'll reconnect automatically.`;
  }
  
  // Authentication issues
  if (status === 401 || status === 403) {
    if (errorType === 'THREAD_ACCESS_DENIED') {
      return `🚪 You don't have access to this study group anymore. The group settings may have changed.`;
    }
    return `🔐 Please log in again to continue chatting. Your messages are safe!`;
  }
  
  // Rate limiting
  if (status === 429) {
    return `⏰ Whoa, slow down! You're sending messages too quickly. Take a breath and try again in a moment.`;
  }
  
  // File upload issues
  if (context === 'upload' && status === 413) {
    return `📁 File too large! Please choose a smaller file (under 5MB) to share with your study group.`;
  }
  
  // Server errors
  if (status >= 500) {
    return `🔧 Our chat servers are having a moment. Your messages are safe - we'll reconnect automatically!`;
  }
  
  // Context-specific messages
  switch (context) {
    case 'sending':
      return `💬 Couldn't send your message right now. Don't worry - we'll keep trying!`;
    case 'loading':
      return `💬 Having trouble loading messages. We'll keep trying to reconnect!`;
    case 'upload':
      return `📁 Couldn't upload your file right now. Please try again!`;
    case 'search':
      return `🔍 Search isn't working right now. Please try again in a moment!`;
    case 'reaction':
      return `😊 Couldn't add your reaction right now. Please try again!`;
    case 'summary':
      return `📊 Can't create a summary right now. Your messages are all still here though!`;
    default:
      return `💬 Something went wrong with the chat. Don't worry - your messages are safe!`;
  }
};

const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLargeSummary, setIsLargeSummary] = useState(false);
  const [error, setError] = useState(null);
  const [threadInfo, setThreadInfo] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  
  // New states for loading indicators
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [pendingMessage, setPendingMessage] = useState(null);
  const { logout, currentUser } = useAuth();
  const { joinThread } = useSocket();
  
  // Refs for polling and stable function references
  const pollingIntervalRef = useRef(null);
  const currentThreadIdRef = useRef(null);
  const lastMessageTimeRef = useRef(null);
  
  // PERFORMANCE FIX: Use stable references to prevent infinite re-renders
  const logoutRef = useRef(logout);
  logoutRef.current = logout;
  
  const fetchMessagesRef = useRef();
  const joinThreadRef = useRef(joinThread);
  joinThreadRef.current = joinThread;

  // Socket.IO real-time message listener
  useEffect(() => {
    const handleSocketMessage = (event) => {
      const { message, threadId } = event.detail;
      
      // DEBUG: Log thread ID comparison
      console.log(`🔍 Socket message received:`, {
        messageId: message._id,
        messageType: message.messageType,
        receivedThreadId: threadId,
        currentThreadId: currentThreadIdRef.current,
        threadsMatch: threadId === currentThreadIdRef.current,
        threadsMatchAsString: String(threadId) === String(currentThreadIdRef.current)
      });
      
      // Convert thread IDs to strings for comparison (handle ObjectId vs string mismatch)
      const normalizedMessageThreadId = String(threadId);
      const normalizedCurrentThreadId = String(currentThreadIdRef.current || '');
      
      // Only add message if it's for the current thread OR if it's an AI message (more permissive for AI)
      const isForCurrentThread = normalizedMessageThreadId === normalizedCurrentThreadId;
      const isAIMessage = message.messageType === 'ai';
      
      if (isForCurrentThread || isAIMessage) {
        console.log(`📨 Processing real-time message (AI: ${isAIMessage}, ThreadMatch: ${isForCurrentThread}):`, message);
        
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const existingIds = new Set(prev.map(msg => msg._id));
          if (!existingIds.has(message._id)) {
            console.log(`✅ Adding real-time message to thread ${threadId}:`, {
              messageId: message._id,
              messageType: message.messageType,
              textPreview: message.text?.substring(0, 50) + '...'
            });
            return [...prev, message];
          } else {
            console.log(`🔄 Skipping duplicate message: ${message._id}`);
          }
          return prev;
        });
      } else {
        console.log(`❌ Ignoring message for different thread:`, {
          messageThreadId: normalizedMessageThreadId,
          currentThreadId: normalizedCurrentThreadId
        });
      }
    };

    const handleSocketReaction = (event) => {
      const { messageId, reactions, threadId } = event.detail;
      
      // Only update reactions if it's for the current thread
      if (threadId === currentThreadIdRef.current) {
        setMessages(prev => {
          return prev.map(msg => 
            msg._id === messageId 
              ? { ...msg, reactions } 
              : msg
          );
        });
      }
    };

    window.addEventListener('socket-new-message', handleSocketMessage);
    window.addEventListener('socket-message-reaction', handleSocketReaction);
    
    return () => {
      window.removeEventListener('socket-new-message', handleSocketMessage);
      window.removeEventListener('socket-message-reaction', handleSocketReaction);
    };
  }, []);

  // Fetch messages for a thread
  const fetchMessages = useCallback(async (threadId, since = null) => {
    console.log('🔧 DEBUG: fetchMessages called', { threadId, since });
    const isPollingRequest = !!since; // If 'since' is provided, this is a polling request
    
    if (!since) setIsLoading(true);
    setError(null);
    
    try {
      // CRITICAL FIX: Prevent infinite retry loops and network exhaustion
      const maxRetries = isPollingRequest ? 1 : 3; // Limit retries for polling requests
      const retryDelay = isPollingRequest ? 2000 : 1000; // Longer delay for polling
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const url = since ? `/messages/${threadId}?since=${since}` : `/messages/${threadId}`;
          const response = await axios.get(url);
          
          if (response.data.messages) {
            // New API response format with thread info
            if (since) {
              // For polling, append only new messages that don't already exist
              setMessages(prev => {
                const existingIds = new Set(prev.map(msg => msg._id));
                const newMessages = response.data.messages.filter(msg => !existingIds.has(msg._id));
                const allMessages = [...prev, ...newMessages];
                // Keep only last 500 messages to prevent memory issues
                return allMessages.slice(-500);
              });
            } else {
              // For initial load, replace all messages
              setMessages(response.data.messages);
            }
            setThreadInfo(response.data.thread);
            
            // Update last message time for polling
            if (response.data.messages.length > 0) {
              const lastMessage = response.data.messages[response.data.messages.length - 1];
              lastMessageTimeRef.current = lastMessage.createdAt;
            }
          } else {
            // Fallback for old API format
            setMessages(response.data || []);
          }
          
          // Success - break out of retry loop
          return;
          
        } catch (err) {
          const errorType = err.response?.data?.errorType;
          const is403Error = err.response?.status === 403;
          const isNetworkError = err.code === 'ERR_NETWORK' || err.code === 'ERR_INSUFFICIENT_RESOURCES';
          
          // CRITICAL FIX: Stop polling immediately on network exhaustion
          if (isNetworkError && isPollingRequest) {
            console.error(`🚨 Network exhaustion detected in polling, stopping all polling for thread ${threadId}`);
            stopPolling();
            setError('🌐 Connection lost! We\'re working to reconnect your chat automatically.');
            break;
          }
          
          // CRITICAL FIX: Don't retry network errors for polling requests
          if (isNetworkError && isPollingRequest) {
            console.log(`⚠️ Network error in polling request, skipping retry to prevent resource exhaustion`);
            break;
          }
          
          // Check if this is a thread access error that might resolve with retry (only for non-polling)
          if (is403Error && errorType === 'THREAD_ACCESS_DENIED' && attempt < maxRetries && !isPollingRequest) {
            console.log(`⏰ Attempt ${attempt}/${maxRetries}: Thread access denied, retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue; // Retry the request
          }
          
          // Handle final failure or non-retryable errors
          const errorMessage = getChatFriendlyErrorMessage(err, 'loading');
          setError(errorMessage);
          if (!since) setMessages([]);
          
          // Handle 403 Forbidden - user not authorized for this thread
          if (is403Error) {
            console.error("Access denied to thread:", threadId, err.response?.data);
            
            // Only clear selection if this is a permanent access denial
            if (errorType === 'THREAD_ACCESS_DENIED' && attempt === maxRetries) {
              console.log(`❌ Permanent access denial after ${maxRetries} attempts, clearing thread selection`);
              if (currentThreadIdRef.current === threadId) {
                stopPolling();
                currentThreadIdRef.current = null;
              }
            }
          }
          
          // Don't trigger logout for thread access errors
          if (isAuthError(err)) {
            await logoutRef.current();
          }
          
          // Break out of retry loop for non-retryable errors
          break;
        }
      }
    } finally {
      // CRITICAL FIX: Always reset loading state in finally block to prevent stuck input
      if (!since) {
        setIsLoading(false);
      }
    }
  }, []); // PERFORMANCE FIX: Empty dependency array, use ref for logout
  
  // Store stable reference
  fetchMessagesRef.current = fetchMessages;

  // Post a new message
  const postMessage = async (threadId, content) => {
    console.log('🔧 DEBUG: postMessage called', { threadId, content });
    setIsLoading(true);
    setIsSendingMessage(true);
    setError(null);
    setIsRateLimited(false);
    
    // Create a pending message for immediate UI feedback
    const tempMessage = {
      _id: `temp-${Date.now()}`,
      content,
      sender: currentUser?.uid || 'user',
      senderEmail: currentUser?.email || 'user@example.com',
      timestamp: new Date().toISOString(),
      status: 'sending',
      isTemporary: true
    };
    setPendingMessage(tempMessage);
    
    try {
      console.log('🔧 DEBUG: Sending message to API...');
      const response = await axios.post(`/messages/${threadId}`, {
        content,
      });
      console.log('🔧 DEBUG: API response:', response.data);
      
      // Handle different response formats
      let userMessage, aiMessage;
      
      if (response.data.success && (response.data.userMessage || response.data.message)) {
        // Development mode format: {success: true, userMessage: {...}, aiMessage: {...}}
        userMessage = response.data.userMessage || response.data.message;
        aiMessage = response.data.aiMessage;
        console.log('🔧 DEBUG: Using development mode response format');
      } else if (response.data.userMessage || response.data.aiMessage) {
        // Production mode format: {userMessage: {...}, aiMessage: {...}}
        userMessage = response.data.userMessage;
        aiMessage = response.data.aiMessage;
        console.log('🔧 DEBUG: Using production mode response format');
      } else {
        console.log('🔧 DEBUG: Unknown response format:', response.data);
      }

      // Clear pending message and sending state
      setPendingMessage(null);
      setIsSendingMessage(false);

      // Add the user message immediately (with deduplication safety)
      if (userMessage) {
        console.log('🔧 DEBUG: Adding user message to state:', userMessage);
        setMessages((prev) => {
          const exists = prev.some(msg => msg._id === userMessage._id);
          console.log('🔧 DEBUG: Message exists check:', exists, 'Previous messages count:', prev.length);
          const newMessages = exists ? prev : [...prev, userMessage];
          console.log('🔧 DEBUG: New messages count:', newMessages.length);
          return newMessages;
        });
      } else {
        console.log('🔧 DEBUG: No userMessage in response');
      }

      // Show AI thinking indicator if we expect an AI response
      if (userMessage && !aiMessage) {
        setIsAIThinking(true);
      }

      // Add AI response if available (with deduplication safety)
      if (aiMessage) {
        console.log('🔧 DEBUG: Adding AI message to state:', aiMessage);
        setIsAIThinking(false); // Clear AI thinking state
        setMessages((prev) => {
          const exists = prev.some(msg => msg._id === aiMessage._id);
          console.log('🔧 DEBUG: AI message exists check:', exists);
          const newMessages = exists ? prev : [...prev, aiMessage];
          console.log('🔧 DEBUG: Messages after AI add:', newMessages.length);
          return newMessages;
        });
      } else {
        console.log('🔧 DEBUG: No AI message in response');
      }

      return { userMessage, aiMessage };
    } catch (err) {
      const errorMessage = getChatFriendlyErrorMessage(err, 'sending');
      setError(errorMessage);
      
      // Update pending message status to failed
      if (pendingMessage) {
        setPendingMessage(prev => prev ? { ...prev, status: 'failed' } : null);
      }
      
      // Handle rate limiting
      if (err.response?.status === 429) {
        setIsRateLimited(true);
        // Clear rate limit state after 30 seconds
        setTimeout(() => setIsRateLimited(false), 30000);
      }
      
      if (isAuthError(err)) {
        await logoutRef.current();
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsSendingMessage(false);
      setIsAIThinking(false);
    }
  };

  // Summarize thread
  const summarizeThread = async (threadId) => {
    setIsSummarizing(true);
    setIsLargeSummary(messages.length > 20);
    setError(null);
    try {
      const response = await axios.post(`/messages/${threadId}/summarize`);

      // Refresh messages to get the summary
      await fetchMessages(threadId);

      return response.data;
    } catch (err) {
      console.error("Failed to summarize thread:", err);
      const errorMessage = getChatFriendlyErrorMessage(err, 'summary');
      setError(errorMessage);
      throw err;
    } finally {
      setIsSummarizing(false);
      setIsLargeSummary(false);
    }
  };

  // Start polling for new messages
  const startPolling = (threadId) => {
    // Only start polling if user is authenticated
    if (!currentUser) {
      console.log('Not starting polling - user not authenticated');
      return;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    currentThreadIdRef.current = threadId;
    setIsPolling(true);
    
    pollingIntervalRef.current = setInterval(async () => {
      // Stop polling if user is no longer authenticated
      if (!currentUser || !currentThreadIdRef.current || !lastMessageTimeRef.current) {
        console.log('Stopping polling - user not authenticated or no thread selected');
        stopPolling();
        return;
      }
      
      try {
        await fetchMessages(currentThreadIdRef.current, lastMessageTimeRef.current);
      } catch (err) {
        console.error('Polling error:', err);
        
        // CRITICAL FIX: Handle network exhaustion immediately
        if (err.code === 'ERR_NETWORK' || err.code === 'ERR_INSUFFICIENT_RESOURCES') {
          console.error('🚨 Network exhaustion in polling - stopping all polling to prevent further resource exhaustion');
          stopPolling();
          setError('🌐 Connection lost! We\'re working to reconnect your chat automatically.');
          return;
        }
        
        // If we get rate limited, increase polling interval temporarily
        if (err.response?.status === 429) {
          console.log('Rate limited - slowing down polling temporarily');
          clearInterval(pollingIntervalRef.current);
          setTimeout(() => {
            if (currentThreadIdRef.current && currentUser) {
              startPolling(currentThreadIdRef.current); // Restart with same interval
            }
          }, 10000); // Wait 10 seconds before resuming
        }
        // If we get auth errors, stop polling completely
        else if (err.response?.status === 401 || err.response?.status === 403) {
          console.log('Auth error in polling - stopping');
          stopPolling();
        }
        // For other errors, stop polling temporarily to prevent cascading failures
        else {
          console.log('Unexpected polling error - temporarily stopping polling');
          stopPolling();
          setTimeout(() => {
            if (currentThreadIdRef.current && currentUser) {
              console.log('Attempting to restart polling after error recovery...');
              startPolling(currentThreadIdRef.current);
            }
          }, 15000); // Wait 15 seconds before attempting restart
        }
      }
    }, 5000); // Poll every 5 seconds (reduced frequency)
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    currentThreadIdRef.current = null;
  };

  // Switch to a different thread
  const switchThread = useCallback(async (threadId) => {
    console.log('🔧 DEBUG: switchThread called', { threadId, currentThread: currentThreadIdRef.current });
    // CRITICAL FIX: Add debouncing to prevent rapid thread switches
    if (currentThreadIdRef.current === threadId) {
      console.log(`Already on thread ${threadId}, skipping switch`);
      return;
    }
    
    try {
      console.log(`🔄 Switching from thread ${currentThreadIdRef.current} to ${threadId}`);
      stopPolling();
      console.log('🔧 DEBUG: Clearing messages...');
      clearMessages();
      
      // Add small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // CRITICAL FIX: Join Socket.IO room for real-time updates
      console.log('🔧 DEBUG: Joining Socket.IO room...');
      joinThreadRef.current(threadId);
      
      console.log('🔧 DEBUG: Fetching messages...');
      await fetchMessagesRef.current(threadId);
      console.log('🔧 DEBUG: Starting polling...');
      startPolling(threadId);
    } catch (error) {
      console.error(`❌ Thread switch failed for ${threadId}:`, error);
      // Ensure polling is stopped if thread switch fails
      stopPolling();
      clearMessages();
      throw error; // Re-throw so calling code can handle it
    }
  }, []); // PERFORMANCE FIX: Empty dependency array, use stable refs

  // Clear messages when switching threads
  const clearMessages = () => {
    setMessages([]);
    setThreadInfo(null);
    setError(null);
    lastMessageTimeRef.current = null;
  };

  // Stop polling when user logs out
  useEffect(() => {
    if (!currentUser) {
      console.log('User logged out - stopping polling and clearing messages');
      stopPolling();
      clearMessages();
      currentThreadIdRef.current = null;
    }
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Add reaction to a message
  const addReaction = useCallback(async (messageId, emoji) => {
    try {
      const response = await axios.post(`/messages/${messageId}/react`, { emoji });
      console.log(`👍 Reaction added: ${emoji} to message ${messageId}`);
      return response.data;
    } catch (err) {
      const errorMessage = getChatFriendlyErrorMessage(err, 'reaction');
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Upload files with message
  const uploadFiles = useCallback(async (threadId, files, content = "") => {
    try {
      const formData = new FormData();
      
      // Add files to form data
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      
      // Add content if provided
      if (content.trim()) {
        formData.append('content', content.trim());
      }

      const response = await axios.post(`/messages/${threadId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log(`📎 Files uploaded to thread ${threadId}`);
      return response.data;
    } catch (err) {
      const errorMessage = getChatFriendlyErrorMessage(err, 'upload');
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Search messages in thread
  const searchMessages = useCallback(async (threadId, searchQuery, filters = {}, page = 1, limit = 20) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (searchQuery && searchQuery.trim()) {
        params.append('query', searchQuery.trim());
      }

      if (filters.messageType) {
        params.append('messageType', filters.messageType);
      }

      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }

      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      if (filters.authorId) {
        params.append('authorId', filters.authorId);
      }

      const response = await axios.get(`/messages/${threadId}/search?${params}`);
      console.log(`🔍 Search completed for thread ${threadId}:`, response.data);
      return response.data;
    } catch (err) {
      const errorMessage = getChatFriendlyErrorMessage(err, 'search');
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Retry failed message
  const retryMessage = useCallback(async (threadId, content) => {
    setPendingMessage(null); // Clear any failed pending message
    return await postMessage(threadId, content);
  }, []);

  const value = {
    messages,
    setMessages,
    fetchMessages,
    postMessage,
    retryMessage,
    summarizeThread,
    addReaction,
    uploadFiles,
    searchMessages,
    clearMessages,
    startPolling,
    stopPolling,
    switchThread,
    threadInfo,
    isLoading,
    isSummarizing,
    isLargeSummary,
    isPolling,
    isRateLimited,
    isSendingMessage,
    isAIThinking,
    pendingMessage,
    error,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
};

export const useMessages = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessageProvider");
  }
  return context;
};
