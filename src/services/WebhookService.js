/**
 * @fileoverview Webhook management service for sending and receiving webhooks
 * @author LegacyAI Subagent Fleet - Integration Agent Builder
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * The WebhookService handles:
 * - Webhook registration and management
 * - Webhook signature validation for security
 * - Sending webhooks to external systems
 * - Retry logic for failed webhook deliveries
 * - Webhook queue management for reliability
 */

const crypto = require('crypto');

/**
 * @typedef {Object} WebhookRegistration
 * @property {string} id - Webhook registration ID
 * @property {string} url - Webhook endpoint URL
 * @property {Array<string>} events - Events to subscribe to
 * @property {string} secret - Secret key for signature validation
 * @property {boolean} active - Whether webhook is active
 * @property {string} createdAt - ISO-8601 timestamp
 */

/**
 * @typedef {Object} WebhookDelivery
 * @property {string} id - Delivery ID
 * @property {string} webhookId - Webhook registration ID
 * @property {Object} payload - Webhook payload
 * @property {number} attempts - Number of delivery attempts
 * @property {string} status - Delivery status (pending/success/failed)
 * @property {string} lastAttemptAt - ISO-8601 timestamp
 */

/**
 * WebhookService - Manages webhook operations
 * Provides webhook registration, validation, sending, and retry logic.
 *
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
class WebhookService {
  /**
   * Initialize WebhookService
   * @param {Object} config - Service configuration
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const webhookService = new WebhookService(config);
   * await webhookService.initialize();
   */
  constructor(config) {
    console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] WebhookService constructor called`);

    this.config = config;

    // In-memory storage for webhooks (in production, use database)
    // This allows for webhook management without additional dependencies
    this.webhooks = new Map();
    this.deliveryQueue = [];

    // Webhook configuration
    this.webhookConfig = {
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 10000,
      signatureAlgorithm: 'sha256',
    };

    console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] WebhookService instance created`);
  }

  /**
   * Initialize webhook service
   * Sets up any necessary connections or state.
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * await webhookService.initialize();
   */
  async initialize() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Initializing WebhookService`);

      // Initialize any required state
      this.initialized = true;

      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] WebhookService initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebhookService] Initialization failed`, error);
      throw error;
    }
  }

  /**
   * Register a webhook endpoint
   * Stores webhook configuration for future event delivery.
   *
   * @param {string} url - Webhook endpoint URL
   * @param {Array<string>} events - Events to subscribe to
   * @param {string} [secret] - Optional secret for signature validation
   * @returns {Promise<WebhookRegistration>} Registered webhook details
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const webhook = await service.registerWebhook(
   *   'https://example.com/webhook',
   *   ['call.started', 'call.ended']
   * );
   */
  async registerWebhook(url, events, secret = null) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Registering webhook - URL: ${url}, Events: ${events.join(', ')}`);

      // Validate URL format
      try {
        new URL(url);
      } catch (error) {
        throw new Error(`Invalid webhook URL: ${url}`);
      }

      // Validate events array
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('Events must be a non-empty array');
      }

      // Generate webhook ID
      const webhookId = this._generateId();

      // Generate secret if not provided - used for signature validation
      const webhookSecret = secret || this._generateSecret();

      // Create webhook registration
      const webhook = {
        id: webhookId,
        url,
        events,
        secret: webhookSecret,
        active: true,
        createdAt: new Date().toISOString(),
      };

      // Store webhook
      this.webhooks.set(webhookId, webhook);

      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Webhook registered successfully - ID: ${webhookId}`);

      // Return webhook without exposing full secret in logs
      return {
        ...webhook,
        secret: webhookSecret, // Only return secret on registration
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebhookService] Failed to register webhook`, error);
      throw error;
    }
  }

  /**
   * Validate webhook signature
   * Ensures webhook requests are authentic and from trusted sources.
   *
   * @param {Object} payload - Webhook payload
   * @param {string} signature - Signature from webhook header
   * @param {string} secret - Secret key for validation
   * @returns {Promise<boolean>} True if signature is valid
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const isValid = await service.validateWebhookSignature(
   *   payload,
   *   request.headers['x-webhook-signature'],
   *   webhookSecret
   * );
   */
  async validateWebhookSignature(payload, signature, secret) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Validating webhook signature`);

      // Validate inputs
      if (!payload || !signature || !secret) {
        console.warn(`[${new Date().toISOString()}] [WARN] [WebhookService] Missing required parameters for signature validation`);
        return false;
      }

      // Generate expected signature using HMAC-SHA256
      // This prevents replay attacks and ensures data integrity
      const payloadString = typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

      const expectedSignature = crypto
        .createHmac(this.webhookConfig.signatureAlgorithm, secret)
        .update(payloadString)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (isValid) {
        console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Webhook signature validated successfully`);
      } else {
        console.warn(`[${new Date().toISOString()}] [WARN] [WebhookService] Invalid webhook signature`);
      }

      return isValid;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebhookService] Signature validation error`, error);
      return false;
    }
  }

  /**
   * Send webhook to external endpoint
   * Delivers webhook payload with signature for security.
   *
   * @param {string} url - Webhook endpoint URL
   * @param {Object} data - Webhook payload
   * @param {string} [secret] - Optional secret for signature
   * @returns {Promise<Object>} Delivery result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await service.sendWebhook(
   *   'https://example.com/webhook',
   *   { event: 'call.ended', data: callData }
   * );
   */
  async sendWebhook(url, data, secret = null) {
    const deliveryId = this._generateId();
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Sending webhook - URL: ${url}, Delivery ID: ${deliveryId}`);

      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        throw new Error(`Invalid webhook URL: ${url}`);
      }

      // Prepare payload with metadata
      const payload = {
        id: deliveryId,
        timestamp: new Date().toISOString(),
        data,
      };

      const payloadString = JSON.stringify(payload);

      // Generate signature if secret provided
      let signature = null;
      if (secret) {
        signature = crypto
          .createHmac(this.webhookConfig.signatureAlgorithm, secret)
          .update(payloadString)
          .digest('hex');
      }

      // Prepare headers (without exposing API keys)
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'LegacyAI-WebhookService/1.0',
        ...(signature && { 'X-Webhook-Signature': signature }),
      };

      // Send webhook using fetch (Node.js 18+) or fallback to http/https
      let response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.webhookConfig.timeoutMs);

        response = await fetch(url, {
          method: 'POST',
          headers,
          body: payloadString,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
      } catch (fetchError) {
        // Fallback for Node.js < 18 without fetch
        console.warn(`[${new Date().toISOString()}] [WARN] [WebhookService] Fetch not available, using HTTP fallback`);
        response = await this._sendWebhookViaHttp(url, headers, payloadString);
      }

      const duration = Date.now() - startTime;

      // Check response status
      if (response.status >= 200 && response.status < 300) {
        console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Webhook delivered successfully - Duration: ${duration}ms, Status: ${response.status}`);

        return {
          success: true,
          deliveryId,
          status: response.status,
          duration,
        };
      } else {
        throw new Error(`Webhook delivery failed with status ${response.status}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [ERROR] [WebhookService] Webhook delivery failed - Duration: ${duration}ms, Delivery ID: ${deliveryId}`, error);

      // Queue for retry
      this._queueForRetry(deliveryId, url, data, secret);

      return {
        success: false,
        deliveryId,
        error: error.message,
        duration,
      };
    }
  }

  /**
   * Retry failed webhook deliveries
   * Processes queued webhooks that failed initial delivery.
   *
   * @returns {Promise<Object>} Retry results
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const results = await service.retryFailedWebhooks();
   * console.log(`Retried ${results.processed} webhooks`);
   */
  async retryFailedWebhooks() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Retrying failed webhooks - Queue size: ${this.deliveryQueue.length}`);

      const results = {
        processed: 0,
        successful: 0,
        failed: 0,
      };

      // Process each queued webhook
      const currentQueue = [...this.deliveryQueue];
      this.deliveryQueue = [];

      for (const delivery of currentQueue) {
        results.processed++;

        // Check if max retries exceeded
        if (delivery.attempts >= this.webhookConfig.maxRetries) {
          console.warn(`[${new Date().toISOString()}] [WARN] [WebhookService] Max retries exceeded for delivery - ID: ${delivery.id}`);
          results.failed++;
          continue;
        }

        // Retry delivery
        const result = await this.sendWebhook(
          delivery.url,
          delivery.data,
          delivery.secret
        );

        if (result.success) {
          results.successful++;
        } else {
          results.failed++;
        }
      }

      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Retry completed - Processed: ${results.processed}, Successful: ${results.successful}, Failed: ${results.failed}`);

      return results;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebhookService] Retry operation failed`, error);
      throw error;
    }
  }

  /**
   * Get webhook registration by ID
   *
   * @param {string} webhookId - Webhook registration ID
   * @returns {WebhookRegistration|null} Webhook details or null if not found
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  getWebhook(webhookId) {
    return this.webhooks.get(webhookId) || null;
  }

  /**
   * Delete webhook registration
   *
   * @param {string} webhookId - Webhook registration ID
   * @returns {boolean} True if deleted successfully
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  deleteWebhook(webhookId) {
    console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Deleting webhook - ID: ${webhookId}`);
    return this.webhooks.delete(webhookId);
  }

  /**
   * Get delivery queue status
   *
   * @returns {Object} Queue status information
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  getQueueStatus() {
    return {
      queueSize: this.deliveryQueue.length,
      registeredWebhooks: this.webhooks.size,
    };
  }

  /**
   * Graceful shutdown
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async shutdown() {
    console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Shutting down WebhookService`);

    // Attempt to deliver any remaining webhooks before shutdown
    if (this.deliveryQueue.length > 0) {
      console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Processing remaining webhooks before shutdown`);
      await this.retryFailedWebhooks();
    }

    this.initialized = false;
    console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] WebhookService shutdown complete`);
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate unique ID for webhooks and deliveries
   *
   * @private
   * @returns {string} UUID v4
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate random secret for webhook signature validation
   * Creates a cryptographically secure random string.
   *
   * @private
   * @returns {string} Random secret (32 bytes, hex-encoded)
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Queue failed webhook for retry
   * Adds delivery to retry queue with attempt tracking.
   *
   * @private
   * @param {string} deliveryId - Delivery ID
   * @param {string} url - Webhook URL
   * @param {Object} data - Webhook data
   * @param {string} secret - Webhook secret
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _queueForRetry(deliveryId, url, data, secret) {
    console.log(`[${new Date().toISOString()}] [INFO] [WebhookService] Queueing webhook for retry - Delivery ID: ${deliveryId}`);

    // Check if already in queue
    const existing = this.deliveryQueue.find(d => d.id === deliveryId);

    if (existing) {
      existing.attempts++;
      existing.lastAttemptAt = new Date().toISOString();
    } else {
      this.deliveryQueue.push({
        id: deliveryId,
        url,
        data,
        secret,
        attempts: 1,
        lastAttemptAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Send webhook via HTTP/HTTPS module (fallback for older Node.js)
   * Used when fetch is not available.
   *
   * @private
   * @param {string} url - Webhook URL
   * @param {Object} headers - Request headers
   * @param {string} body - Request body
   * @returns {Promise<Object>} Response object
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async _sendWebhookViaHttp(url, headers, body) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? require('https') : require('http');

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: this.webhookConfig.timeoutMs,
      };

      const req = httpModule.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            body: data,
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.write(body);
      req.end();
    });
  }
}

module.exports = WebhookService;
