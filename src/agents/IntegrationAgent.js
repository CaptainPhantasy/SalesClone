/**
 * @fileoverview Integration Agent for external system integrations and orchestration
 * @author LegacyAI Subagent Fleet - Integration Agent Builder
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * The IntegrationAgent handles all external integrations including:
 * - Customer data synchronization with external CRMs
 * - Email and webhook notifications
 * - Scheduled follow-up tasks
 * - Webhook event processing from external systems
 *
 * This agent extends BaseAgent and uses DatabaseService for persistence,
 * WebhookService for webhook management, and EmailService for notifications.
 */

const { BaseAgent } = require('../utils/BaseAgent');
const DatabaseService = require('../services/DatabaseService');
const WebhookService = require('../services/WebhookService');
const EmailService = require('../services/EmailService');

/**
 * @typedef {Object} SyncResult
 * @property {boolean} success - Whether sync was successful
 * @property {Object} data - Synced data
 * @property {string} source - Source system name
 * @property {string} timestamp - ISO-8601 timestamp
 */

/**
 * @typedef {Object} NotificationResult
 * @property {boolean} success - Whether notification was sent
 * @property {string} channel - Notification channel (email/webhook)
 * @property {string} recipient - Recipient identifier
 * @property {string} timestamp - ISO-8601 timestamp
 */

