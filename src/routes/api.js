/**
 * @fileoverview REST API endpoints for LegacyAI Voice System
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * This module provides REST API endpoints for:
 * - Conversation retrieval and management
 * - Customer data access
 * - Analytics and reporting
 * - Outbound call initiation
 * - Notification sending
 *
 * All endpoints return JSON in APIResponse format
 */

const express = require('express');
const router = express.Router();

/**
 * Generate unique request ID for tracking
 * @returns {string} UUID v4 string
 * @created 2025-10-01T18:00:00Z
 */
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Create standard API response
 * @param {boolean} success - Operation success status
 * @param {*} data - Response data
 * @param {string|null} error - Error message if failed
 * @param {string} requestId - Unique request ID
 * @returns {Object} APIResponse object
 * @created 2025-10-01T18:00:00Z
 */
function createAPIResponse(success, data, error = null, requestId = null) {
  return {
    success,
    data,
    error,
    timestamp: new Date().toISOString(),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Input validation middleware
 * Validates required fields in request
 * @param {string[]} requiredFields - Array of required field names
 * @returns {Function} Express middleware
 * @created 2025-10-01T18:00:00Z
 */
function validateInput(requiredFields) {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const requestId = generateRequestId();

    // Check which fields are missing
    const missing = requiredFields.filter(field => {
      // Support nested fields like 'body.field'
      const parts = field.split('.');
      let value = req;

      for (const part of parts) {
        if (!value || value[part] === undefined || value[part] === null) {
          return true;
        }
        value = value[part];
      }

      return false;
    });

    if (missing.length > 0) {
      console.error(`[${timestamp}] [ERROR] [api] Validation failed - missing fields: ${missing.join(', ')}`);

      return res.status(400).json(
        createAPIResponse(false, null, `Missing required fields: ${missing.join(', ')}`, requestId)
      );
    }

    // Attach requestId to request for logging
    req.requestId = requestId;
    next();
  };
}

/**
 * Create router with dependencies injected
 * @param {Object} deps - Dependencies
 * @param {Object} deps.agents - AI agents
 * @param {Object} deps.dbService - Database service
 * @param {Object} deps.queueManager - Queue manager
 * @returns {express.Router} Configured Express router
 * @created 2025-10-01T18:00:00Z
 */
function createAPIRouter(deps) {
  const { agents, dbService, queueManager } = deps;

  /**
   * GET /api/conversations/:callSid - Get conversation by call SID
   * Retrieves full conversation transcript and metadata
   *
   * @param {string} req.params.callSid - Twilio call SID
   * @returns {Object} APIResponse with conversation data
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.get('/conversations/:callSid', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const { callSid } = req.params;

    console.log(`[${timestamp}] [INFO] [api/conversations] Get conversation - RequestID: ${requestId}, CallSid: ${callSid}`);

    try {
      // Get conversation from database via ConversationAgent
      const result = await agents.conversation.getConversation(callSid);

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [api/conversations] Successfully retrieved conversation`);
        return res.json(createAPIResponse(true, result.data, null, requestId));
      } else {
        console.error(`[${timestamp}] [ERROR] [api/conversations] Failed to retrieve conversation: ${result.error}`);
        return res.status(404).json(createAPIResponse(false, null, result.error || 'Conversation not found', requestId));
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/conversations] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  /**
   * GET /api/customers/:phone - Get customer by phone number
   * Retrieves customer profile and interaction history
   *
   * @param {string} req.params.phone - Customer phone number
   * @returns {Object} APIResponse with customer data
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.get('/customers/:phone', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const { phone } = req.params;

    console.log(`[${timestamp}] [INFO] [api/customers] Get customer - RequestID: ${requestId}, Phone: ${phone}`);

    try {
      // Get customer from database
      const customer = await dbService.getCustomerByPhone(phone);

      if (customer) {
        console.log(`[${timestamp}] [INFO] [api/customers] Successfully retrieved customer`);

        // Also get recent conversations for this customer
        const conversations = await dbService.getConversationsByPhone(phone, 10); // Last 10 conversations

        return res.json(createAPIResponse(true, {
          customer,
          recentConversations: conversations,
        }, null, requestId));
      } else {
        console.log(`[${timestamp}] [WARN] [api/customers] Customer not found for phone: ${phone}`);
        return res.status(404).json(createAPIResponse(false, null, 'Customer not found', requestId));
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/customers] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  /**
   * GET /api/analytics/daily/:date - Get daily analytics
   * Retrieves aggregated analytics for a specific date
   *
   * @param {string} req.params.date - Date in YYYY-MM-DD format
   * @returns {Object} APIResponse with daily analytics
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.get('/analytics/daily/:date', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const { date } = req.params;

    console.log(`[${timestamp}] [INFO] [api/analytics/daily] Get daily analytics - RequestID: ${requestId}, Date: ${date}`);

    try {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        console.error(`[${timestamp}] [ERROR] [api/analytics/daily] Invalid date format: ${date}`);
        return res.status(400).json(createAPIResponse(false, null, 'Invalid date format. Use YYYY-MM-DD', requestId));
      }

      // Get analytics from AnalyticsAgent
      const result = await agents.analytics.getDailyAnalytics(date);

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [api/analytics/daily] Successfully retrieved daily analytics`);
        return res.json(createAPIResponse(true, result.data, null, requestId));
      } else {
        console.error(`[${timestamp}] [ERROR] [api/analytics/daily] Failed to retrieve analytics: ${result.error}`);
        return res.status(404).json(createAPIResponse(false, null, result.error || 'Analytics not found', requestId));
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/analytics/daily] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  /**
   * GET /api/analytics/trends - Get sentiment trends
   * Retrieves sentiment analysis trends over time
   *
   * @param {string} req.query.startDate - Start date (YYYY-MM-DD)
   * @param {string} req.query.endDate - End date (YYYY-MM-DD)
   * @param {string} req.query.interval - Aggregation interval (day|week|month)
   * @returns {Object} APIResponse with trend data
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.get('/analytics/trends', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const { startDate, endDate, interval = 'day' } = req.query;

    console.log(`[${timestamp}] [INFO] [api/analytics/trends] Get trends - RequestID: ${requestId}`);
    console.log(`[${timestamp}] [DEBUG] [api/analytics/trends] Range: ${startDate} to ${endDate}, Interval: ${interval}`);

    try {
      // Validate query parameters
      if (!startDate || !endDate) {
        console.error(`[${timestamp}] [ERROR] [api/analytics/trends] Missing date parameters`);
        return res.status(400).json(createAPIResponse(false, null, 'startDate and endDate are required', requestId));
      }

      // Validate interval
      const validIntervals = ['day', 'week', 'month'];
      if (!validIntervals.includes(interval)) {
        console.error(`[${timestamp}] [ERROR] [api/analytics/trends] Invalid interval: ${interval}`);
        return res.status(400).json(createAPIResponse(false, null, 'interval must be day, week, or month', requestId));
      }

      // Get trends from AnalyticsAgent
      const result = await agents.analytics.getSentimentTrends({
        startDate,
        endDate,
        interval,
      });

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [api/analytics/trends] Successfully retrieved trends`);
        return res.json(createAPIResponse(true, result.data, null, requestId));
      } else {
        console.error(`[${timestamp}] [ERROR] [api/analytics/trends] Failed to retrieve trends: ${result.error}`);
        return res.status(500).json(createAPIResponse(false, null, result.error || 'Failed to retrieve trends', requestId));
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/analytics/trends] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  /**
   * POST /api/calls/outbound - Initiate outbound call
   * Creates a new outbound call via Twilio
   *
   * @param {Object} req.body - Request body
   * @param {string} req.body.to - Recipient phone number
   * @param {string} req.body.from - Caller phone number (optional, uses default)
   * @param {string} req.body.message - Optional custom message
   * @returns {Object} APIResponse with call SID
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.post('/calls/outbound', validateInput(['body.to']), async (req, res) => {
    const requestId = req.requestId;
    const timestamp = new Date().toISOString();
    const { to, from, message } = req.body;

    console.log(`[${timestamp}] [INFO] [api/calls/outbound] Initiate outbound call - RequestID: ${requestId}, To: ${to}`);

    try {
      // Use VoiceGatewayAgent to make outbound call
      const result = await agents.voice.makeOutboundCall({
        to,
        from, // Optional, will use default from config if not provided
        message,
      });

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [api/calls/outbound] Successfully initiated outbound call`);
        console.log(`[${timestamp}] [INFO] [api/calls/outbound] Call SID: ${result.data.callSid}`);

        // Queue job for outbound call tracking
        try {
          await queueManager.addJob('voice-calls', 'outbound-initiated', {
            callSid: result.data.callSid,
            to,
            from: result.data.from,
            timestamp,
          });
          console.log(`[${timestamp}] [INFO] [api/calls/outbound] Queued tracking job`);
        } catch (queueError) {
          console.error(`[${timestamp}] [ERROR] [api/calls/outbound] Failed to queue tracking:`, queueError);
        }

        return res.status(201).json(createAPIResponse(true, result.data, null, requestId));
      } else {
        console.error(`[${timestamp}] [ERROR] [api/calls/outbound] Failed to initiate call: ${result.error}`);
        return res.status(400).json(createAPIResponse(false, null, result.error || 'Failed to initiate call', requestId));
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/calls/outbound] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  /**
   * POST /api/notifications - Send notification
   * Sends notification via IntegrationAgent (email, SMS, webhook)
   *
   * @param {Object} req.body - Request body
   * @param {string} req.body.type - Notification type (email|sms|webhook)
   * @param {string} req.body.recipient - Recipient (email/phone/URL)
   * @param {string} req.body.message - Notification message
   * @param {Object} req.body.metadata - Additional metadata
   * @returns {Object} APIResponse with delivery status
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.post('/notifications', validateInput(['body.type', 'body.recipient', 'body.message']), async (req, res) => {
    const requestId = req.requestId;
    const timestamp = new Date().toISOString();
    const { type, recipient, message, metadata = {} } = req.body;

    console.log(`[${timestamp}] [INFO] [api/notifications] Send notification - RequestID: ${requestId}`);
    console.log(`[${timestamp}] [DEBUG] [api/notifications] Type: ${type}, Recipient: ${recipient}`);

    try {
      // Validate notification type
      const validTypes = ['email', 'sms', 'webhook'];
      if (!validTypes.includes(type)) {
        console.error(`[${timestamp}] [ERROR] [api/notifications] Invalid notification type: ${type}`);
        return res.status(400).json(createAPIResponse(false, null, 'type must be email, sms, or webhook', requestId));
      }

      // Use IntegrationAgent to send notification
      const result = await agents.integration.sendNotification({
        type,
        recipient,
        message,
        metadata,
      });

      if (result.success) {
        console.log(`[${timestamp}] [INFO] [api/notifications] Successfully sent notification`);

        // Queue job for notification tracking
        try {
          await queueManager.addJob('voice-integrations', 'notification-sent', {
            type,
            recipient,
            deliveryId: result.data.deliveryId,
            timestamp,
          });
          console.log(`[${timestamp}] [INFO] [api/notifications] Queued tracking job`);
        } catch (queueError) {
          console.error(`[${timestamp}] [ERROR] [api/notifications] Failed to queue tracking:`, queueError);
        }

        return res.status(201).json(createAPIResponse(true, result.data, null, requestId));
      } else {
        console.error(`[${timestamp}] [ERROR] [api/notifications] Failed to send notification: ${result.error}`);
        return res.status(400).json(createAPIResponse(false, null, result.error || 'Failed to send notification', requestId));
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/notifications] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  /**
   * GET /api/queue/metrics - Get queue metrics
   * Retrieves current queue status and metrics
   *
   * @returns {Object} APIResponse with queue metrics
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  router.get('/queue/metrics', async (req, res) => {
    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [INFO] [api/queue/metrics] Get queue metrics - RequestID: ${requestId}`);

    try {
      // Get metrics from QueueManager
      const metrics = await queueManager.getMetrics();

      console.log(`[${timestamp}] [INFO] [api/queue/metrics] Successfully retrieved metrics`);
      return res.json(createAPIResponse(true, metrics, null, requestId));
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [api/queue/metrics] Unhandled error:`, error);
      return res.status(500).json(createAPIResponse(false, null, 'Internal server error', requestId));
    }
  });

  return router;
}

/**
 * Export router factory function
 * Must be called with dependencies before mounting
 *
 * @example
 * const apiRouter = require('./routes/api');
 * app.use('/api', apiRouter({ agents, dbService, queueManager }));
 */
module.exports = createAPIRouter;
