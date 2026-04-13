// Request throttling utility to prevent network exhaustion
class RequestThrottle {
  constructor() {
    this.requestCounts = new Map(); // Track requests per endpoint
    this.blockedEndpoints = new Set(); // Endpoints that are temporarily blocked
    this.maxRequestsPerMinute = 120; // Increased to allow more requests
    this.blockDuration = 10000; // Reduced to 10 seconds
    this.exemptEndpoints = ['/threads/public', '/health', '/auth/check']; // Endpoints exempt from throttling
  }

  // Check if a request should be allowed
  shouldAllowRequest(endpoint) {
    const now = Date.now();
    const key = this.getEndpointKey(endpoint);
    
    // Check if this endpoint is exempt from throttling
    if (this.exemptEndpoints.some(exempt => key.includes(exempt))) {
      return true;
    }
    
    // Check if endpoint is currently blocked
    if (this.blockedEndpoints.has(key)) {
      console.warn(`🚫 Request blocked: ${endpoint} is temporarily blocked due to excessive requests`);
      return false;
    }
    
    // Get current request count for this endpoint
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }
    
    const requests = this.requestCounts.get(key);
    
    // Remove requests older than 1 minute
    const oneMinuteAgo = now - 60000;
    const recentRequests = requests.filter(timestamp => timestamp > oneMinuteAgo);
    this.requestCounts.set(key, recentRequests);
    
    // Check if we're exceeding the limit
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      console.error(`🚨 Request limit exceeded for ${endpoint}: ${recentRequests.length}/${this.maxRequestsPerMinute} requests per minute`);
      this.blockEndpoint(key);
      return false;
    }
    
    return true;
  }

  // Record a successful request
  recordRequest(endpoint) {
    const key = this.getEndpointKey(endpoint);
    const now = Date.now();
    
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, []);
    }
    
    const requests = this.requestCounts.get(key);
    requests.push(now);
    
    // Keep only recent requests
    const oneMinuteAgo = now - 60000;
    const recentRequests = requests.filter(timestamp => timestamp > oneMinuteAgo);
    this.requestCounts.set(key, recentRequests);
  }

  // Block an endpoint temporarily
  blockEndpoint(key) {
    this.blockedEndpoints.add(key);
    console.log(`🚫 Blocking endpoint ${key} for ${this.blockDuration}ms due to excessive requests`);
    
    setTimeout(() => {
      this.blockedEndpoints.delete(key);
      console.log(`✅ Unblocked endpoint ${key} after cooldown period`);
    }, this.blockDuration);
  }

  // Get a normalized key for the endpoint
  getEndpointKey(url) {
    try {
      const urlObj = new URL(url, window.location.origin);
      // Remove query parameters and extract path
      const path = urlObj.pathname;
      
      // Normalize thread-specific endpoints
      if (path.includes('/messages/')) {
        return '/messages/:threadId';
      }
      if (path.includes('/threads/') && path.includes('/join')) {
        return '/threads/:id/join';
      }
      if (path.includes('/threads/') && path.includes('/leave')) {
        return '/threads/:id/leave';
      }
      
      return path;
    } catch (error) {
      // Fallback for malformed URLs
      return url.split('?')[0];
    }
  }

  // Get current stats
  getStats() {
    const stats = {};
    this.requestCounts.forEach((requests, endpoint) => {
      stats[endpoint] = {
        requestCount: requests.length,
        isBlocked: this.blockedEndpoints.has(endpoint)
      };
    });
    return stats;
  }

  // Reset all counters (for emergency situations)
  reset() {
    this.requestCounts.clear();
    this.blockedEndpoints.clear();
    console.log('🔄 Request throttle reset - all counters cleared');
  }
  
  // Unblock a specific endpoint
  unblockEndpoint(endpoint) {
    const key = this.getEndpointKey(endpoint);
    if (this.blockedEndpoints.has(key)) {
      this.blockedEndpoints.delete(key);
      console.log(`✅ Manually unblocked endpoint: ${key}`);
    }
  }
}

// Create a singleton instance
const requestThrottle = new RequestThrottle();

export default requestThrottle;