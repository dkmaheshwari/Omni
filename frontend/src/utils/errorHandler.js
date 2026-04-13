// Frontend error handling utilities

export const getErrorMessage = (error) => {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error) => {
  return !error.response || error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK' || error.code === 'ERR_INSUFFICIENT_RESOURCES';
};

export const isAuthError = (error) => {
  // CRITICAL FIX: Don't treat thread access errors as auth errors
  if (error?.response?.status === 403) {
    const errorType = error?.response?.data?.errorType;
    const message = error?.response?.data?.message;
    
    // Check for specific thread access denial (not auth failure)
    if (errorType === 'THREAD_ACCESS_DENIED' || 
        message?.includes('Not authorized to view this thread') ||
        message?.includes('Not authorized to post in this thread')) {
      return false; // This is a permission error, not an auth failure
    }
  }
  
  return error?.response?.status === 401 || 
         (error?.response?.status === 403 && !error?.response?.data?.errorType) ||
         error?.code === 'auth/invalid-credential';
};

export const isValidationError = (error) => {
  return error?.response?.status === 400;
};

export const isRateLimitError = (error) => {
  return error?.response?.status === 429;
};

export const handleApiError = (error, context = '') => {
  console.error(`API Error ${context}:`, error);
  
  // CRITICAL FIX: Handle client-side rate limiting
  if (error.code === 'ERR_RATE_LIMITED') {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  
  if (isNetworkError(error)) {
    // Provide more specific messages for network exhaustion
    if (error.code === 'ERR_INSUFFICIENT_RESOURCES') {
      return 'Network resources exhausted. Please refresh the page and try again.';
    }
    return 'Network error. Please check your connection and try again.';
  }
  
  if (isAuthError(error)) {
    return 'Authentication failed. Please log in again.';
  }
  
  if (isRateLimitError(error)) {
    // More specific rate limit messages
    const errorMsg = error?.response?.data?.error;
    if (errorMsg?.includes('AI requests')) {
      return 'Sending messages too quickly. Please wait a moment before sending another message.';
    }
    return 'You\'re doing that too quickly. Please wait a moment and try again.';
  }
  
  if (isValidationError(error)) {
    const details = error?.response?.data?.details;
    if (details && Array.isArray(details)) {
      return details.join(', ');
    }
    return getErrorMessage(error);
  }
  
  return getErrorMessage(error);
};