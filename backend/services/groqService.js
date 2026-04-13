const axios = require('axios');

/**
 * Enhanced Groq API service with retry logic and error handling
 */
class GroqService {
  constructor() {
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    this.apiKey = process.env.GROQ_API_KEY;
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 10000; // 10 seconds
    this.timeout = 30000; // 30 seconds
  }

  /**
   * Make API call with retry logic and exponential backoff
   */
  async makeRequest(payload, retryCount = 0) {
    try {
      console.log(`🤖 Making Groq API request (attempt ${retryCount + 1}/${this.maxRetries + 1})`);
      
      const response = await axios.post(this.baseURL, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
        validateStatus: (status) => status < 500, // Don't throw on client errors
      });

      // Handle different response statuses
      if (response.status >= 400) {
        const error = new Error(`Groq API error: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.response = response.data;
        throw error;
      }

      if (!response.data?.choices?.[0]?.message?.content) {
        throw new Error('Invalid response format from Groq API');
      }

      console.log('✅ Groq API request successful');
      return response.data;

    } catch (error) {
      console.error(`❌ Groq API error (attempt ${retryCount + 1}):`, {
        message: error.message,
        status: error.status,
        response: error.response?.data,
      });

      // Don't retry on client errors (4xx) or if we've exceeded max retries
      if (error.status >= 400 && error.status < 500) {
        throw this.createUserFriendlyError(error);
      }

      if (retryCount >= this.maxRetries) {
        throw this.createUserFriendlyError(error, true);
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        this.baseDelay * Math.pow(2, retryCount) + Math.random() * 1000,
        this.maxDelay
      );

      console.log(`⏰ Retrying Groq API request in ${delay}ms...`);
      await this.sleep(delay);

      return this.makeRequest(payload, retryCount + 1);
    }
  }

  /**
   * Generate AI response with enhanced error handling
   */
  async generateResponse(options) {
    const {
      messages,
      model = 'llama-3.3-70b-versatile',
      maxTokens = 400,
      temperature = 0.7,
      systemPrompt,
      context = {}
    } = options;

    // Validate inputs
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required and cannot be empty');
    }

    if (!this.apiKey) {
      throw new Error('Groq API key is not configured');
    }

    // Build the payload
    const payload = {
      model,
      messages: systemPrompt ? [
        { role: 'system', content: systemPrompt },
        ...messages
      ] : messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    };

    // Add additional safety measures
    if (context.safetyMode) {
      payload.top_p = 0.9;
      payload.frequency_penalty = 0.1;
    }

    try {
      const response = await this.makeRequest(payload);
      
      const aiResponse = response.choices[0].message.content;
      
      // Basic content validation
      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error('Empty response from AI');
      }

      // Log successful response (without content for privacy)
      console.log('✅ AI response generated successfully', {
        model,
        tokenCount: response.usage?.total_tokens || 'unknown',
        responseLength: aiResponse.length
      });

      return {
        content: aiResponse,
        usage: response.usage,
        model: response.model || model,
        finishReason: response.choices[0].finish_reason
      };

    } catch (error) {
      console.error('❌ AI response generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create user-friendly error messages
   */
  createUserFriendlyError(error, isRetryExhausted = false) {
    let message = 'AI service is temporarily unavailable. Please try again.';
    
    if (error.status === 401) {
      message = 'AI service authentication failed. Please contact support.';
    } else if (error.status === 403) {
      message = 'AI service access denied. Please contact support.';
    } else if (error.status === 429) {
      message = 'AI service is busy. Please wait a moment and try again.';
    } else if (error.status === 400) {
      message = 'Invalid request to AI service. Please try rephrasing your message.';
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      message = 'AI service request timed out. Please try again.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      message = 'Cannot connect to AI service. Please check your internet connection.';
    } else if (isRetryExhausted) {
      message = 'AI service is experiencing issues. Please try again later.';
    }

    const userError = new Error(message);
    userError.originalError = error;
    userError.status = error.status || 503;
    userError.isRetryExhausted = isRetryExhausted;
    
    return userError;
  }

  /**
   * Sleep utility for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate Groq API configuration
   */
  validateConfiguration() {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    if (this.apiKey.length < 20) {
      throw new Error('GROQ_API_KEY appears to be invalid (too short)');
    }

    return true;
  }

  /**
   * Health check for Groq API
   */
  async healthCheck() {
    try {
      const testResponse = await this.generateResponse({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 10,
        temperature: 0.1
      });

      return {
        status: 'healthy',
        responseTime: Date.now(),
        model: testResponse.model
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now()
      };
    }
  }
}

// Export singleton instance
module.exports = new GroqService();