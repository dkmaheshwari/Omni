// frontend/src/contexts/ThreadContext.jsx

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "../axios";
import { handleApiError, isAuthError } from "../utils/errorHandler";
import { useAuth } from "./AuthContext";

const ThreadContext = createContext();

export const ThreadProvider = ({ children }) => {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { logout, currentUser } = useAuth();

  // CRITICAL FIX: Universal deduplication utility function
  const deduplicateThreads = (threadsArray) => {
    if (!Array.isArray(threadsArray)) return [];
    
    const uniqueThreads = threadsArray.filter((thread, index, self) => 
      index === self.findIndex(t => t._id === thread._id)
    );
    
    if (threadsArray.length !== uniqueThreads.length) {
      console.warn(`🔧 Thread deduplication: ${threadsArray.length} → ${uniqueThreads.length} (removed ${threadsArray.length - uniqueThreads.length} duplicates)`);
    }
    
    return uniqueThreads;
  };

  // Thread persistence utilities
  const saveSelectedThreadToStorage = (thread) => {
    if (thread) {
      localStorage.setItem('peergenius-selected-thread', JSON.stringify({
        _id: thread._id,
        title: thread.title,
        savedAt: Date.now()
      }));
    } else {
      localStorage.removeItem('peergenius-selected-thread');
    }
  };

  const getSelectedThreadFromStorage = () => {
    try {
      const saved = localStorage.getItem('peergenius-selected-thread');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if saved within last 24 hours
        if (Date.now() - parsed.savedAt < 24 * 60 * 60 * 1000) {
          return parsed._id;
        } else {
          localStorage.removeItem('peergenius-selected-thread');
        }
      }
    } catch (error) {
      console.warn('Failed to restore selected thread from storage:', error);
      localStorage.removeItem('peergenius-selected-thread');
    }
    return null;
  };

  // Enhanced setSelectedThread that also saves to storage
  const selectThread = (thread) => {
    console.log(`🎯 Selecting thread:`, thread ? `${thread._id} - "${thread.title}"` : 'null');
    setSelectedThread(thread);
    saveSelectedThreadToStorage(thread);
  };

  // Fetch all threads
  const fetchThreads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get("/threads");
      
      // Handle both old and new API response formats
      let threads;
      if (response.data.success !== undefined) {
        // New format with success wrapper
        threads = response.data.threads || [];
      } else if (Array.isArray(response.data)) {
        // Old format - direct array
        threads = response.data;
      } else {
        console.error("Unexpected response format:", response.data);
        threads = [];
      }
      
      // Debug: Check for duplicates in API response
      const threadIds = threads.map(t => t._id);
      const uniqueIds = [...new Set(threadIds)];
      
      if (threadIds.length !== uniqueIds.length) {
        console.warn('⚠️ API returned duplicate threads:', {
          total: threadIds.length,
          unique: uniqueIds.length,
          duplicates: threadIds.filter((id, index) => threadIds.indexOf(id) !== index)
        });
      }
      
      // CRITICAL FIX: Always deduplicate threads by ID to prevent React duplicate key errors
      const uniqueThreads = threads.filter((thread, index, self) => 
        index === self.findIndex(t => t._id === thread._id)
      );
      
      if (threads.length !== uniqueThreads.length) {
        console.warn(`🔧 Frontend deduplication: ${threads.length} → ${uniqueThreads.length} threads`);
      }
      
      setThreads(deduplicateThreads(uniqueThreads));
    } catch (err) {
      const errorMessage = handleApiError(err, 'fetching threads');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  // CRITICAL FIX: Restore selected thread from storage after threads are loaded
  useEffect(() => {
    if (threads.length > 0 && !selectedThread) {
      const savedThreadId = getSelectedThreadFromStorage();
      if (savedThreadId) {
        const savedThread = threads.find(t => t._id === savedThreadId);
        if (savedThread) {
          console.log(`🔄 Restoring selected thread from storage: ${savedThread.title}`);
          setSelectedThread(savedThread);
        } else {
          console.log(`⚠️ Saved thread ${savedThreadId} not found in current threads, clearing storage`);
          localStorage.removeItem('peergenius-selected-thread');
        }
      }
    }
  }, [threads, selectedThread]);

  // Create a new thread
  const createThread = async (title, description = "", isPublic = false, category = null, tags = []) => {
    setError(null);
    try {
      const response = await axios.post("/threads", { 
        title, 
        description,
        isPublic,
        category,
        tags
      });
      const newThread = response.data;
      
      // Wait a bit for Socket.IO to add the thread, then just select it
      // This prevents race condition between API response and Socket.IO event
      setTimeout(() => {
        setThreads((prev) => {
          const existingThread = prev.find((t) => t._id === newThread._id);
          if (existingThread) {
            // Thread already added by Socket.IO, just ensure it's up to date
            const updatedThreads = prev.map(t => 
              t._id === newThread._id ? { ...t, ...newThread } : t
            );
            return deduplicateThreads(updatedThreads);
          } else {
            // Socket.IO didn't add it yet, add it now
            console.log(`📝 Adding thread ${newThread._id} via API response (Socket.IO missed it)`);
            return deduplicateThreads([...prev, newThread]);
          }
        });
        setSelectedThread(newThread);
        saveSelectedThreadToStorage(newThread);
      }, 100); // Small delay to let Socket.IO event process first
      return newThread;
    } catch (err) {
      console.error('Thread creation error:', err);
      
      let errorMessage = 'Failed to create thread. Please try again.';
      
      // Extract detailed error message
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.response?.data?.details) {
        errorMessage = Array.isArray(err.response.data.details) 
          ? err.response.data.details.join(', ')
          : err.response.data.details;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  };

  // Delete a thread
  const deleteThread = async (threadId) => {
    try {
      await axios.delete(`/threads/${threadId}`);
      setThreads((prev) => prev.filter((thread) => thread._id !== threadId));
      if (selectedThread?._id === threadId) {
        setSelectedThread(null);
      }
    } catch (err) {
      console.error("Failed to delete thread:", err);
      throw err;
    }
  };

  // Join a thread
  const joinThread = async (threadId) => {
    setError(null);
    try {
      const response = await axios.post(`/threads/${threadId}/join`);
      const updatedThread = response.data.thread;
      
      // Update the thread in the list if it exists, otherwise add it
      setThreads((prev) => {
        const existingIndex = prev.findIndex((t) => t._id === threadId);
        if (existingIndex >= 0) {
          // Update existing thread
          const newThreads = [...prev];
          newThreads[existingIndex] = updatedThread;
          return deduplicateThreads(newThreads);
        } else {
          // Add new thread
          return deduplicateThreads([...prev, updatedThread]);
        }
      });
      
      setSelectedThread(updatedThread);
      saveSelectedThreadToStorage(updatedThread);
      return updatedThread;
    } catch (err) {
      const errorMessage = handleApiError(err, 'joining thread');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  };

  // Leave a thread
  const leaveThread = async (threadId) => {
    setError(null);
    try {
      await axios.post(`/threads/${threadId}/leave`);
      
      // Remove thread from list
      setThreads((prev) => prev.filter((thread) => thread._id !== threadId));
      
      // Clear selection if this was the selected thread
      if (selectedThread?._id === threadId) {
        setSelectedThread(null);
        saveSelectedThreadToStorage(null);
      }
      
      return true;
    } catch (err) {
      const errorMessage = handleApiError(err, 'leaving thread');
      setError(errorMessage);
      
      if (isAuthError(err)) {
        await logout();
      }
      
      throw new Error(errorMessage);
    }
  };

  // Real-time thread events listener
  useEffect(() => {
    const handleNewPublicThread = (event) => {
      const { thread } = event.detail;
      console.log(`📨 Received new public thread:`, thread.title);
      
      // Only add if it's not already in the list and user is not a participant
      setThreads(prev => {
        const exists = prev.some(t => t._id === thread._id);
        const userIsParticipant = thread.participants?.some(p => p.userId === currentUser?.uid);
        
        if (!exists && !userIsParticipant) {
          return deduplicateThreads([...prev, thread]);
        }
        return prev;
      });
    };

    const handleNewPersonalThread = (event) => {
      const { thread, forUser } = event.detail;
      console.log(`📨 Received new personal thread:`, thread.title);
      
      // Add to threads list if not already there (for user's other sessions or other users)
      setThreads(prev => {
        const exists = prev.some(t => t._id === thread._id);
        if (!exists) {
          return deduplicateThreads([...prev, thread]);
        }
        return prev;
      });
    };

    const handleParticipantJoined = (event) => {
      const updateData = event.detail;
      console.log(`📨 Participant joined thread:`, updateData.title);
      
      // Update the thread in the list
      setThreads(prev => {
        const updatedThreads = prev.map(thread => {
          if (thread._id === updateData._id) {
            return {
              ...thread,
              participants: updateData.participants,
              memberCount: updateData.memberCount
            };
          }
          return thread;
        });
        return deduplicateThreads(updatedThreads);
      });
    };

    // Add event listeners
    window.addEventListener('socket-thread-new-public', handleNewPublicThread);
    window.addEventListener('socket-thread-new-personal', handleNewPersonalThread);
    window.addEventListener('socket-thread-participant-joined', handleParticipantJoined);

    // Cleanup
    return () => {
      window.removeEventListener('socket-thread-new-public', handleNewPublicThread);
      window.removeEventListener('socket-thread-new-personal', handleNewPersonalThread);
      window.removeEventListener('socket-thread-participant-joined', handleParticipantJoined);
    };
  }, [currentUser]);

  // Clear threads and selection when user logs out
  useEffect(() => {
    if (!currentUser) {
      console.log('User logged out - clearing threads and selection');
      setThreads([]);
      setSelectedThread(null);
      setError(null);
    }
  }, [currentUser]);

  const value = {
    threads,
    setThreads,
    selectedThread,
    setSelectedThread: selectThread, // Use enhanced version that saves to storage
    fetchThreads,
    createThread,
    deleteThread,
    joinThread,
    leaveThread,
    isLoading,
    error,
  };

  return (
    <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>
  );
};

export const useThread = () => {
  const context = useContext(ThreadContext);
  if (!context) {
    throw new Error("useThread must be used within a ThreadProvider");
  }
  return context;
};