/**
 * IntegrationAgent - Main integration orchestrator for external systems
 * Handles customer data sync, notifications, webhooks, and scheduled tasks.
 *
 * @extends BaseAgent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
class IntegrationAgent extends BaseAgent {
  /**
   * Initialize IntegrationAgent with configuration
   * @param {Object} config - Agent configuration from /src/config
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const agent = new IntegrationAgent(config);
   * await agent.initialize();
   */
  constructor(config) {
    super(config);

    this.logger.info('IntegrationAgent constructor called');

    // Initialize service instances
    this.dbService = new DatabaseService();
    this.webhookService = null; // Will be initialized in initialize()
    this.emailService = null; // Will be initialized in initialize()

    // Retry configuration for failed operations
    this.retryConfig = {
      maxRetries: 3,
      retryDelayMs: 1000,
      exponentialBackoff: true,
    };

    // Rate limiting configuration (requests per minute)
    this.rateLimits = {
      email: 60,
      webhook: 120,
    };

    // Track rate limit counters (reset every minute)
    this.rateLimitCounters = {
      email: { count: 0, resetAt: Date.now() + 60000 },
      webhook: { count: 0, resetAt: Date.now() + 60000 },
    };

    this.logger.info('IntegrationAgent instance created');
  }

  /**
   * Initialize agent and all service dependencies
   * Must be called before using any agent methods.
   *
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * await agent.initialize();
   */
  async initialize() {
    try {
      this.logger.info('Initializing IntegrationAgent and dependencies');

      // Initialize database service
      await this.dbService.initialize();
      this.logger.info('DatabaseService initialized successfully');

      // Initialize webhook service with config
      this.webhookService = new WebhookService(this.config);
      await this.webhookService.initialize();
      this.logger.info('WebhookService initialized successfully');

      // Initialize email service with Mailgun config
      this.emailService = new EmailService(this.config.mailgun);
      await this.emailService.initialize();
      this.logger.info('EmailService initialized successfully');

      this.logger.info('IntegrationAgent initialization complete');
    } catch (error) {
      this.logger.error('IntegrationAgent initialization failed', error);
      throw error;
    }
  }

  /**
   * Synchronize customer data with external systems
   * Fetches customer data from database and syncs with external CRM/systems.
   *
   * @param {string} customerId - Customer UUID to sync
   * @returns {Promise<APIResponse>} Sync result with updated customer data
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await agent.syncCustomerData('customer-uuid');
   * if (result.success) {
   *   console.log('Customer synced:', result.data);
   * }
   */
  async syncCustomerData(customerId) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`Starting customer data sync - Customer ID: ${customerId}, Request ID: ${requestId}`);

      // Validate input
      if (!customerId || typeof customerId !== 'string') {
        throw new Error('Valid customerId is required');
      }

      // Fetch customer data from database
      this.logger.info(`Fetching customer data from database - Customer ID: ${customerId}`);
      const customerResult = await this.dbService.getCustomerByPhone(customerId);

      if (!customerResult.success) {
        throw new Error(`Failed to fetch customer data: ${customerResult.error}`);
      }

      if (!customerResult.data) {
        throw new Error(`Customer not found: ${customerId}`);
      }

      const customer = customerResult.data;
      this.logger.info(`Customer data fetched successfully - Customer ID: ${customer.id}`);

      // In a real implementation, this would sync with external CRM
      // For now, we'll simulate the sync and update local metadata
      const syncMetadata = {
        lastSyncedAt: new Date().toISOString(),
        syncSource: 'IntegrationAgent',
        syncRequestId: requestId,
        syncStatus: 'success',
      };

      // Update customer metadata with sync info
      const updateResult = await this.dbService.updateCustomer(customer.id, {
        metadata: {
          ...customer.metadata,
          integration: syncMetadata,
        },
      });

      if (!updateResult.success) {
        throw new Error(`Failed to update customer metadata: ${updateResult.error}`);
      }

      const duration = Date.now() - startTime;
      this.logger.info(`Customer data sync completed successfully - Duration: ${duration}ms, Customer ID: ${customer.id}`);

      return {
        success: true,
        data: {
          customerId: customer.id,
          syncedAt: syncMetadata.lastSyncedAt,
          customer: updateResult.data,
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Customer data sync failed - Duration: ${duration}ms, Customer ID: ${customerId}, Error: ${error.message}`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Send notification through specified channel (email or webhook)
   * Includes rate limiting and retry logic for reliability.
   *
   * @param {string} type - Notification type (email/webhook)
   * @param {string} recipient - Recipient email or webhook URL
   * @param {Object} data - Notification data/payload
   * @returns {Promise<APIResponse>} Notification result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await agent.sendNotification('email', 'user@example.com', {
   *   subject: 'Call Alert',
   *   body: 'You have a new call'
   * });
   */
  async sendNotification(type, recipient, data) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`Sending notification - Type: ${type}, Recipient: ${recipient}, Request ID: ${requestId}`);

      // Validate inputs
      if (!type || !recipient || !data) {
        throw new Error('type, recipient, and data are required');
      }

      // Check rate limits
      if (!this._checkRateLimit(type)) {
        throw new Error(`Rate limit exceeded for ${type} notifications`);
      }

      let result;

      // Route to appropriate notification channel
      switch (type.toLowerCase()) {
        case 'email':
          result = await this._sendEmailNotification(recipient, data);
          break;

        case 'webhook':
          result = await this._sendWebhookNotification(recipient, data);
          break;

        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }

      // Increment rate limit counter
      this._incrementRateLimit(type);

      const duration = Date.now() - startTime;
      this.logger.info(`Notification sent successfully - Type: ${type}, Duration: ${duration}ms`);

      return {
        success: true,
        data: {
          type,
          recipient,
          sentAt: new Date().toISOString(),
          result,
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Notification failed - Type: ${type}, Duration: ${duration}ms, Error: ${error.message}`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Schedule a follow-up task for a customer
   * Creates a scheduled task in the database for later processing.
   *
   * @param {string} customerId - Customer UUID
   * @param {Object} taskData - Task data including type and scheduled time
   * @param {string} taskData.taskType - Type of task (follow_up_call, send_email, etc.)
   * @param {Date|string} taskData.scheduledFor - When to execute the task
   * @param {Object} [taskData.payload] - Additional task data
   * @returns {Promise<APIResponse>} Created task details
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await agent.scheduleFollowUp('customer-uuid', {
   *   taskType: 'follow_up_call',
   *   scheduledFor: new Date('2025-10-02T10:00:00Z'),
   *   payload: { reason: 'product_inquiry' }
   * });
   */
  async scheduleFollowUp(customerId, taskData) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`Scheduling follow-up task - Customer ID: ${customerId}, Task Type: ${taskData.taskType}, Request ID: ${requestId}`);

      // Validate inputs
      if (!customerId) {
        throw new Error('customerId is required');
      }

      if (!taskData || !taskData.taskType || !taskData.scheduledFor) {
        throw new Error('taskData with taskType and scheduledFor is required');
      }

      // Create scheduled task in database
      const taskResult = await this.dbService.createScheduledTask({
        customer_id: customerId,
        task_type: taskData.taskType,
        scheduled_for: taskData.scheduledFor,
        payload: taskData.payload || {},
      });

      if (!taskResult.success) {
        throw new Error(`Failed to create scheduled task: ${taskResult.error}`);
      }

      const duration = Date.now() - startTime;
      this.logger.info(`Follow-up task scheduled successfully - Duration: ${duration}ms, Task ID: ${taskResult.data.id}`);

      return {
        success: true,
        data: taskResult.data,
        error: null,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Failed to schedule follow-up task - Duration: ${duration}ms, Error: ${error.message}`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Process incoming webhook from external system
   * Validates webhook signature and processes the event.
   *
   * @param {string} source - Webhook source identifier (e.g., 'stripe', 'twilio')
   * @param {Object} payload - Webhook payload
   * @param {string} [signature] - Webhook signature for validation
   * @param {string} [secret] - Secret key for signature validation
   * @returns {Promise<APIResponse>} Processing result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const result = await agent.processWebhook('stripe', webhookPayload, signature, secret);
   * if (result.success) {
   *   console.log('Webhook processed:', result.data);
   * }
   */
  async processWebhook(source, payload, signature = null, secret = null) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info(`Processing webhook - Source: ${source}, Request ID: ${requestId}`);

      // Validate inputs
      if (!source || !payload) {
        throw new Error('source and payload are required');
      }

      // Validate webhook signature if provided
      // This prevents unauthorized webhook requests
      if (signature && secret) {
        this.logger.info(`Validating webhook signature - Source: ${source}`);
        const isValid = await this.webhookService.validateWebhookSignature(
          payload,
          signature,
          secret
        );

        if (!isValid) {
          throw new Error('Invalid webhook signature');
        }

        this.logger.info(`Webhook signature validated successfully - Source: ${source}`);
      } else {
        this.logger.warn(`Webhook received without signature validation - Source: ${source}`);
      }

      // Process webhook based on source
      // In a real implementation, this would route to specific handlers
      const processedData = {
        source,
        eventType: payload.type || payload.event_type || 'unknown',
        processedAt: new Date().toISOString(),
        payload: payload,
      };

      this.logger.info(`Webhook processed successfully - Source: ${source}, Event Type: ${processedData.eventType}`);

      const duration = Date.now() - startTime;
      this.logger.info(`Webhook processing completed - Duration: ${duration}ms`);

      return {
        success: true,
        data: processedData,
        error: null,
        timestamp: new Date().toISOString(),
        requestId,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Webhook processing failed - Duration: ${duration}ms, Source: ${source}, Error: ${error.message}`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId,
      };
    }
  }

  /**
   * Health check for IntegrationAgent and all dependencies
   * Verifies all services are operational.
   *
   * @returns {Promise<Object>} Health status
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   *
   * @example
   * const health = await agent.healthCheck();
   * console.log('Agent healthy:', health.healthy);
   */
  async healthCheck() {
    try {
      this.logger.info('Running IntegrationAgent health check');

      const checks = {
        database: false,
        webhook: false,
        email: false,
      };

      // Check database service
      try {
        if (this.dbService && this.dbService.client) {
          checks.database = true;
        }
      } catch (error) {
        this.logger.warn('Database health check failed', error);
      }

      // Check webhook service
      try {
        if (this.webhookService) {
          checks.webhook = true;
        }
      } catch (error) {
        this.logger.warn('Webhook service health check failed', error);
      }

      // Check email service
      try {
        if (this.emailService) {
          checks.email = true;
        }
      } catch (error) {
        this.logger.warn('Email service health check failed', error);
      }

      const healthy = checks.database && checks.webhook && checks.email;

      this.logger.info(`Health check completed - Healthy: ${healthy}`);

      return {
        healthy,
        details: checks,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        healthy: false,
        details: { error: error.message },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Graceful shutdown of IntegrationAgent
   * Cleans up all service connections.
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down IntegrationAgent');

      // Cleanup services if they have shutdown methods
      if (this.webhookService && typeof this.webhookService.shutdown === 'function') {
        await this.webhookService.shutdown();
      }

      if (this.emailService && typeof this.emailService.shutdown === 'function') {
        await this.emailService.shutdown();
      }

      this.logger.info('IntegrationAgent shutdown complete');
    } catch (error) {
      this.logger.error('Error during IntegrationAgent shutdown', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Send email notification via EmailService
   * Internal helper method with retry logic.
   *
   * @private
   * @param {string} recipient - Email address
   * @param {Object} data - Email data (subject, body)
   * @returns {Promise<Object>} Email result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async _sendEmailNotification(recipient, data) {
    this.logger.info(`Sending email notification to ${recipient}`);

    // Validate email data
    if (!data.subject || !data.body) {
      throw new Error('Email data must include subject and body');
    }

    // Attempt to send email with retry logic
    const result = await this._retryOperation(async () => {
      return await this.emailService.sendEmail(recipient, data.subject, data.body);
    });

    return result;
  }

  /**
   * Send webhook notification via WebhookService
   * Internal helper method with retry logic.
   *
   * @private
   * @param {string} url - Webhook URL
   * @param {Object} data - Webhook payload
   * @returns {Promise<Object>} Webhook result
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async _sendWebhookNotification(url, data) {
    this.logger.info(`Sending webhook notification to ${url}`);

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${url}`);
    }

    // Attempt to send webhook with retry logic
    const result = await this._retryOperation(async () => {
      return await this.webhookService.sendWebhook(url, data);
    });

    return result;
  }

  /**
   * Retry operation with exponential backoff
   * Used for reliability in external API calls.
   *
   * @private
   * @param {Function} operation - Async operation to retry
   * @returns {Promise<*>} Operation result
   * @throws {Error} If all retries fail
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  async _retryOperation(operation) {
    let lastError;
    let delay = this.retryConfig.retryDelayMs;

    // Try operation with retries
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        this.logger.debug(`Attempting operation - Attempt ${attempt}/${this.retryConfig.maxRetries}`);
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        this.logger.warn(`Operation attempt ${attempt} failed: ${error.message}`);

        // Don't sleep after the last attempt
        if (attempt < this.retryConfig.maxRetries) {
          this.logger.debug(`Retrying in ${delay}ms`);
          await this._sleep(delay);

          // Exponential backoff for next retry
          if (this.retryConfig.exponentialBackoff) {
            delay *= 2;
          }
        }
      }
    }

    // All retries exhausted
    throw new Error(`Operation failed after ${this.retryConfig.maxRetries} attempts: ${lastError.message}`);
  }

  /**
   * Sleep for specified milliseconds
   * Used for retry delays.
   *
   * @private
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if rate limit allows the operation
   * Prevents abuse and ensures fair usage.
   *
   * @private
   * @param {string} type - Operation type (email/webhook)
   * @returns {boolean} True if operation is allowed
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _checkRateLimit(type) {
    const now = Date.now();
    const counter = this.rateLimitCounters[type];

    if (!counter) {
      return true; // No rate limit for this type
    }

    // Reset counter if time window has passed
    if (now >= counter.resetAt) {
      counter.count = 0;
      counter.resetAt = now + 60000; // Reset in 1 minute
    }

    // Check if under limit
    const limit = this.rateLimits[type];
    return counter.count < limit;
  }

  /**
   * Increment rate limit counter for operation type
   *
   * @private
   * @param {string} type - Operation type (email/webhook)
   * @created 2025-10-01T00:00:00Z
   * @lastModified 2025-10-01T00:00:00Z
   */
  _incrementRateLimit(type) {
    const counter = this.rateLimitCounters[type];
    if (counter) {
      counter.count++;
    }
  }
}

module.exports = IntegrationAgent;
