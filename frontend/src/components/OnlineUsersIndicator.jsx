// frontend/src/components/OnlineUsersIndicator.jsx

import React from 'react';

export default function OnlineUsersIndicator({ onlineUsers, currentThreadId, currentUserEmail }) {
  // Get online users for current thread, excluding current user
  const currentThreadOnline = onlineUsers.get(currentThreadId);
  
  if (!currentThreadOnline || currentThreadOnline.length === 0) {
    return null;
  }
  
  // Filter out current user
  const otherOnlineUsers = currentThreadOnline.filter(
    user => user.email !== currentUserEmail
  );
  
  if (otherOnlineUsers.length === 0) {
    return null;
  }
  
  // Format online users display
  const getDisplayName = (email) => {
    return email.split('@')[0]; // Get name part of email
  };
  
  const renderOnlineUsers = () => {
    if (otherOnlineUsers.length === 1) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-slate-600">
            {getDisplayName(otherOnlineUsers[0].email)} is online
          </span>
        </div>
      );
    } else if (otherOnlineUsers.length <= 3) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-slate-600">
            {otherOnlineUsers.map(user => getDisplayName(user.email)).join(', ')} are online
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm text-slate-600">
            {getDisplayName(otherOnlineUsers[0].email)} and {otherOnlineUsers.length - 1} others are online
          </span>
        </div>
      );
    }
  };
  
  return (
    <div className="flex items-center justify-start mb-2 px-4">
      <div className="flex items-center space-x-3 px-3 py-1.5 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-full shadow-sm">
        {renderOnlineUsers()}
      </div>
    </div>
  );
}