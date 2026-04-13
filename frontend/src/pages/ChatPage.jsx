// frontend/src/pages/ChatPage.jsx

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useThread } from "../contexts/ThreadContext";
import { useMessages } from "../contexts/MessageContext";
import { useSocket } from "../contexts/SocketContext";
import CreateThread from "../components/CreateThread";
import JoinThread from "../components/JoinThread";
import DiscoverThreads from "../components/DiscoverThreads";
import MessageItem from "../components/MessageItem";
import TypingIndicator from "../components/TypingIndicator";
import UserTypingIndicator from "../components/UserTypingIndicator";
import OnlineUsersIndicator from "../components/OnlineUsersIndicator";
import FileUpload from "../components/FileUpload";
import MessageSearch from "../components/MessageSearch";
import DebugPanel from "../components/DebugPanel";
import UserAvatarDropdown from "../components/UserAvatarDropdown";

export default function ChatPage() {
  const { currentUser } = useAuth();
  const { threads, selectedThread, setSelectedThread, fetchThreads, leaveThread } =
    useThread();
  const {
    messages,
    postMessage,
    summarizeThread,
    switchThread,
    threadInfo,
    isLoading,
    isSummarizing,
    isLargeSummary,
    isPolling,
    isRateLimited,
  } = useMessages();
  const { joinThread: joinSocketThread, leaveThread: leaveSocketThread, startTyping, stopTyping, typingUsers, onlineUsers } = useSocket();
  const [newMsg, setNewMsg] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [currentView, setCurrentView] = useState('chat'); // 'chat' or 'search'
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThread && currentUser) {
      console.log(`Switching to thread: ${selectedThread._id} for user: ${currentUser.email}`);
      switchThread(selectedThread._id).catch((error) => {
        console.error('Failed to switch thread:', error);
        // If we can't access the thread, clear the selection
        if (error.response?.status === 403 || error.response?.status === 404) {
          console.log('Access denied to thread, clearing selection');
          setSelectedThread(null);
        }
      });
      
      // Join socket thread room
      joinSocketThread(selectedThread._id);
    }
    
    // Cleanup function to leave previous thread room
    return () => {
      if (selectedThread) {
        leaveSocketThread(selectedThread._id);
        // Stop typing when leaving thread
        if (isTyping) {
          stopTyping(selectedThread._id);
          setIsTyping(false);
        }
      }
    };
  }, [selectedThread?._id, currentUser?.uid]); // CRITICAL FIX: Only depend on the actual IDs to prevent infinite loops

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isSummarizing]);

  const handleSend = async () => {
    if (!selectedThread || !newMsg.trim() || isLoading) return;
    
    // Stop typing when sending message
    if (isTyping) {
      stopTyping(selectedThread._id);
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
    
    try {
      await postMessage(selectedThread._id, newMsg.trim());
      setNewMsg("");
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleTyping = (value) => {
    // CRITICAL FIX: Always update input value first, regardless of thread state
    setNewMsg(value);
    
    // Don't proceed with typing indicators if no thread is selected
    if (!selectedThread) {
      return;
    }
    
    if (!value.trim()) {
      // Stop typing if input is empty
      if (isTyping && selectedThread?._id) {
        stopTyping(selectedThread._id);
        setIsTyping(false);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      return;
    }
    
    // Start typing if not already and we have a valid thread
    if (!isTyping && selectedThread?._id) {
      startTyping(selectedThread._id, currentUser?.email || 'Anonymous');
      setIsTyping(true);
    }
    
    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && selectedThread?._id) {
        stopTyping(selectedThread._id);
        setIsTyping(false);
      }
    }, 2000);
  };

  const handleSummonAI = async () => {
    if (!selectedThread || isLoading) return;
    const aiSummonMessage = newMsg.trim() || "AI, can you help with this conversation?";
    try {
      await postMessage(selectedThread._id, aiSummonMessage);
      setNewMsg("");
    } catch (err) {
      console.error("Failed to summon AI:", err);
    }
  };

  const handleSummarize = async () => {
    if (!selectedThread || isSummarizing) return;
    try {
      await summarizeThread(selectedThread._id);
    } catch (err) {
      console.error("Failed to summarize thread:", err);
      alert(`Summarization failed: ${err.message}`);
    }
  };

  const handleLeaveThread = async () => {
    if (!selectedThread) return;
    
    if (window.confirm(`Are you sure you want to leave "${selectedThread.title}"?`)) {
      try {
        await leaveThread(selectedThread._id);
      } catch (err) {
        console.error("Failed to leave thread:", err);
        alert(`Failed to leave thread: ${err.message}`);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Ultra-Modern Sidebar */}
      <aside className="w-80 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-xl flex flex-col relative">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
          {/* Header */}
          <div className="relative p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold">🧠</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm">
                  <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                  Omni Nexus
                </h1>
                <p className="text-xs text-slate-500">AI-Powered Learning</p>
              </div>
            </div>

            <UserAvatarDropdown />
          </div>

          <CreateThread />
          <JoinThread />
          <DiscoverThreads />
        </div>

        {/* Stats Bar */}
        <div className="relative px-6 py-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-b border-white/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                <span className="mr-1">👥</span>
                <span>{threads.length} Threads</span>
              </div>
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                <span className="mr-1">⚡</span>
                <span>AI Active</span>
              </div>
            </div>
          </div>
        </div>

          {/* Threads List */}
          <div className="relative">
            <div className="p-4 pb-6">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-slate-400">#</span>
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                Discussion Threads
              </h2>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            </div>

            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread._id}
                  onClick={() => setSelectedThread(thread)}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group p-4 rounded-2xl border ${
                    selectedThread?._id === thread._id
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-md"
                      : "hover:bg-slate-50 border-slate-200 bg-white/60"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full mt-1.5 ${
                        selectedThread?._id === thread._id
                          ? "bg-gradient-to-r from-blue-500 to-purple-500"
                          : "bg-slate-300 group-hover:bg-slate-400"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-medium text-sm truncate ${
                          selectedThread?._id === thread._id
                            ? "text-slate-900"
                            : "text-slate-700 group-hover:text-slate-900"
                        }`}
                      >
                        {thread.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Click to open discussion
                      </p>
                    </div>
                    {selectedThread?._id === thread._id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              ))}

              {threads.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-tr from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-slate-400 text-2xl">💬</span>
                  </div>
                  <h3 className="font-medium text-slate-700 mb-2">
                    No threads yet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Create your first discussion above
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </aside>

      {/* Ultra-Modern Main Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {selectedThread ? (
          <>
            {/* Modern Header */}
            <header className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
              <div className="relative px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-pulse" />
                      <h2 className="text-xl font-bold text-slate-900 truncate">
                        {selectedThread.title}
                      </h2>
                      <button
                        onClick={(event) => {
                          navigator.clipboard.writeText(selectedThread._id);
                          // Show temporary success message
                          const btn = event.target;
                          const originalText = btn.textContent;
                          btn.textContent = "✅";
                          setTimeout(() => btn.textContent = originalText, 2000);
                        }}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md transition-colors"
                        title="Copy Thread ID for sharing"
                      >
                        📋 Share
                      </button>
                    </div>
                    <div className="flex items-center space-x-6 text-sm text-slate-500">
                      <span className="flex items-center space-x-2">
                        <span>💬</span>
                        <span>
                          {messages.length} message
                          {messages.length !== 1 ? "s" : ""}
                        </span>
                      </span>
                      {threadInfo && (
                        <span className="flex items-center space-x-2">
                          <span>👥</span>
                          <span>
                            {threadInfo.participants.length} participant
                            {threadInfo.participants.length !== 1 ? "s" : ""}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center space-x-2">
                        <span>🤖</span>
                        <span>AI Assistant Active</span>
                      </span>
                      {isPolling && (
                        <span className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span>Live</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* View Tabs */}
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                      <button
                        onClick={() => setCurrentView('chat')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === 'chat'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        💬 Chat
                      </button>
                      <button
                        onClick={() => setCurrentView('search')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === 'search'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🔍 Search
                      </button>
                    </div>

                    <button
                      onClick={handleLeaveThread}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 hover:border-red-300"
                    >
                      <span>🚪</span>
                      <span>Leave</span>
                    </button>
                    
                    {currentView === 'chat' && (
                      <button
                        onClick={handleSummarize}
                        disabled={isSummarizing || messages.length === 0}
                        className={`inline-flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                          isSummarizing || messages.length === 0
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        }`}
                      >
                        <span>✨</span>
                        <span>
                          {isSummarizing
                            ? isLargeSummary
                              ? "Processing..."
                              : "Summarizing..."
                            : `Summarize${
                                messages.length > 20 ? ` (${messages.length})` : ""
                              }`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto relative">
              {currentView === 'chat' ? (
                /* Chat Messages */
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-purple-50/20" />
                  <div className="relative max-w-5xl mx-auto px-8 py-8 space-y-6">
                    {messages.map((msg) => (
                      <div key={msg._id} className="animate-slide-up">
                        <MessageItem message={msg} />
                      </div>
                    ))}

                    {/* Online Users Indicator */}
                    {selectedThread && (
                      <OnlineUsersIndicator 
                        onlineUsers={onlineUsers}
                        currentThreadId={selectedThread._id}
                        currentUserEmail={currentUser?.email}
                      />
                    )}

                    {/* User Typing Indicators */}
                    {selectedThread && (
                      <UserTypingIndicator 
                        typingUsers={typingUsers}
                        currentThreadId={selectedThread._id}
                        currentUserEmail={currentUser?.email}
                      />
                    )}

                    {/* Enhanced AI Typing Indicators */}
                    {(isLoading || isSummarizing) && (
                      <TypingIndicator
                        message={
                          isLoading
                            ? "AI is responding..."
                            : "AI is summarizing the thread..."
                        }
                        isLongTask={isLargeSummary}
                      />
                    )}

                    {messages.length === 0 && !isLoading && (
                      <div className="text-center py-24">
                        <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 via-purple-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                          <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">
                          Start the conversation
                        </h3>
                        <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                          Ask a question or share your thoughts. Our AI assistant
                          will help guide the discussion with intelligent insights.
                        </p>
                      </div>
                    )}

                    <div ref={bottomRef}></div>
                  </div>
                </>
              ) : (
                /* Message Search */
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 via-blue-50/30 to-purple-50/20" />
                  <div className="relative max-w-5xl mx-auto px-8 py-8">
                    <MessageSearch threadId={selectedThread._id} />
                  </div>
                </>
              )}
            </div>

            {/* Ultra-Modern Message Input - Only for Chat View */}
            {currentView === 'chat' && (
              <div className="bg-white/80 backdrop-blur-xl border-t border-white/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />
              <div className="relative max-w-5xl mx-auto p-8">
                <div className="flex items-end space-x-4">
                  <div className="flex-1">
                    <div className="relative">
                      <textarea
                        value={newMsg}
                        onChange={(e) => handleTyping(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        onFocus={() => {
                          // CRITICAL FIX: Debug logging to help diagnose input issues
                          console.log('📝 Textarea focused - isLoading:', isLoading, 'selectedThread:', !!selectedThread);
                        }}
                        placeholder={selectedThread ? "Type your message or question... (Shift+Enter for new line)" : "Select a thread to start messaging"}
                        disabled={isLoading || !selectedThread}
                        rows={1}
                        className={`w-full px-6 py-4 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none shadow-lg hover:shadow-xl ${
                          (isLoading || !selectedThread) ? "bg-slate-50 text-slate-400" : ""
                        }`}
                        style={{ minHeight: "56px", maxHeight: "160px" }}
                      />

                      {newMsg.length > 800 && (
                        <div className="absolute bottom-3 right-20 text-xs text-slate-400 bg-white/90 px-2 py-1 rounded">
                          {newMsg.length}/1000
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 px-2">
                      <div className="text-xs text-slate-500">
                        {isRateLimited ? (
                          <span className="text-orange-600 font-medium">
                            ⏱️ Please wait before sending another message
                          </span>
                        ) : !selectedThread ? (
                          <span className="text-blue-600 font-medium">
                            💡 Select a thread from the sidebar to start messaging
                          </span>
                        ) : isLoading ? (
                          <span className="text-orange-600 font-medium">
                            ⏳ Loading... Please wait
                          </span>
                        ) : (
                          <>
                            Press{" "}
                            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                              Enter
                            </kbd>{" "}
                            to send •
                            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 ml-1">
                              Shift+Enter
                            </kbd>{" "}
                            for new line
                          </>
                        )}
                      </div>
                      
                      {/* CRITICAL FIX: Debug info to help diagnose issues */}
                      {import.meta.env.DEV && (
                        <div className="text-xs text-slate-400">
                          Debug: Loading={isLoading ? 'true' : 'false'}, Thread={selectedThread ? 'selected' : 'none'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* File Upload Button */}
                    <button
                      onClick={() => setShowFileUpload(true)}
                      disabled={isLoading || isRateLimited}
                      className={`px-4 py-4 rounded-2xl font-medium transition-all duration-300 ${
                        isLoading || isRateLimited
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                      title={isRateLimited ? "Rate limited - please wait before uploading files" : "Upload files"}
                    >
                      <span className="text-lg">📎</span>
                    </button>

                    {/* Summon AI Button */}
                    <button
                      onClick={handleSummonAI}
                      disabled={isLoading || isRateLimited}
                      className={`px-4 py-4 rounded-2xl font-medium transition-all duration-300 ${
                        isLoading || isRateLimited
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                      title={isRateLimited ? "Rate limited - please wait before summoning AI" : "Summon AI to help with this conversation"}
                    >
                      <span className="text-lg">🤖</span>
                    </button>

                    {/* Send Button */}
                    <button
                      onClick={handleSend}
                      disabled={isLoading || !newMsg.trim() || isRateLimited}
                      className={`px-8 py-4 rounded-2xl font-medium transition-all duration-300 ${
                        isLoading || !newMsg.trim() || isRateLimited
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                      }`}
                      title={isRateLimited ? "Rate limited - please wait before sending another message" : "Send message"}
                    >
                      <span className="text-lg">{isRateLimited ? "⏱️" : "📤"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </>
        ) : (
          /* Ultra-Modern Welcome Screen */
          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50/50 to-pink-50/30" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent)]" />

            <div className="relative text-center max-w-2xl mx-auto px-8">
              <div className="mb-12">
                <div className="w-32 h-32 bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl relative">
                  <span className="text-6xl">🧠</span>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-3xl" />
                </div>

                <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-6">
                  Welcome to Omni Nexus
                </h1>

                <p className="text-xl text-slate-600 leading-relaxed mb-12">
                  Experience the future of collaborative learning with
                  AI-powered discussions. Create meaningful conversations, get
                  intelligent insights, and accelerate your learning journey.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-8 mb-12">
                <div className="bg-white/60 backdrop-blur-sm border-white/20 border rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-tr from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    AI-Powered
                  </h3>
                  <p className="text-sm text-slate-600">
                    Intelligent responses and insights
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm border-white/20 border rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">💬</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Real-time
                  </h3>
                  <p className="text-sm text-slate-600">
                    Instant collaborative discussions
                  </p>
                </div>

                <div className="bg-white/60 backdrop-blur-sm border-white/20 border rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-xl">✨</span>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">
                    Smart Summaries
                  </h3>
                  <p className="text-sm text-slate-600">
                    Automatic conversation insights
                  </p>
                </div>
              </div>

              <p className="text-slate-500 mb-8">
                Select a thread from the sidebar or create a new one to start
                collaborating
              </p>

              <div className="flex items-center justify-center space-x-6 text-sm">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mr-2" />
                  <span>System Online</span>
                </div>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">
                  <span className="mr-1">🤖</span>
                  <span>AI Ready</span>
                </div>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-800">
                  <span className="mr-1">👥</span>
                  <span>Multi-User</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* File Upload Modal */}
      {showFileUpload && selectedThread && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">Upload Files</h2>
              <button
                onClick={() => setShowFileUpload(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <FileUpload
              threadId={selectedThread._id}
              onUploadComplete={() => setShowFileUpload(false)}
            />
          </div>
        </div>
      )}

      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}
