/**
 * @fileoverview OpenAI API service wrapper for Whisper transcription and GPT-4 completions
 * @author LegacyAI Subagent Fleet - Conversation Agent Builder
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This service provides a comprehensive interface for OpenAI API operations including:
 * - Audio transcription using Whisper
 * - Text completions using GPT-4
 * - Token usage tracking
 * - Retry logic with exponential backoff
 * - Health checks and monitoring
 */

const OpenAI = require('openai');

class OpenAIService {
  /**
   * Initialize OpenAI service
   * @param {Object} config - OpenAI configuration
   * @param {string} config.apiKey - OpenAI API key
   * @param {string} [config.model='gpt-4-1106-preview'] - Default GPT model
   * @param {string} [config.realtimeModel='whisper-1'] - Whisper model
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor(config) {
    console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] Initializing OpenAI service`);

    this.config = config;
    this.model = config.model || 'gpt-4-1106-preview';
    this.realtimeModel = config.realtimeModel || 'whisper-1';

    // Initialize OpenAI client
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    // Token usage tracking
    this.totalTokensUsed = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay

    console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] OpenAI service initialized - Model: ${this.model}, Whisper: ${this.realtimeModel}`);
  }

  /**
   * Transcribe audio using OpenAI Whisper
   * @param {string|Buffer|File} audioInput - Audio file URL, Buffer, or File object
   * @param {Object} [options] - Transcription options
   * @param {string} [options.language] - Language code (e.g., 'en')
   * @param {string} [options.prompt] - Optional prompt to guide transcription
   * @returns {Promise<Object>} Transcription result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const result = await openaiService.transcribeAudio(audioBuffer, { language: 'en' });
   * console.log(result.text);
   */
  async transcribeAudio(audioInput, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] [${requestId}] Starting audio transcription`);

      this.totalRequests++;

      // Prepare transcription parameters
      const params = {
        file: audioInput,
        model: this.realtimeModel,
      };

      if (options.language) {
        params.language = options.language;
      }

      if (options.prompt) {
        params.prompt = options.prompt;
      }

      // Execute transcription with retry logic
      const transcription = await this.executeWithRetry(async () => {
        return await this.client.audio.transcriptions.create(params);
      });

      const latency = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] [${requestId}] Transcription completed in ${latency}ms - Text length: ${transcription.text.length}`);

      return {
        text: transcription.text,
        language: transcription.language || options.language,
        duration: transcription.duration,
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.totalErrors++;

      console.error(`[${new Date().toISOString()}] [ERROR] [OpenAIService] [${requestId}] Transcription failed after ${latency}ms`, error);

      throw {
        error: error.message,
        code: error.code || 'TRANSCRIPTION_ERROR',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Generate text completion using GPT-4
   * @param {Array<Object>} messages - Array of message objects with role and content
   * @param {Object} [options] - Completion options
   * @param {number} [options.maxTokens=150] - Maximum tokens to generate
   * @param {number} [options.temperature=0.7] - Sampling temperature (0-2)
   * @param {string} [options.model] - Override default model
   * @returns {Promise<Object>} Completion result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const result = await openaiService.generateCompletion([
   *   { role: 'user', content: 'Hello!' }
   * ], { maxTokens: 100 });
   */
  async generateCompletion(messages, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] [${requestId}] Generating completion - Messages: ${messages.length}`);

      this.totalRequests++;

      // Prepare completion parameters
      const params = {
        model: options.model || this.model,
        messages: messages,
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
      };

      // Execute completion with retry logic
      const completion = await this.executeWithRetry(async () => {
        return await this.client.chat.completions.create(params);
      });

      const latency = Date.now() - startTime;
      const tokensUsed = completion.usage.total_tokens;
      this.totalTokensUsed += tokensUsed;

      const responseText = completion.choices[0].message.content;

      console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] [${requestId}] Completion generated in ${latency}ms - Tokens: ${tokensUsed}, Response length: ${responseText.length}`);

      return {
        text: responseText,
        model: completion.model,
        tokensUsed: tokensUsed,
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        finishReason: completion.choices[0].finish_reason,
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.totalErrors++;

      console.error(`[${new Date().toISOString()}] [ERROR] [OpenAIService] [${requestId}] Completion failed after ${latency}ms`, error);

      throw {
        error: error.message,
        code: error.code || 'COMPLETION_ERROR',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Execute operation with retry logic and exponential backoff
   * @param {Function} operation - Async operation to execute
   * @param {number} [attempt=1] - Current attempt number
   * @returns {Promise<*>} Operation result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @private
   */
  async executeWithRetry(operation, attempt = 1) {
    try {
      return await operation();
    } catch (error) {
      // Don't retry if we've exhausted attempts
      if (attempt >= this.maxRetries) {
        console.error(`[${new Date().toISOString()}] [ERROR] [OpenAIService] Max retries (${this.maxRetries}) exceeded`);
        throw error;
      }

      // Don't retry on certain errors (e.g., invalid API key, bad request)
      const nonRetryableCodes = ['invalid_api_key', 'invalid_request_error', 'authentication_error'];
      if (nonRetryableCodes.includes(error.code)) {
        console.error(`[${new Date().toISOString()}] [ERROR] [OpenAIService] Non-retryable error: ${error.code}`);
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = this.retryDelay * Math.pow(2, attempt - 1);

      console.warn(`[${new Date().toISOString()}] [WARN] [OpenAIService] Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the operation
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  /**
   * Perform health check on OpenAI service
   * Tests API connectivity by making a minimal completion request
   * @returns {Promise<Object>} Health check result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const health = await openaiService.healthCheck();
   * console.log(health.healthy); // true/false
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] Running health check`);

      // Make a minimal API call to test connectivity
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
      });

      const latency = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] Health check passed in ${latency}ms`);

      return {
        healthy: true,
        latencyMs: latency,
        model: this.model,
        totalRequests: this.totalRequests,
        totalTokensUsed: this.totalTokensUsed,
        totalErrors: this.totalErrors,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const latency = Date.now() - startTime;

      console.error(`[${new Date().toISOString()}] [ERROR] [OpenAIService] Health check failed after ${latency}ms`, error);

      return {
        healthy: false,
        error: error.message,
        latencyMs: latency,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get current token usage statistics
   * @returns {Object} Token usage statistics
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  getUsageStats() {
    return {
      totalRequests: this.totalRequests,
      totalTokensUsed: this.totalTokensUsed,
      totalErrors: this.totalErrors,
      errorRate: this.totalRequests > 0 ? (this.totalErrors / this.totalRequests) : 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset usage statistics
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  resetStats() {
    console.log(`[${new Date().toISOString()}] [INFO] [OpenAIService] Resetting usage statistics`);
    this.totalTokensUsed = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;
  }

  /**
   * Generate unique request ID for tracking
   * @returns {string} UUID v4
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @private
   */
  generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = OpenAIService;
