// frontend/src/components/UserTypingIndicator.jsx

import React from 'react';

export default function UserTypingIndicator({ typingUsers, currentThreadId, currentUserEmail }) {
  // Get typing users for current thread, excluding current user
  const currentThreadTyping = typingUsers.get(currentThreadId);
  
  if (!currentThreadTyping || currentThreadTyping.size === 0) {
    return null;
  }
  
  // Convert Set to Array and filter out current user
  const typingUsersList = Array.from(currentThreadTyping).filter(
    username => username !== currentUserEmail
  );
  
  if (typingUsersList.length === 0) {
    return null;
  }
  
  // Format typing message
  let typingMessage;
  if (typingUsersList.length === 1) {
    const name = typingUsersList[0].split('@')[0]; // Get name part of email
    typingMessage = `${name} is typing...`;
  } else if (typingUsersList.length === 2) {
    const name1 = typingUsersList[0].split('@')[0];
    const name2 = typingUsersList[1].split('@')[0];
    typingMessage = `${name1} and ${name2} are typing...`;
  } else {
    const name1 = typingUsersList[0].split('@')[0];
    typingMessage = `${name1} and ${typingUsersList.length - 1} others are typing...`;
  }
  
  return (
    <div className="flex items-center justify-start mb-4 px-4">
      <div className="flex items-center space-x-3 px-4 py-2 bg-slate-50/80 backdrop-blur-sm border border-slate-200/50 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
        </div>
        <span className="text-sm text-slate-600 italic">{typingMessage}</span>
      </div>
    </div>
  );
}