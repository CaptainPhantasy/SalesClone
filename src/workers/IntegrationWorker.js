/**
 * @fileoverview Integration processing worker for handling external integration jobs
 * @author LegacyAI Subagent Fleet - Queue Agent
 * @created 2025-10-01T16:00:00Z
 * @lastModified 2025-10-01T16:00:00Z
 *
 * This worker processes:
 * - Webhook delivery jobs
 * - Email sending jobs
 * - Customer data sync jobs
 *
 * Uses IntegrationAgent for all integration operations
 */

const IntegrationAgent = require('../agents/IntegrationAgent');
const DatabaseService = require('../services/DatabaseService');

/**
 * IntegrationWorker class - Processes integration-related queue jobs
 *
 * @class IntegrationWorker
 * @created 2025-10-01T16:00:00Z
 * @lastModified 2025-10-01T16:00:00Z
 */
class IntegrationWorker {
  /**
   * Initialize IntegrationWorker with required services
   *
   * @param {Object} config - Configuration object
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * const integrationWorker = new IntegrationWorker(config);
   * const processor = integrationWorker.getProcessor();
   */
  constructor(config) {
    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Initializing IntegrationWorker`);

    this.config = config;

    // Initialize integration agent and database service
    this.integrationAgent = new IntegrationAgent(config);
    this.dbService = new DatabaseService();

    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] IntegrationWorker initialized`);
  }

  /**
   * Initialize worker and dependencies
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   */
  async initialize() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Initializing worker dependencies`);

      // Initialize integration agent and database
      await this.integrationAgent.initialize();
      await this.dbService.initialize();

      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Worker initialization complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Failed to initialize worker:`, error);
      throw error;
    }
  }

  /**
   * Get the job processor function for BullMQ Worker
   *
   * @returns {Function} Processor function
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   */
  getProcessor() {
    // Return bound processor function to maintain 'this' context
    return this.processJob.bind(this);
  }

  /**
   * Process an integration job based on type
   *
   * @param {Object} job - BullMQ job object
   * @param {Object} job.data - Job data
   * @param {string} job.data.type - Integration type
   * @param {Object} job.data.data - Type-specific data
   * @returns {Promise<Object>} Job result
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   */
  async processJob(job) {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Processing job ${job.id}: ${job.data.type}`);

    try {
      const { type, data } = job.data;

      // Update job progress
      await job.updateProgress(10);

      let result;

      // Route to appropriate handler based on type
      switch (type) {
        case 'webhook_delivery':
          result = await this.processWebhookDelivery(data, job);
          break;

        case 'email_send':
          result = await this.processEmailSend(data, job);
          break;

        case 'customer_sync':
          result = await this.processCustomerSync(data, job);
          break;

        default:
          throw new Error(`Unknown integration type: ${type}`);
      }

      // Update progress to 100%
      await job.updateProgress(100);

      const processingTime = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Job ${job.id} completed in ${processingTime}ms`);

      return {
        success: true,
        result,
        processingTimeMs: processingTime,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Job ${job.id} failed after ${processingTime}ms:`, error);

      // Throw error to trigger retry logic
      throw error;
    }
  }

  /**
   * Process webhook delivery job
   * Delivers webhook payloads to external URLs with retry logic
   *
   * @param {Object} data - Webhook delivery data
   * @param {string} data.url - Webhook URL
   * @param {Object} data.payload - Webhook payload
   * @param {Object} data.headers - Optional custom headers
   * @param {string} data.eventType - Event type (e.g., 'call.ended')
   * @param {Object} job - BullMQ job object
   * @returns {Promise<Object>} Webhook delivery result
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  async processWebhookDelivery(data, job) {
    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Processing webhook delivery to ${data.url}`);

    try {
      const { url, payload, headers, eventType } = data;

      await job.updateProgress(20);

      // Validate webhook URL
      if (!url || !url.startsWith('http')) {
        throw new Error('Invalid webhook URL');
      }

      // Use IntegrationAgent to send webhook
      const webhookResult = await this.integrationAgent.sendWebhook({
        url,
        payload,
        headers,
        eventType,
      });

      await job.updateProgress(80);

      // Log webhook delivery
      await this.logWebhookDelivery(url, eventType, webhookResult);

      await job.updateProgress(95);

      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Webhook delivered successfully to ${url}`);

      return {
        url,
        eventType,
        statusCode: webhookResult.statusCode,
        delivered: webhookResult.success,
        deliveredAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Webhook delivery failed to ${data.url}:`, error);

      // Log failed delivery
      await this.logWebhookDelivery(data.url, data.eventType, {
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process email sending job
   * Sends emails using Mailgun via IntegrationAgent
   *
   * @param {Object} data - Email data
   * @param {string} data.to - Recipient email address
   * @param {string} data.subject - Email subject
   * @param {string} data.text - Plain text content
   * @param {string} data.html - HTML content
   * @param {string} data.templateId - Optional email template ID
   * @param {Object} data.templateData - Template data for rendering
   * @param {Object} job - BullMQ job object
   * @returns {Promise<Object>} Email sending result
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  async processEmailSend(data, job) {
    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Processing email send to ${data.to}`);

    try {
      const { to, subject, text, html, templateId, templateData } = data;

      await job.updateProgress(20);

      // Validate email data
      if (!to || !this.isValidEmail(to)) {
        throw new Error('Invalid recipient email address');
      }

      if (!subject) {
        throw new Error('Email subject is required');
      }

      if (!text && !html && !templateId) {
        throw new Error('Email must have text, html, or templateId');
      }

      await job.updateProgress(40);

      // Use IntegrationAgent to send email
      const emailResult = await this.integrationAgent.sendEmail({
        to,
        subject,
        text,
        html,
        templateId,
        templateData,
      });

      await job.updateProgress(80);

      // Log email send
      await this.logEmailSend(to, subject, emailResult);

      await job.updateProgress(95);

      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Email sent successfully to ${to}`);

      return {
        to,
        subject,
        messageId: emailResult.messageId,
        sent: emailResult.success,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Email send failed to ${data.to}:`, error);

      // Log failed email
      await this.logEmailSend(data.to, data.subject, {
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process customer sync job
   * Syncs customer data with external systems (CRM, etc.)
   *
   * @param {Object} data - Customer sync data
   * @param {string} data.customerId - Customer ID
   * @param {string} data.action - Sync action: 'create', 'update', 'delete'
   * @param {Object} data.customerData - Customer data to sync
   * @param {string} data.externalSystem - External system name (e.g., 'salesforce')
   * @param {Object} job - BullMQ job object
   * @returns {Promise<Object>} Customer sync result
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  async processCustomerSync(data, job) {
    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Processing customer sync for ${data.customerId}`);

    try {
      const { customerId, action, customerData, externalSystem } = data;

      await job.updateProgress(20);

      // Validate sync data
      if (!customerId) {
        throw new Error('Customer ID is required');
      }

      if (!action || !['create', 'update', 'delete'].includes(action)) {
        throw new Error('Invalid sync action. Must be: create, update, or delete');
      }

      await job.updateProgress(40);

      // Get full customer data if not provided
      let fullCustomerData = customerData;
      if (!fullCustomerData) {
        const customer = await this.dbService.getCustomer(customerId);
        if (!customer) {
          throw new Error(`Customer not found: ${customerId}`);
        }
        fullCustomerData = customer;
      }

      await job.updateProgress(60);

      // Use IntegrationAgent to sync customer
      const syncResult = await this.integrationAgent.syncCustomer({
        customerId,
        action,
        customerData: fullCustomerData,
        externalSystem,
      });

      await job.updateProgress(85);

      // Update customer record with sync status
      await this.updateCustomerSyncStatus(customerId, externalSystem, syncResult);

      await job.updateProgress(95);

      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Customer sync completed for ${customerId}`);

      return {
        customerId,
        action,
        externalSystem,
        synced: syncResult.success,
        externalId: syncResult.externalId,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Customer sync failed for ${data.customerId}:`, error);

      // Log failed sync
      await this.updateCustomerSyncStatus(data.customerId, data.externalSystem, {
        success: false,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Validate email address format
   *
   * @param {string} email - Email address to validate
   * @returns {boolean} Whether email is valid
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  isValidEmail(email) {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Log webhook delivery result
   *
   * @param {string} url - Webhook URL
   * @param {string} eventType - Event type
   * @param {Object} result - Delivery result
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  async logWebhookDelivery(url, eventType, result) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Logging webhook delivery: ${url}, ${eventType}, success: ${result.success}`);

      // In a real implementation, this would insert into a webhook_logs table
      // For now, we'll just log to console
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Failed to log webhook delivery:`, error);
      // Don't throw - logging failure shouldn't fail the job
    }
  }

  /**
   * Log email send result
   *
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {Object} result - Send result
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  async logEmailSend(to, subject, result) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Logging email send: ${to}, ${subject}, success: ${result.success}`);

      // In a real implementation, this would insert into an email_logs table
      // For now, we'll just log to console
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Failed to log email send:`, error);
      // Don't throw - logging failure shouldn't fail the job
    }
  }

  /**
   * Update customer sync status in database
   *
   * @param {string} customerId - Customer ID
   * @param {string} externalSystem - External system name
   * @param {Object} result - Sync result
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  async updateCustomerSyncStatus(customerId, externalSystem, result) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Updating customer sync status for ${customerId}`);

      // Update customer metadata with sync status
      await this.dbService.updateCustomer(customerId, {
        metadata: {
          [`${externalSystem}_sync`]: {
            synced: result.success,
            externalId: result.externalId,
            lastSyncAt: new Date().toISOString(),
            error: result.error || null,
          },
        },
      });

      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Customer sync status updated`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Failed to update customer sync status:`, error);
      // Don't throw - status update failure shouldn't fail the job
    }
  }

  /**
   * Graceful shutdown
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   */
  async shutdown() {
    console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Shutting down IntegrationWorker`);

    try {
      // Shutdown integration agent if it has a shutdown method
      if (this.integrationAgent.shutdown) {
        await this.integrationAgent.shutdown();
      }

      console.log(`[${new Date().toISOString()}] [INFO] [IntegrationWorker] Shutdown complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [IntegrationWorker] Error during shutdown:`, error);
      throw error;
    }
  }
}

module.exports = IntegrationWorker;
