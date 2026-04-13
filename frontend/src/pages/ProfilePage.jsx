import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import axios from 'axios';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const fileInputRef = useRef(null);

  // Profile state
  const [profile, setProfile] = useState({
    displayName: '',
    bio: '',
    university: '',
    major: '',
    year: '',
    interests: [],
    avatar: '',
    isProfileComplete: false
  });

  const [activity, setActivity] = useState({
    messageCount: 0,
    threadsJoined: 0,
    helpfulVotes: 0,
    lastSeen: null
  });

  const [loading, setLoading] = useState({
    profile: false,
    save: false
  });

  const [isEditing, setIsEditing] = useState(false);
  const [newInterest, setNewInterest] = useState('');

  // Year options
  const yearOptions = [
    'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'PhD', 'Other'
  ];

  // Load profile data
  useEffect(() => {
    if (currentUser) {
      loadProfile();
    }
  }, [currentUser]);

  const loadProfile = async () => {
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      const response = await axios.get('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });
      
      const { profile: profileData, activity: activityData } = response.data;
      setProfile(profileData || {});
      setActivity(activityData || {});
    } catch (error) {
      console.error('Error loading profile:', error);
      showError('Failed to load profile data');
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  const handleSaveProfile = async () => {
    setLoading(prev => ({ ...prev, save: true }));
    try {
      const response = await axios.put('/api/users/profile', profile, {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });
      
      setProfile(response.data.profile);
      setIsEditing(false);
      showSuccess(response.data.message || 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      showError(error.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(prev => ({ ...prev, save: false }));
    }
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim()) && profile.interests.length < 10) {
      setProfile(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (index) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index)
    }));
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Generate user initials
  const getInitials = (name) => {
    if (!name) return currentUser?.email?.charAt(0).toUpperCase() || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Generate consistent avatar color
  const getAvatarColor = (name) => {
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
    
    const str = name || currentUser?.email || 'default';
    const hash = str.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading.profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
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
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleBackToDashboard}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Dashboard
              </button>
              <span className="text-slate-400 dark:text-slate-500">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">My Profile</span>
            </nav>

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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Profile</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your academic profile and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 px-8 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-6">
                {/* Avatar */}
                <div className="relative">
                  {profile.avatar ? (
                    <img
                      src={profile.avatar}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover shadow-lg"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-full ${getAvatarColor(profile.displayName)} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                      {getInitials(profile.displayName)}
                    </div>
                  )}
                </div>
                
                {/* User Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {profile.displayName || currentUser?.email?.split('@')[0] || 'User'}
                    </h2>
                    {profile.isProfileComplete && (
                      <div className="inline-flex items-center space-x-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Complete</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-slate-600 dark:text-slate-400 mb-2">{currentUser?.email}</p>
                  
                  {profile.university && (
                    <p className="text-slate-500 dark:text-slate-500 text-sm">
                      {profile.major} • {profile.year} • {profile.university}
                    </p>
                  )}
                </div>
              </div>

              {/* Edit Button */}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  isEditing
                    ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-8 py-8">
            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your display name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      University *
                    </label>
                    <input
                      type="text"
                      value={profile.university}
                      onChange={(e) => setProfile(prev => ({ ...prev, university: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your university"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Major *
                    </label>
                    <input
                      type="text"
                      value={profile.major}
                      onChange={(e) => setProfile(prev => ({ ...prev, major: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your major"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Academic Year *
                    </label>
                    <select
                      value={profile.year}
                      onChange={(e) => setProfile(prev => ({ ...prev, year: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select year</option>
                      {yearOptions.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {profile.bio.length}/500 characters
                  </p>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Academic Interests
                  </label>
                  <div className="flex space-x-2 mb-3">
                    <input
                      type="text"
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 dark:bg-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add an interest..."
                    />
                    <button
                      onClick={handleAddInterest}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                      >
                        <span>{interest}</span>
                        <button
                          onClick={() => handleRemoveInterest(index)}
                          className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {profile.interests.length}/10 interests
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading.save}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {loading.save ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-6">
                {/* Profile Information */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Profile Information</h3>
                  
                  {profile.bio && (
                    <div className="mb-4">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{profile.bio}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">University</label>
                      <p className="text-slate-700 dark:text-slate-300">{profile.university || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Major</label>
                      <p className="text-slate-700 dark:text-slate-300">{profile.major || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Academic Year</label>
                      <p className="text-slate-700 dark:text-slate-300">{profile.year || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {/* Interests */}
                {profile.interests.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Academic Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity Statistics */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Activity Statistics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Threads Joined</p>
                          <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{activity.threadsJoined}</p>
                        </div>
                        <div className="text-blue-500 text-2xl">💬</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Messages Sent</p>
                          <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{activity.messageCount}</p>
                        </div>
                        <div className="text-purple-500 text-2xl">📤</div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Helpful Votes</p>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{activity.helpfulVotes}</p>
                        </div>
                        <div className="text-emerald-500 text-2xl">⭐</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Profile Completion Prompt */}
                {!profile.isProfileComplete && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="text-yellow-600 dark:text-yellow-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Complete your profile</h4>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                          Add your display name, university, major, and academic year to help others connect with you.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfilePage;