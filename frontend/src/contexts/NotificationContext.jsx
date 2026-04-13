// frontend/src/contexts/NotificationContext.jsx

import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type: 'info', // info, success, warning, error
      title: '',
      message: '',
      duration: 5000, // 5 seconds default
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((message, title = 'Success') => {
    console.log('🎉 Showing success notification:', { title, message });
    return addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const showError = useCallback((message, title = 'Error') => {
    console.log('❌ Showing error notification:', { title, message });
    return addNotification({ type: 'error', title, message, duration: 7000 });
  }, [addNotification]);

  const showWarning = useCallback((message, title = 'Warning') => {
    return addNotification({ type: 'warning', title, message });
  }, [addNotification]);

  const showInfo = useCallback((message, title = 'Info') => {
    return addNotification({ type: 'info', title, message });
  }, [addNotification]);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};