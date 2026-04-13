// frontend/src/components/MessageSearch.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useMessages } from '../contexts/MessageContext';
import { useAuth } from '../contexts/AuthContext';
import MessageItem from './MessageItem';

export default function MessageSearch({ threadId }) {
  const { searchMessages } = useMessages();
  const { currentUser } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Advanced filter states
  const [filters, setFilters] = useState({
    messageType: '',
    dateFrom: '',
    dateTo: '',
    authorId: ''
  });

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Perform search
  const performSearch = useCallback(async (query = searchQuery, page = 1, currentFilters = filters) => {
    if (!query.trim() && !currentFilters.messageType && !currentFilters.dateFrom && !currentFilters.dateTo && !currentFilters.authorId) {
      setSearchResults([]);
      setPagination(null);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await searchMessages(threadId, query, currentFilters, page, 20);
      
      if (page === 1) {
        setSearchResults(response.messages);
      } else {
        setSearchResults(prev => [...prev, ...response.messages]);
      }
      
      setPagination(response.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
      setPagination(null);
    } finally {
      setIsSearching(false);
    }
  }, [threadId, searchMessages, searchQuery, filters]);

  // Handle search input with debouncing
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      performSearch(value, 1);
    }, 500);
    
    setSearchTimeout(newTimeout);
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    
    // Perform search with new filters
    performSearch(searchQuery, 1, newFilters);
  };

  // Load more results
  const loadMoreResults = () => {
    if (pagination && pagination.hasNext && !isSearching) {
      performSearch(searchQuery, currentPage + 1);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setPagination(null);
    setHasSearched(false);
    setCurrentPage(1);
    setFilters({
      messageType: '',
      dateFrom: '',
      dateTo: '',
      authorId: ''
    });
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Get display name for user
  const getDisplayName = (email) => {
    if (!email) return 'Unknown User';
    return email.split('@')[0];
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Search Messages</h2>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search messages..."
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute right-3 top-3 text-gray-400">
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            ) : (
              <span className="text-lg">🔍</span>
            )}
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showAdvancedFilters ? '− Hide' : '+ Show'} Advanced Filters
          </button>
          
          {(searchQuery || Object.values(filters).some(Boolean)) && (
            <button
              onClick={clearSearch}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            {/* Message Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message Type
              </label>
              <select
                value={filters.messageType}
                onChange={(e) => handleFilterChange('messageType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="user">User Messages</option>
                <option value="ai">AI Messages</option>
                <option value="system">System Messages</option>
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Author Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Author ID
              </label>
              <input
                type="text"
                value={filters.authorId}
                onChange={(e) => handleFilterChange('authorId', e.target.value)}
                placeholder="Enter user ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Search Stats */}
        {hasSearched && pagination && (
          <div className="mt-4 text-sm text-gray-600">
            Found {pagination.totalMessages} message{pagination.totalMessages !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
            {pagination.totalPages > 1 && ` (Page ${pagination.currentPage} of ${pagination.totalPages})`}
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {searchResults.map((message) => (
          <div key={message._id} className="bg-white border border-gray-200 rounded-lg p-4">
            <MessageItem message={message} />
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                📅 {new Date(message.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Load More Button */}
        {pagination && pagination.hasNext && (
          <div className="text-center">
            <button
              onClick={loadMoreResults}
              disabled={isSearching}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {isSearching ? 'Loading...' : 'Load More Results'}
            </button>
          </div>
        )}

        {/* Empty State */}
        {hasSearched && searchResults.length === 0 && !isSearching && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No messages found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* No Search State */}
        {!hasSearched && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Search Messages</h3>
            <p className="text-gray-600">
              Enter search terms to find specific messages in this thread
            </p>
          </div>
        )}
      </div>
    </div>
  );
}