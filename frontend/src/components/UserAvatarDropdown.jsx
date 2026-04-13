// frontend/src/components/UserAvatarDropdown.jsx

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Custom animation styles
const slideInAnimation = {
  animation: 'slideIn 0.2s ease-out forwards',
};

const UserAvatarDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Generate user initials
  const getInitials = (email) => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    if (name.length >= 2) {
      return name.slice(0, 2).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Generate consistent avatar color based on email
  const getAvatarColor = (email) => {
    if (!email) return 'bg-gradient-to-br from-gray-400 to-gray-500';
    
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
    ];
    
    const hash = email.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const handleMenuAction = (action) => {
    setIsOpen(false);
    
    switch (action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'ai-tutor':
        navigate('/ai/tutor');
        break;
      case 'ai-analytics':
        navigate('/ai/analytics');
        break;
      case 'ai-content':
        navigate('/ai/content');
        break;
      case 'ai-assistance':
        navigate('/ai/assistance');
        break;
      case 'logout':
        logout();
        break;
      default:
        break;
    }
  };

  const handleKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleMenuAction(action);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative w-10 h-10 rounded-full text-white font-semibold text-sm
          transition-all duration-200 ease-in-out
          hover:scale-105 hover:shadow-lg hover:ring-2 hover:ring-white/20
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent
          active:scale-95
          ${getAvatarColor(currentUser?.email)}
        `}
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Initials */}
        <span className="block">
          {getInitials(currentUser?.email)}
        </span>
        
        {/* Active indicator */}
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white dark:border-slate-800 rounded-full"></div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute right-0 mt-2 w-64 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl
            border border-white/20 dark:border-slate-700/20 rounded-2xl shadow-xl
            transform transition-all duration-200 ease-out
            origin-top-right scale-100 opacity-100
            z-50
          `}
          style={slideInAnimation}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(currentUser?.email)} flex items-center justify-center text-white text-xs font-semibold`}>
                {getInitials(currentUser?.email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {currentUser?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {currentUser?.email || 'No email'}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {/* Profile */}
            <button
              onClick={() => handleMenuAction('profile')}
              onKeyDown={(e) => handleKeyDown(e, 'profile')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                👤
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                My Profile
              </span>
            </button>

            {/* Settings */}
            <button
              onClick={() => handleMenuAction('settings')}
              onKeyDown={(e) => handleKeyDown(e, 'settings')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                ⚙️
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100">
                Settings
              </span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100"></div>

            {/* AI Features Section */}
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                AI Features
              </p>
            </div>

            {/* AI Tutor */}
            <button
              onClick={() => handleMenuAction('ai-tutor')}
              onKeyDown={(e) => handleKeyDown(e, 'ai-tutor')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                🧠
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-900 dark:group-hover:text-blue-100">
                AI Tutor
              </span>
            </button>

            {/* Analytics Dashboard */}
            <button
              onClick={() => handleMenuAction('ai-analytics')}
              onKeyDown={(e) => handleKeyDown(e, 'ai-analytics')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                📊
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-900 dark:group-hover:text-purple-100">
                Analytics
              </span>
            </button>

            {/* Content Generator */}
            <button
              onClick={() => handleMenuAction('ai-content')}
              onKeyDown={(e) => handleKeyDown(e, 'ai-content')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-300 transition-colors">
                📝
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-900 dark:group-hover:text-green-100">
                Content Generator
              </span>
            </button>

            {/* Intelligent Assistance */}
            <button
              onClick={() => handleMenuAction('ai-assistance')}
              onKeyDown={(e) => handleKeyDown(e, 'ai-assistance')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 dark:text-gray-500 group-hover:text-yellow-600 dark:group-hover:text-yellow-300 transition-colors">
                🤖
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-yellow-900 dark:group-hover:text-yellow-100">
                AI Assistance
              </span>
            </button>

            {/* Divider */}
            <div className="my-2 border-t border-gray-100"></div>

            {/* Logout */}
            <button
              onClick={() => handleMenuAction('logout')}
              onKeyDown={(e) => handleKeyDown(e, 'logout')}
              className="w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-red-50 transition-colors duration-150 group"
              role="menuitem"
            >
              <span className="text-gray-400 group-hover:text-red-500 transition-colors">
                🚪
              </span>
              <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">
                Logout
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatarDropdown;