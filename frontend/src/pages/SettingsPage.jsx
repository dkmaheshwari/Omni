import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { theme, setTheme } = useTheme();
  
  // Loading state
  const [loading, setLoading] = useState({
    load: false,
    save: false
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    notifications: {
      email: true,
      push: true,
      mentions: true,
      threadActivity: true,
    },
    theme: 'system',
    ai: {
      enabled: true,
      responseStyle: 'adaptive',
      autoRespond: true,
    },
  });

  // Load preferences on component mount
  useEffect(() => {
    if (currentUser) {
      loadPreferences();
    }
  }, [currentUser]);

  // Sync theme from context
  useEffect(() => {
    if (preferences.theme !== theme) {
      setPreferences(prev => ({
        ...prev,
        theme: theme
      }));
    }
  }, [theme]);

  const loadPreferences = async () => {
    setLoading(prev => ({ ...prev, load: true }));
    try {
      const response = await axios.get('/api/users/preferences', {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });
      
      setPreferences(response.data.preferences);
      
      // Update theme context if needed
      if (response.data.preferences.theme !== theme) {
        setTheme(response.data.preferences.theme);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      showError('Failed to load preferences');
    } finally {
      setLoading(prev => ({ ...prev, load: false }));
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNotificationChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const handleThemeChange = (newTheme) => {
    setPreferences(prev => ({
      ...prev,
      theme: newTheme
    }));
    
    // Apply theme immediately
    setTheme(newTheme);
  };

  const handleAiChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        [key]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    setLoading(prev => ({ ...prev, save: true }));
    try {
      await axios.put('/api/users/preferences', preferences, {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });
      
      showSuccess('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  if (loading.load) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleBackToDashboard}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Dashboard
              </button>
              <span className="text-slate-400 dark:text-slate-500">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">Settings</span>
            </nav>

            {/* Back Button */}
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">Customize your Omni Nexus experience</p>
        </div>

        <div className="space-y-8">
          {/* Notification Settings */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>🔔</span>
                <span>Notification Settings</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Choose what notifications you want to receive</p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Email Notifications</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Get notified via email about important updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Push Notifications</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Get push notifications in your browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.push}
                    onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Mention Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Mention Notifications</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">When someone mentions you in a thread</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.mentions}
                    onChange={(e) => handleNotificationChange('mentions', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Thread Activity Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Thread Activity</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">New messages in threads you're participating in</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.notifications.threadActivity}
                    onChange={(e) => handleNotificationChange('threadActivity', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Theme Preferences */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>🎨</span>
                <span>Appearance</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Customize how Omni Nexus looks</p>
            </div>

            <div className="px-8 py-6">
              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'system'].map((themeOption) => (
                    <label key={themeOption} className="relative">
                      <input
                        type="radio"
                        name="theme"
                        value={themeOption}
                        checked={preferences.theme === themeOption}
                        onChange={(e) => handleThemeChange(e.target.value)}
                        className="sr-only peer"
                      />
                      <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900 peer-checked:border-blue-500 dark:peer-checked:border-blue-400 transition-colors">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-blue-700 dark:peer-checked:text-blue-300 capitalize">
                          {themeOption === 'system' ? '🔄 System' : themeOption === 'light' ? '☀️ Light' : '🌙 Dark'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Settings */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>🤖</span>
                <span>AI Assistant</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Configure your AI assistant preferences</p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* AI Enabled */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">AI Assistant</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Enable AI-powered responses and assistance</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.ai.enabled}
                    onChange={(e) => handleAiChange('enabled', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* AI Response Style */}
              <div className={`transition-opacity duration-200 ${preferences.ai.enabled ? 'opacity-100' : 'opacity-50'}`}>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Response Style</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['concise', 'detailed', 'adaptive'].map((style) => (
                    <label key={style} className="relative">
                      <input
                        type="radio"
                        name="responseStyle"
                        value={style}
                        checked={preferences.ai.responseStyle === style}
                        onChange={(e) => handleAiChange('responseStyle', e.target.value)}
                        disabled={!preferences.ai.enabled}
                        className="sr-only peer"
                      />
                      <div className="flex items-center justify-center p-3 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900 peer-checked:border-blue-500 dark:peer-checked:border-blue-400 transition-colors peer-disabled:cursor-not-allowed peer-disabled:opacity-50">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-blue-700 dark:peer-checked:text-blue-300 capitalize">
                          {style === 'concise' ? '📝 Concise' : style === 'detailed' ? '📚 Detailed' : '🎯 Adaptive'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Concise: Brief responses • Detailed: Comprehensive explanations • Adaptive: Adjusts to context
                </p>
              </div>

              {/* Auto-respond */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto-respond</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Automatically respond to academic questions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.ai.autoRespond}
                    onChange={(e) => handleAiChange('autoRespond', e.target.checked)}
                    disabled={!preferences.ai.enabled}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={loading.save}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading.save && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{loading.save ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Settings are saved to your account and synchronized across all your devices. Theme changes apply immediately.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;