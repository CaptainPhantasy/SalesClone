/**
 * @fileoverview Anthropic Claude API service wrapper with streaming support
 * @author LegacyAI Subagent Fleet - Conversation Agent Builder
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This service provides a comprehensive interface for Anthropic Claude API operations including:
 * - Message generation with system prompts
 * - Streaming support for long responses
 * - Token usage tracking
 * - Retry logic with exponential backoff
 * - Health checks and monitoring
 */

const Anthropic = require('@anthropic-ai/sdk');

class AnthropicService {
  /**
   * Initialize Anthropic service
   * @param {Object} config - Anthropic configuration
   * @param {string} config.apiKey - Anthropic API key
   * @param {string} [config.model='claude-3-opus-20240229'] - Default Claude model
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor(config) {
    console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] Initializing Anthropic service`);

    this.config = config;
    this.model = config.model || 'claude-3-opus-20240229';

    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    // Token usage tracking
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    this.totalRequests = 0;
    this.totalErrors = 0;

    // Retry configuration
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second initial delay

    console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] Anthropic service initialized - Model: ${this.model}`);
  }

  /**
   * Generate response using Claude
   * @param {Array<Object>} messages - Array of message objects with role and content
   * @param {string} systemPrompt - System prompt to guide Claude's behavior
   * @param {Object} [options] - Generation options
   * @param {number} [options.maxTokens=150] - Maximum tokens to generate
   * @param {number} [options.temperature=0.7] - Sampling temperature (0-1)
   * @param {string} [options.model] - Override default model
   * @returns {Promise<Object>} Generation result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const result = await anthropicService.generateResponse(
   *   [{ role: 'user', content: 'Hello!' }],
   *   'You are a helpful assistant.',
   *   { maxTokens: 100 }
   * );
   */
  async generateResponse(messages, systemPrompt, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] [${requestId}] Generating response - Messages: ${messages.length}`);

      this.totalRequests++;

      // Prepare message parameters
      const params = {
        model: options.model || this.model,
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        system: systemPrompt,
        messages: messages,
      };

      // Execute generation with retry logic
      const response = await this.executeWithRetry(async () => {
        return await this.client.messages.create(params);
      });

      const latency = Date.now() - startTime;
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;

      this.totalInputTokens += inputTokens;
      this.totalOutputTokens += outputTokens;

      const responseText = response.content[0].text;

      console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] [${requestId}] Response generated in ${latency}ms - Input tokens: ${inputTokens}, Output tokens: ${outputTokens}, Response length: ${responseText.length}`);

      return {
        text: responseText,
        model: response.model,
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        stopReason: response.stop_reason,
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.totalErrors++;

      console.error(`[${new Date().toISOString()}] [ERROR] [AnthropicService] [${requestId}] Response generation failed after ${latency}ms`, error);

      throw {
        error: error.message,
        code: error.type || 'GENERATION_ERROR',
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Generate streaming response using Claude
   * @param {Array<Object>} messages - Array of message objects with role and content
   * @param {string} systemPrompt - System prompt to guide Claude's behavior
   * @param {Function} onChunk - Callback function called for each chunk (text) => void
   * @param {Object} [options] - Generation options
   * @param {number} [options.maxTokens=150] - Maximum tokens to generate
   * @param {number} [options.temperature=0.7] - Sampling temperature (0-1)
   * @param {string} [options.model] - Override default model
   * @returns {Promise<Object>} Final generation result with full text
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const result = await anthropicService.generateStreamingResponse(
   *   [{ role: 'user', content: 'Tell me a story' }],
   *   'You are a storyteller.',
   *   (chunk) => console.log(chunk),
   *   { maxTokens: 500 }
   * );
   */
  async generateStreamingResponse(messages, systemPrompt, onChunk, options = {}) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] [${requestId}] Starting streaming response - Messages: ${messages.length}`);

      this.totalRequests++;

      // Prepare message parameters
      const params = {
        model: options.model || this.model,
        max_tokens: options.maxTokens || 150,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        system: systemPrompt,
        messages: messages,
        stream: true,
      };

      let fullText = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason = null;

      // Execute streaming with retry logic
      const stream = await this.executeWithRetry(async () => {
        return await this.client.messages.create(params);
      });

      // Process stream chunks
      for await (const chunk of stream) {
        if (chunk.type === 'message_start') {
          // Track usage from message start
          if (chunk.message?.usage) {
            inputTokens = chunk.message.usage.input_tokens;
          }
        } else if (chunk.type === 'content_block_delta') {
          // Process text delta
          const text = chunk.delta?.text || '';
          fullText += text;

          // Call chunk callback if provided
          if (onChunk && typeof onChunk === 'function') {
            onChunk(text);
          }
        } else if (chunk.type === 'message_delta') {
          // Track output tokens and stop reason
          if (chunk.usage) {
            outputTokens = chunk.usage.output_tokens;
          }
          if (chunk.delta?.stop_reason) {
            stopReason = chunk.delta.stop_reason;
          }
        }
      }

      const latency = Date.now() - startTime;

      this.totalInputTokens += inputTokens;
      this.totalOutputTokens += outputTokens;

      console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] [${requestId}] Streaming completed in ${latency}ms - Input tokens: ${inputTokens}, Output tokens: ${outputTokens}, Response length: ${fullText.length}`);

      return {
        text: fullText,
        model: this.model,
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        stopReason: stopReason,
        latencyMs: latency,
        timestamp: new Date().toISOString(),
        requestId,
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      this.totalErrors++;

      console.error(`[${new Date().toISOString()}] [ERROR] [AnthropicService] [${requestId}] Streaming response failed after ${latency}ms`, error);

      throw {
        error: error.message,
        code: error.type || 'STREAMING_ERROR',
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
        console.error(`[${new Date().toISOString()}] [ERROR] [AnthropicService] Max retries (${this.maxRetries}) exceeded`);
        throw error;
      }

      // Don't retry on certain errors (e.g., invalid API key, bad request)
      const nonRetryableCodes = ['invalid_api_key', 'invalid_request_error', 'authentication_error', 'permission_error'];
      if (nonRetryableCodes.includes(error.type)) {
        console.error(`[${new Date().toISOString()}] [ERROR] [AnthropicService] Non-retryable error: ${error.type}`);
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = this.retryDelay * Math.pow(2, attempt - 1);

      console.warn(`[${new Date().toISOString()}] [WARN] [AnthropicService] Attempt ${attempt} failed, retrying in ${delay}ms...`, error.message);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the operation
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  /**
   * Perform health check on Anthropic service
   * Tests API connectivity by making a minimal message request
   * @returns {Promise<Object>} Health check result
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   * @example
   * const health = await anthropicService.healthCheck();
   * console.log(health.healthy); // true/false
   */
  async healthCheck() {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] Running health check`);

      // Make a minimal API call to test connectivity
      await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });

      const latency = Date.now() - startTime;

      console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] Health check passed in ${latency}ms`);

      return {
        healthy: true,
        latencyMs: latency,
        model: this.model,
        totalRequests: this.totalRequests,
        totalInputTokens: this.totalInputTokens,
        totalOutputTokens: this.totalOutputTokens,
        totalErrors: this.totalErrors,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      const latency = Date.now() - startTime;

      console.error(`[${new Date().toISOString()}] [ERROR] [AnthropicService] Health check failed after ${latency}ms`, error);

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
      totalInputTokens: this.totalInputTokens,
      totalOutputTokens: this.totalOutputTokens,
      totalTokens: this.totalInputTokens + this.totalOutputTokens,
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
    console.log(`[${new Date().toISOString()}] [INFO] [AnthropicService] Resetting usage statistics`);
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
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

module.exports = AnthropicService;
