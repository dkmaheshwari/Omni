// frontend/src/contexts/SocketContext.jsx

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Map()); // threadId -> Map of userId -> userName
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // threadId -> Array of user objects
  const { currentUser } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  // PERFORMANCE FIX: Use refs to avoid stale closures
  const currentUserRef = useRef(currentUser);
  const socketRef = useRef(socket);
  const isConnectedRef = useRef(isConnected);
  
  // Keep refs up to date
  currentUserRef.current = currentUser;
  socketRef.current = socket;
  isConnectedRef.current = isConnected;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔌 SocketContext useEffect triggered', { 
        currentUser: !!currentUser, 
        userId: currentUser?.uid,
        email: currentUser?.email 
      });
    }
    
    if (currentUser && currentUser.uid) {
      if (import.meta.env.DEV) {
        console.log('🔌 Connecting to Socket.IO with user:', currentUser.uid);
      }
      
      // Try connection with dynamic port detection
      const backendUrl = import.meta.env.VITE_API_URL ? 
        import.meta.env.VITE_API_URL.replace('/api', '') : 
        'http://localhost:5050';
        
      if (import.meta.env.DEV) {
        console.log('🔌 Attempting to connect to:', backendUrl);
      }
      
      const newSocket = io(backendUrl, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['polling', 'websocket'],
        forceNew: true,
      });
      
      console.log('🔌 Socket.IO instance created:', !!newSocket);

      // Connection events
      newSocket.on('connect', () => {
        console.log('✅ Socket.IO connected:', newSocket.id);
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Join user to socket with their info
        console.log('🔄 Attempting user:join with:', {
          userId: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email
        });
        
        newSocket.emit('user:join', {
          userId: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName || currentUser.email
        });
        
        // Listen for successful user join
        newSocket.once('user:joined', (data) => {
          console.log('✅ User authentication successful:', data);
        });
        
        // Listen for user join errors
        newSocket.once('error', (error) => {
          console.error('❌ User authentication failed:', error);
          // Don't block the connection, just log the error
        });
      });

      newSocket.on('disconnect', (reason) => {
        if (import.meta.env.DEV) {
          console.log('❌ Socket.IO disconnected:', reason);
        }
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        if (import.meta.env.DEV) {
          console.error('🚫 Socket.IO connection error:', error.message);
        }
        
        reconnectAttempts.current++;
        
        // Show user-friendly error messages
        if (reconnectAttempts.current === 1) {
          // First attempt - show connection error
          window.dispatchEvent(new CustomEvent('socket-connection-error', {
            detail: { 
              message: 'Connection failed. Retrying...', 
              attempt: reconnectAttempts.current 
            }
          }));
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          console.error('🚫 Max reconnection attempts reached');
          // Show persistent error after max attempts
          window.dispatchEvent(new CustomEvent('socket-connection-failed', {
            detail: { 
              message: 'Unable to connect to server. Please check your internet connection and refresh the page.',
              attempts: reconnectAttempts.current
            }
          }));
        }
      });

      // RACE CONDITION FIX: Proper typing indicators with userId tracking
      newSocket.on('user:typing', (data) => {
        const { threadId, userName, userId } = data;
        console.log(`⌨️ ${userName} (${userId}) is typing in thread ${threadId}`);
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (!newMap.has(threadId)) {
            newMap.set(threadId, new Map());
          }
          // Store userId -> userName mapping
          newMap.get(threadId).set(userId, userName);
          return newMap;
        });
      });

      // MEMORY LEAK FIX: Enhanced real-time message handling with time-based deduplication
      const processedMessages = new Map(); // Track processed message IDs with timestamps
      
      const handleNewMessage = (data, source = 'new-message') => {
        const { message, threadId } = data;
        
        // DEBUG: Enhanced logging for Socket.IO message handling
        console.log(`📡 SocketContext: Received '${source}' event:`, {
          messageId: message._id,
          messageType: message.messageType,
          threadId: threadId,
          textPreview: message.text?.substring(0, 50) + '...',
          fullData: data
        });
        
        // Deduplication check
        const messageKey = `${message._id}-${threadId}`;
        const now = Date.now();
        
        if (processedMessages.has(messageKey)) {
          console.log(`🔄 Duplicate message filtered: ${message._id} from ${source}`);
          return;
        }
        
        processedMessages.set(messageKey, now);
        console.log(`📨 New message received in thread ${threadId} from ${source}:`, message);
        
        // Dispatch custom event that MessageContext can listen to
        console.log(`🚀 Dispatching 'socket-new-message' custom event for thread ${threadId}`);
        window.dispatchEvent(new CustomEvent('socket-new-message', {
          detail: { message, threadId, source }
        }));
        console.log(`✅ Custom event dispatched successfully`);
        
        
        // Clean up old processed messages (older than 10 minutes)
        if (processedMessages.size > 50) {
          const tenMinutesAgo = now - (10 * 60 * 1000);
          for (const [key, timestamp] of processedMessages.entries()) {
            if (timestamp < tenMinutesAgo) {
              processedMessages.delete(key);
            }
          }
        }
      };
      
      // Listen to real-time message events (backend emits 'new-message')
      newSocket.on('new-message', (data) => handleNewMessage(data, 'new-message'));

      // Online users tracking
      newSocket.on('thread:online-users', (data) => {
        const { threadId, onlineUsers: users } = data;
        console.log(`👥 Online users updated for thread ${threadId}:`, users);
        
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(threadId, users);
          return newMap;
        });
      });

      // Message reactions
      newSocket.on('message-reaction', (data) => {
        const { messageId, reactions, threadId } = data;
        console.log(`👍 Reaction updated for message ${messageId} in thread ${threadId}`);
        
        // Dispatch custom event that components can listen to
        window.dispatchEvent(new CustomEvent('socket-message-reaction', {
          detail: { messageId, reactions, threadId }
        }));
      });

      // Thread creation events
      newSocket.on('thread:new-public', (threadData) => {
        console.log(`🆕 New public thread created:`, threadData.title);
        
        window.dispatchEvent(new CustomEvent('socket-thread-new-public', {
          detail: { thread: threadData }
        }));
      });

      newSocket.on('thread:new-personal', (threadData) => {
        const { forUser, ...thread } = threadData;
        
        // STALE CLOSURE FIX: Use ref for fresh currentUser value
        if (forUser === currentUserRef.current?.uid) {
          console.log(`🆕 New personal thread created:`, thread.title);
          
          window.dispatchEvent(new CustomEvent('socket-thread-new-personal', {
            detail: { thread }
          }));
        }
      });

      newSocket.on('thread:participant-joined', (data) => {
        const { forUser, ...updateData } = data;
        
        // STALE CLOSURE FIX: Use ref for fresh currentUser value
        if (forUser === currentUserRef.current?.uid) {
          console.log(`👥 New participant joined thread:`, updateData.title);
          
          window.dispatchEvent(new CustomEvent('socket-thread-participant-joined', {
            detail: updateData
          }));
        }
      });


      // RACE CONDITION FIX: Proper typing indicator cleanup with userId mapping
      newSocket.on('user:stop-typing', (data) => {
        const { threadId, userId, timestamp } = data;
        console.log(`⌨️ User ${userId} stopped typing in thread ${threadId}`);
        
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (newMap.has(threadId)) {
            const typingMap = new Map(newMap.get(threadId));
            
            // Remove the specific user by userId
            typingMap.delete(userId);
            
            if (typingMap.size === 0) {
              newMap.delete(threadId);
            } else {
              newMap.set(threadId, typingMap);
            }
          }
          return newMap;
        });
      });
      
      // CRITICAL FIX: Add user status change handling
      newSocket.on('user:status-changed', (data) => {
        const { userId, status, threadId, timestamp } = data;
        console.log(`📊 User ${userId} status changed to ${status} in thread ${threadId}`);
        
        // Update online users status
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          if (newMap.has(threadId)) {
            const users = newMap.get(threadId).map(user => {
              if (user.userId === userId) {
                return { ...user, status, lastSeen: new Date(timestamp) };
              }
              return user;
            });
            newMap.set(threadId, users);
          }
          return newMap;
        });
      });
      
      // CRITICAL FIX: Add user activity tracking
      newSocket.on('user:activity', (data) => {
        const { userId, userName, activity, threadId, timestamp } = data;
        console.log(`🎨 User ${userName} activity: ${activity} in thread ${threadId}`);
        
        // Dispatch custom event for components that need activity tracking
        window.dispatchEvent(new CustomEvent('socket-user-activity', {
          detail: { userId, userName, activity, threadId, timestamp }
        }));
      });

      setSocket(newSocket);

      // Add global access for debugging in development
      if (import.meta.env.DEV) {
        window.socketDebug = {
          socket: newSocket,
          getStatus: () => ({
            socket: !!socketRef.current,
            connected: socketRef.current?.connected || false,
            isConnected: isConnectedRef.current,
            socketId: socketRef.current?.id || null,
            transport: socketRef.current?.io?.engine?.transport?.name || null,
            currentUser: !!currentUserRef.current,
            userId: currentUserRef.current?.uid
          }),
          forceReconnect: () => {
            if (socketRef.current) {
              console.log('🔄 Forcing socket reconnection...');
              socketRef.current.disconnect();
              socketRef.current.connect();
            }
          },
          checkAuth: () => ({
            currentUser: !!currentUserRef.current,
            uid: currentUserRef.current?.uid,
            email: currentUserRef.current?.email,
            hasSocket: !!socketRef.current,
            isConnected: isConnectedRef.current
          })
        };
        console.log('🔧 Socket debugging available at window.socketDebug');
        console.log('🔧 Use window.socketDebug.checkAuth() to check authentication');
      }

      return () => {
        console.log('🔌 Disconnecting Socket.IO...');
        newSocket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTypingUsers(new Map()); // Reset to proper Map<threadId, Map<userId, userName>> structure
        setOnlineUsers(new Map());
        
        // Clean up debug tools
        if (import.meta.env.DEV && window.socketDebug) {
          delete window.socketDebug;
        }
      };
    } else {
      console.log('🔌 No currentUser, cleaning up socket...');
      // User logged out, cleanup socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
        setTypingUsers(new Map()); // Reset to proper Map<threadId, Map<userId, userName>> structure
        setOnlineUsers(new Map());
      }
    }
  }, [currentUser]);

  // Add immediate initialization check for development debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 SocketContext state check:', {
        socket: !!socketRef.current,
        isConnected: isConnectedRef.current,
        currentUser: !!currentUserRef.current,
        userId: currentUserRef.current?.uid
      });
      
      // Make socket status globally available immediately
      window.socketContextDebug = {
        socket: !!socketRef.current,
        isConnected: isConnectedRef.current,
        currentUser: !!currentUserRef.current,
        userId: currentUserRef.current?.uid,
        forceInit: () => {
          console.log('🔄 Force initializing socket...');
          if (currentUserRef.current && currentUserRef.current.uid && !socketRef.current) {
            console.log('🔄 Conditions met, should initialize socket');
          } else {
            console.log('🔍 Conditions not met:', {
              hasUser: !!currentUserRef.current,
              hasUid: !!currentUserRef.current?.uid,
              hasSocket: !!socketRef.current
            });
          }
        }
      };
    }
  });

  // CRITICAL FIX: Enhanced thread joining with debugging and connection waiting
  const joinThread = useCallback((threadId) => {
    if (!socketRef.current) {
      console.warn(`⚠️ Cannot join thread ${threadId}: socket not initialized`);
      return;
    }

    if (!isConnectedRef.current) {
      console.warn(`⚠️ Socket not connected, waiting for connection to join thread ${threadId}...`);
      // Wait for connection and then join with timeout
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds total
      
      const waitForConnection = () => {
        attempts++;
        if (socketRef.current && socketRef.current.connected) {
          console.log(`🔌 Socket connected after ${attempts} attempts, now joining thread ${threadId}`);
          performJoinThread(threadId);
        } else if (attempts >= maxAttempts) {
          console.error(`❌ Timeout waiting for socket connection after ${maxAttempts} attempts`);
          console.error(`🔍 Socket state:`, {
            socket: !!socketRef.current,
            connected: socketRef.current?.connected,
            isConnected: isConnectedRef.current
          });
        } else {
          console.log(`⏳ Still waiting for socket connection... (${attempts}/${maxAttempts})`);
          setTimeout(waitForConnection, 500);
        }
      };
      waitForConnection();
      return;
    }

    performJoinThread(threadId);
  }, []); // PERFORMANCE FIX: Empty dependency array with refs

  const performJoinThread = useCallback((threadId) => {
    if (!threadId) {
      console.error(`❌ Cannot join thread: threadId is empty`);
      return;
    }
    
    console.log(`📱 Attempting to join thread room: ${threadId}`);
    console.log(`🔍 Socket state - Connected: ${socketRef.current.connected}, ID: ${socketRef.current.id}`);
    
    socketRef.current.emit('thread:join', threadId);
    
    // Listen for join confirmation
    socketRef.current.once('thread:joined', (data) => {
      console.log(`✅ Successfully joined thread ${data.threadId} - Room size: ${data.roomSize || 'unknown'}`);
    });
    
    socketRef.current.once('error', (error) => {
      console.error(`❌ Failed to join thread ${threadId}:`, error);
    });
  }, []); // PERFORMANCE FIX: Empty dependency array with refs

  // Debug method to check socket status
  const getSocketStatus = useCallback(() => {
    return {
      socket: !!socketRef.current,
      connected: socketRef.current?.connected || false,
      isConnected: isConnectedRef.current,
      socketId: socketRef.current?.id || null,
      transport: socketRef.current?.io?.engine?.transport?.name || null
    };
  }, []); // PERFORMANCE FIX: Empty dependency array with refs

  const leaveThread = useCallback((threadId) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('thread:leave', threadId);
      console.log(`📱 Left thread room: ${threadId}`);
    }
  }, []); // PERFORMANCE FIX: Empty dependency array with refs

  // Enhanced typing functions with improved debouncing and error handling
  // STALE CLOSURE FIX: Remove dependencies and use refs
  const startTyping = useCallback((threadId, userName) => {
    if (!socketRef.current || !isConnectedRef.current || !threadId) {
      console.warn('Cannot start typing: socket not connected or missing threadId');
      return;
    }
    
    try {
      socketRef.current.emit('typing:start', { 
        threadId, 
        userName: userName || currentUserRef.current?.displayName || currentUserRef.current?.email || 'Unknown User'
      });
    } catch (error) {
      console.error('Error starting typing indicator:', error);
    }
  }, []); // PERFORMANCE FIX: Empty dependency array with refs

  const stopTyping = useCallback((threadId) => {
    if (!socketRef.current || !isConnectedRef.current || !threadId) {
      console.warn('Cannot stop typing: socket not connected or missing threadId');
      return;
    }
    
    try {
      socketRef.current.emit('typing:stop', { threadId });
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }, []); // PERFORMANCE FIX: Empty dependency array with refs
  
  // CRITICAL FIX: Add user status update function
  const updateUserStatus = useCallback((status) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('status:update', { status });
    }
  }, []); // PERFORMANCE FIX: Empty dependency array with refs
  
  // CRITICAL FIX: Add thread activity tracking
  const updateThreadActivity = useCallback((threadId, activity) => {
    if (socketRef.current && isConnectedRef.current) {
      socketRef.current.emit('thread:activity', { threadId, activity });
    }
  }, []); // PERFORMANCE FIX: Empty dependency array with refs
  
  // CRITICAL FIX: Add connection health check
  const pingConnection = useCallback(() => {
    if (socketRef.current && isConnectedRef.current) {
      const startTime = Date.now();
      socketRef.current.emit('ping');
      
      socketRef.current.once('pong', (data) => {
        const latency = Date.now() - startTime;
        console.log(`🏓 Connection latency: ${latency}ms`);
        
        // Dispatch latency info for monitoring
        window.dispatchEvent(new CustomEvent('socket-latency', {
          detail: { latency, timestamp: data.timestamp }
        }));
      });
    }
  }, []); // PERFORMANCE FIX: Empty dependency array with refs


  const value = {
    socket,
    isConnected,
    typingUsers,
    onlineUsers,
    joinThread,
    leaveThread,
    startTyping,
    stopTyping,
    updateUserStatus,
    updateThreadActivity,
    pingConnection,
    getSocketStatus, // Debug helper
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};