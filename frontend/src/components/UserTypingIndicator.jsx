// frontend/src/components/UserTypingIndicator.jsx

import React from 'react';

export default function UserTypingIndicator({ typingUsers, currentThreadId, currentUserEmail }) {
  // Get typing users for current thread, excluding current user
  const currentThreadTyping = typingUsers.get(currentThreadId);
  
  if (!currentThreadTyping || currentThreadTyping.size === 0) {
    return null;
  }
  
  // Support both legacy Set<string> and current Map<userId, userName> structures.
  const typingUsersList = currentThreadTyping instanceof Map
    ? Array.from(currentThreadTyping.values())
    : Array.from(currentThreadTyping);

  const normalizedTypingUsers = typingUsersList
    .map((user) => {
      if (typeof user === 'string') return user;
      if (Array.isArray(user) && typeof user[1] === 'string') return user[1];
      return '';
    })
    .filter((username) => !!username && username !== currentUserEmail);
  
  if (normalizedTypingUsers.length === 0) {
    return null;
  }
  
  // Format typing message
  let typingMessage;
  if (normalizedTypingUsers.length === 1) {
    const name = normalizedTypingUsers[0].split('@')[0]; // Get name part of email
    typingMessage = `${name} is typing...`;
  } else if (normalizedTypingUsers.length === 2) {
    const name1 = normalizedTypingUsers[0].split('@')[0];
    const name2 = normalizedTypingUsers[1].split('@')[0];
    typingMessage = `${name1} and ${name2} are typing...`;
  } else {
    const name1 = normalizedTypingUsers[0].split('@')[0];
    typingMessage = `${name1} and ${normalizedTypingUsers.length - 1} others are typing...`;
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