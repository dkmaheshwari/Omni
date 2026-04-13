import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useThread } from '../contexts/ThreadContext';
import axios from 'axios';

const AdvancedThreadDiscovery = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('relevance');
  const [threads, setThreads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recommendedThreads, setRecommendedThreads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
  const [newTag, setNewTag] = useState('');
  
  const { currentUser } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { joinThread } = useThread();

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadRecommendedThreads();
    searchThreads();
  }, []);

  // Search when filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchThreads();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, selectedCategory, selectedTags, sortBy]);

  const loadCategories = async () => {
    try {
      const response = await axios.get('/thread-categories', {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadRecommendedThreads = async () => {
    setIsLoadingRecommendations(true);
    try {
      const response = await axios.get('/threads/recommended?limit=5', {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });
      setRecommendedThreads(response.data.threads || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const searchThreads = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy
      });

      if (searchQuery.trim()) params.append('query', searchQuery.trim());
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));

      const response = await axios.get(`/threads/search?${params}`, {
        headers: {
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        }
      });

      setThreads(response.data.threads || []);
      setPagination(response.data.pagination || { page: 1, total: 0, pages: 0 });
    } catch (error) {
      console.error('Error searching threads:', error);
      showError('Failed to search threads');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinThread = async (thread) => {
    try {
      await joinThread(thread._id);
      showSuccess(`Joined "${thread.title}" successfully!`);
      // Refresh search to remove joined thread from results
      searchThreads(pagination.page);
    } catch (error) {
      showError(`Failed to join thread: ${error.message}`);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !selectedTags.includes(newTag.trim())) {
      setSelectedTags([...selectedTags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const ThreadCard = ({ thread, isRecommended = false }) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {thread.category && (
              <span 
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${thread.category.color}20`,
                  color: thread.category.color
                }}
              >
                {thread.category.icon} {thread.category.name}
              </span>
            )}
            {isRecommended && thread.recommendationReason && (
              <span className="inline-flex items-center px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                ⭐ {thread.recommendationReason}
              </span>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {thread.title}
          </h3>
          
          {thread.description && (
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-3 line-clamp-2">
              {thread.description}
            </p>
          )}
          
          {thread.tags && thread.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {thread.tags.slice(0, 3).map((tag, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded text-xs"
                >
                  #{tag}
                </span>
              ))}
              {thread.tags.length > 3 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  +{thread.tags.length - 3} more
                </span>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
              </svg>
              <span>{thread.memberCount} member{thread.memberCount !== 1 ? 's' : ''}</span>
            </span>
            
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
              <span>{thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}</span>
            </span>
            
            <span>{formatTimeAgo(thread.lastActivity)}</span>
          </div>
        </div>
        
        <button
          onClick={() => handleJoinThread(thread)}
          className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Join
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          🔍 Discover Threads
        </h2>
        
        {/* Search Input */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for threads, topics, or keywords..."
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm dark:text-slate-200"
          />
        </div>
        
        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm dark:text-slate-200"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category._id} value={category._id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Sort Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm dark:text-slate-200"
            >
              <option value="relevance">Most Relevant</option>
              <option value="newest">Newest</option>
              <option value="activity">Most Active</option>
              <option value="popular">Most Popular</option>
              <option value="members">Most Members</option>
            </select>
          </div>
          
          {/* Tag Filter */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tags
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add tag filter..."
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm dark:text-slate-200"
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
        
        {/* Selected Tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                <span>#{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recommended Threads */}
      {recommendedThreads.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            ⭐ Recommended for You
          </h3>
          {isLoadingRecommendations ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedThreads.map((thread) => (
                <ThreadCard key={thread._id} thread={thread} isRecommended={true} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {searchQuery ? `Search Results for "${searchQuery}"` : 'Browse All Threads'}
          </h3>
          {pagination.total > 0 && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {pagination.total} result{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Searching threads...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No threads found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <ThreadCard key={thread._id} thread={thread} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-6">
            <button
              onClick={() => searchThreads(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 dark:disabled:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <span className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            
            <button
              onClick={() => searchThreads(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="px-3 py-2 bg-slate-200 hover:bg-slate-300 disabled:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600 dark:disabled:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedThreadDiscovery;