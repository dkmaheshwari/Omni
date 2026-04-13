// frontend/src/contexts/ThemeContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('peergenius-theme') || 'light';
    applyTheme(savedTheme);
  }, []);

  // Listen for theme changes from settings
  useEffect(() => {
    const handleThemeChange = (event) => {
      applyTheme(event.detail);
    };

    window.addEventListener('themeChange', handleThemeChange);
    return () => window.removeEventListener('themeChange', handleThemeChange);
  }, []);

  // Apply theme to document and state
  const applyTheme = (newTheme) => {
    let effectiveTheme = newTheme;

    // Handle auto theme
    if (newTheme === 'auto') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    setTheme(newTheme);
    setIsDark(effectiveTheme === 'dark');

    // Apply to document
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('peergenius-theme', newTheme);
  };

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyTheme('auto');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const value = {
    theme,
    isDark,
    setTheme: applyTheme,
    toggleTheme: () => {
      const newTheme = isDark ? 'light' : 'dark';
      applyTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};