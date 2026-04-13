import React, { useState, useEffect } from "react";
import { useThread } from "../contexts/ThreadContext";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import axios from "../axios";

export default function CreateThread() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [categories, setCategories] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  
  const { createThread } = useThread();
  const { currentUser } = useAuth();
  const { showError } = useNotification();

  // Load categories when user is authenticated
  useEffect(() => {
    if (currentUser) {
      loadCategories();
    }
  }, [currentUser]);

  const loadCategories = async () => {
    if (!currentUser) return;
    
    setIsLoadingCategories(true);
    try {
      const response = await axios.get('/thread-categories');
      console.log('Categories response:', response.data);
      setCategories(response.data.categories || response.data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      if (error.response?.status === 401) {
        console.warn('User not authenticated for categories');
      } else {
        showError('Failed to load categories');
      }
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim()) && tags.length < 10) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (index) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await createThread(
        title.trim(), 
        description.trim(), 
        isPublic, 
        selectedCategory && selectedCategory.trim() !== '' ? selectedCategory : null, 
        tags
      );
      
      // Reset form
      setTitle("");
      setDescription("");
      setIsPublic(false);
      setSelectedCategory("");
      setTags([]);
      setNewTag("");
    } catch (err) {
      console.error("Failed to create thread:", err);
      
      // Better error message handling
      let errorMessage = 'Please try again.';
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      showError(`Failed to create thread: ${errorMessage}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Title Input */}
      <div className="relative">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter thread title..."
          disabled={isCreating}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400 dark:text-slate-200"
        />
      </div>

      {/* Description Input */}
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)..."
          disabled={isCreating}
          rows={2}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400 dark:text-slate-200 resize-none"
        />
      </div>

      {/* Category Selection */}
      <div className="relative">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Category (optional)
        </label>
        {isLoadingCategories ? (
          <div className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-400">
            Loading categories...
          </div>
        ) : (
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            disabled={isCreating}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm dark:text-slate-200"
          >
            <option value="">Select a category...</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Tags Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Tags (optional)
        </label>
        
        {/* Tag Input */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a tag..."
            disabled={isCreating || tags.length >= 10}
            className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm placeholder-slate-400 dark:text-slate-200"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!newTag.trim() || tags.length >= 10 || isCreating}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            Add
          </button>
        </div>
        
        {/* Tag Display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={`tag-${tag}-${index}`}
                className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(index)}
                  disabled={isCreating}
                  className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {tags.length}/10 tags
        </p>
      </div>

      {/* Public Toggle */}
      <div className="flex items-center space-x-3">
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={isCreating}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
            🌍 Make this thread public (others can discover and join)
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!title.trim() || isCreating}
        className={`w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
          !title.trim() || isCreating
            ? "bg-slate-200 dark:bg-slate-600 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
        }`}
      >
        {isCreating ? (
          <span className="flex items-center justify-center space-x-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Creating Thread...</span>
          </span>
        ) : (
          <span>✨ Create New Thread</span>
        )}
      </button>
    </form>
  );
}