// frontend/src/components/Toast.jsx

import React, { useEffect, useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';

const Toast = ({ notification }) => {
  const { removeNotification } = useNotification();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    setIsVisible(true);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      removeNotification(notification.id);
    }, 300); // Wait for animation to complete
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-100';
      case 'error':
        return 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700 text-red-800 dark:text-red-100';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100';
      case 'info':
      default:
        return 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-100';
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-md w-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border rounded-xl shadow-lg
        ${getStyles()}
      `}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 text-lg">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">
              {notification.title}
            </p>
            {notification.message && (
              <p className="mt-1 text-sm opacity-90">
                {notification.message}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className="inline-flex text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:text-gray-600 dark:focus:text-gray-300 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const { notifications } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2">
      {notifications.map(notification => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </div>
  );
};

export default ToastContainer;