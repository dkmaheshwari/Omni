// Simple In-Memory Cache Service
class CacheService {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    
    console.log('💾 Cache Service initialized');
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} - Cached value or null
   */
  get(key) {
    if (this.cache.has(key)) {
      const item = this.cache.get(key);
      
      // Check if item has expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.stats.misses++;
        return null;
      }
      
      this.stats.hits++;
      return item.value;
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    const item = {
      value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null
    };
    
    this.cache.set(key, item);
    this.stats.sets++;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if deleted, false if not found
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`💾 Cache CLEARED: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 Cache cleanup removed ${removed} expired entries`);
    }
    
    return removed;
  }

  /**
   * Graceful shutdown
   */
  destroy() {
    console.log('📦 Cache service shutting down gracefully...');
    this.clear();
  }
}

// Create singleton instance
const cacheService = new CacheService();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => cacheService.destroy());
process.on('SIGINT', () => cacheService.destroy());

module.exports = cacheService;