// frontend/src/components/MessageItem.jsx

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMessages } from "../contexts/MessageContext";

export default function MessageItem({ message }) {
  const { currentUser } = useAuth();
  const { addReaction } = useMessages();
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  if (!message) return null;

  const isCurrentUser = message.sender === currentUser?.uid || message.senderEmail === currentUser?.email;
  const isAI = message.messageType === "ai" || message.sender === "AI Assistant" || message.sender === "AI" || message.sender === "ai-assistant";
  const isSystem = message.messageType === "system";
  const isSummary = message.type === "summary" || isSystem;
  
  // Get display name for sender
  const getSenderName = () => {
    if (isSummary || isSystem) return "📝 Thread Summary";
    if (isAI) return "AI";
    if (isCurrentUser) return "You";
    // Extract name from email or use full email
    const email = message.senderEmail || "User";
    const name = email.includes('@') ? email.split('@')[0] : email;
    return name;
  };

  // Handle reaction click
  const handleReaction = async (emoji) => {
    if (!message._id || !currentUser) return;
    
    try {
      await addReaction(message._id, emoji);
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Common reaction emojis
  const commonReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🤔'];

  // Check if current user has reacted with a specific emoji
  const hasUserReacted = (emoji) => {
    if (!message.reactions || !currentUser) return false;
    const reaction = message.reactions.find(r => r.emoji === emoji);
    return reaction?.users?.some(u => u.userId === currentUser.uid);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('document') || fileType.includes('word')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📈';
    if (fileType.includes('zip') || fileType.includes('compressed')) return '📦';
    return '📎';
  };

  // Handle file download
  const handleFileDownload = (fileName, originalName) => {
    const downloadUrl = `/api/messages/${message._id}/download/${fileName}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} ${
        isAI ? "mb-2" : "mb-4"
      }`}
    >
      <div
        className={`${
          isAI ? "max-w-[65%]" : "max-w-[75%]"
        } rounded-2xl ${
          isSummary
            ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-200 px-6 py-4 shadow-lg"
            : isCurrentUser
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 shadow-xl transform hover:scale-[1.02] transition-transform duration-200"
            : isAI
            ? "bg-green-50/80 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200/60 dark:border-green-700/60 px-4 py-2 shadow-sm"
            : isSystem
            ? "bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300 px-6 py-4 shadow-lg"
            : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 px-6 py-4 shadow-xl transform hover:scale-[1.02] transition-transform duration-200"
        }`}
      >
        {/* Message Header */}
        <div className={`flex items-center space-x-2 ${isAI ? "mb-1" : "mb-3"}`}>
          <span className={`${
            isAI ? "font-medium text-xs opacity-90" : "font-bold text-sm"
          }`}>
            {getSenderName()}
          </span>
          {(message.timestamp || message.createdAt) && (
            <span
              className={`text-xs ${
                isCurrentUser 
                  ? "text-blue-100 font-medium" 
                  : isAI 
                  ? "text-green-600/80 dark:text-green-400/80" 
                  : isSystem 
                  ? "text-yellow-600" 
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {new Date(message.timestamp || message.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Message Content */}
        <div
          className={`${
            isSummary 
              ? "font-semibold text-base" 
              : isAI 
              ? "text-sm font-normal leading-relaxed opacity-90" 
              : "text-base font-medium leading-relaxed"
          } whitespace-pre-wrap break-words`}
        >
          {message.text || message.content}
        </div>

        {/* File Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment, index) => (
              <div
                key={`${message._id}-attachment-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isCurrentUser 
                    ? 'bg-blue-400/20 border-blue-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(attachment.fileType)}</span>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-800'
                    }`}>
                      {attachment.originalName}
                    </p>
                    <p className={`text-xs ${
                      isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatFileSize(attachment.fileSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleFileDownload(attachment.fileName, attachment.originalName)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    isCurrentUser
                      ? 'bg-blue-300 text-blue-800 hover:bg-blue-200'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Special indicator for summary */}
        {isSummary && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <span className="text-xs text-purple-700 font-medium">
              AI-generated summary of the conversation
            </span>
          </div>
        )}

        {/* Reactions Display */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.reactions.map((reaction, index) => (
              <button
                key={`${message._id}-reaction-${reaction.emoji}-${index}`}
                onClick={() => handleReaction(reaction.emoji)}
                className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  hasUserReacted(reaction.emoji)
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reaction Picker */}
        {!isSummary && !isSystem && (
          <div className="mt-2 relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              😊 Add reaction
            </button>
            
            {showReactionPicker && (
              <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10">
                <div className="flex space-x-1">
                  {commonReactions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={`w-8 h-8 rounded hover:bg-gray-100 flex items-center justify-center transition-colors ${
                        hasUserReacted(emoji) ? 'bg-blue-100' : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
