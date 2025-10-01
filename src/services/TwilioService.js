/**
 * @fileoverview Twilio API service wrapper for voice and SMS operations
 * @author LegacyAI Subagent Fleet - Voice Gateway Agent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This service provides a comprehensive wrapper around Twilio API with:
 * - Voice call management (create, update, status)
 * - SMS messaging
 * - Comprehensive error handling
 * - Privacy-focused logging (masked phone numbers)
 * - Health check functionality
 */

const twilio = require('twilio');

/**
 * Twilio Service - Manages all Twilio API interactions
 */
class TwilioService {
  /**
   * Initialize Twilio Service
   * @param {Object} config - Twilio configuration
   * @param {string} config.accountSid - Twilio account SID
   * @param {string} config.authToken - Twilio auth token
   * @param {string} config.phoneNumber - Twilio phone number
   * @param {string} config.webhookUrl - Webhook base URL
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor(config) {
    console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Initializing Twilio Service`);

    // Validate configuration
    if (!config || !config.accountSid || !config.authToken) {
      const error = 'Missing required Twilio configuration: accountSid and authToken';
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] ${error}`);
      throw new Error(error);
    }

    this.config = config;
    this.client = null;
    this.initialized = false;

    console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] TwilioService constructed`);
  }

  /**
   * Initialize Twilio client
   * Must be called before using any service methods
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async initialize() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Initializing Twilio client`);

      // Create Twilio client with credentials
      this.client = twilio(this.config.accountSid, this.config.authToken);

      // Verify credentials by making a test API call
      // We'll check the account details to ensure credentials are valid
      try {
        await this.client.api.accounts(this.config.accountSid).fetch();
        console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Twilio credentials verified`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Invalid Twilio credentials`, error);
        throw new Error('Invalid Twilio credentials: ' + error.message);
      }

      this.initialized = true;
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Twilio client initialized successfully`);

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Initialization failed`, error);
      throw error;
    }
  }

  /**
   * Make outbound phone call
   * @param {string} to - Destination phone number (E.164 format)
   * @param {string} from - Source phone number (E.164 format)
   * @param {string} url - TwiML URL for call handling
   * @param {Object} options - Additional call options
   * @param {boolean} options.record - Record the call
   * @param {number} options.timeout - Timeout in seconds
   * @param {string} options.statusCallback - Status callback URL
   * @returns {Promise<Object>} APIResponse with call details
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await twilioService.makeCall(
   *   '+1234567890',
   *   '+1987654321',
   *   'https://example.com/twiml',
   *   { record: true }
   * );
   */
  async makeCall(to, from, url, options = {}) {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Making outbound call`, {
        to: this.maskPhoneNumber(to),
        from: this.maskPhoneNumber(from),
        url
      });

      // Ensure client is initialized
      if (!this.initialized || !this.client) {
        throw new Error('TwilioService not initialized. Call initialize() first.');
      }

      // Validate phone numbers
      if (!this.isValidE164(to) || !this.isValidE164(from)) {
        throw new Error('Phone numbers must be in E.164 format');
      }

      // Build call parameters
      const callParams = {
        to,
        from,
        url,
        method: 'POST'
      };

      // Add optional parameters
      if (options.record) {
        callParams.record = true;
        callParams.recordingStatusCallback = options.recordingStatusCallback || null;
      }

      if (options.timeout) {
        callParams.timeout = options.timeout;
      }

      if (options.statusCallback) {
        callParams.statusCallback = options.statusCallback;
        callParams.statusCallbackMethod = 'POST';
        callParams.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
      }

      // Make the call via Twilio API
      const call = await this.client.calls.create(callParams);

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Call created successfully`, {
        callSid: call.sid,
        status: call.status,
        durationMs: duration
      });

      return {
        success: true,
        data: {
          sid: call.sid,
          status: call.status,
          to: call.to,
          from: call.from,
          dateCreated: call.dateCreated
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Failed to make call`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Send SMS message
   * @param {string} to - Destination phone number (E.164 format)
   * @param {string} from - Source phone number (E.164 format)
   * @param {string} message - Message body (max 1600 chars)
   * @param {Object} options - Additional SMS options
   * @returns {Promise<Object>} APIResponse with message details
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await twilioService.sendSMS(
   *   '+1234567890',
   *   '+1987654321',
   *   'Hello from AI assistant!'
   * );
   */
  async sendSMS(to, from, message, options = {}) {
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Sending SMS`, {
        to: this.maskPhoneNumber(to),
        from: this.maskPhoneNumber(from),
        messageLength: message.length
      });

      // Ensure client is initialized
      if (!this.initialized || !this.client) {
        throw new Error('TwilioService not initialized. Call initialize() first.');
      }

      // Validate phone numbers
      if (!this.isValidE164(to) || !this.isValidE164(from)) {
        throw new Error('Phone numbers must be in E.164 format');
      }

      // Validate message length (Twilio limit is 1600 chars)
      if (message.length > 1600) {
        throw new Error('Message exceeds maximum length of 1600 characters');
      }

      // Build message parameters
      const messageParams = {
        to,
        from,
        body: message
      };

      // Add optional parameters
      if (options.statusCallback) {
        messageParams.statusCallback = options.statusCallback;
      }

      if (options.mediaUrl) {
        messageParams.mediaUrl = options.mediaUrl;
      }

      // Send the message via Twilio API
      const sms = await this.client.messages.create(messageParams);

      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] SMS sent successfully`, {
        messageSid: sms.sid,
        status: sms.status,
        durationMs: duration
      });

      return {
        success: true,
        data: {
          sid: sms.sid,
          status: sms.status,
          to: sms.to,
          from: sms.from,
          body: sms.body,
          dateCreated: sms.dateCreated
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Failed to send SMS`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Get call status
   * @param {string} callSid - Twilio call SID
   * @returns {Promise<Object>} APIResponse with call status
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const status = await twilioService.getCallStatus('CA123456789');
   */
  async getCallStatus(callSid) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Fetching call status`, {
        callSid
      });

      // Ensure client is initialized
      if (!this.initialized || !this.client) {
        throw new Error('TwilioService not initialized. Call initialize() first.');
      }

      // Validate call SID format
      if (!callSid || !callSid.startsWith('CA')) {
        throw new Error('Invalid call SID format');
      }

      // Fetch call details from Twilio
      const call = await this.client.calls(callSid).fetch();

      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Call status retrieved`, {
        callSid: call.sid,
        status: call.status
      });

      return {
        success: true,
        data: {
          sid: call.sid,
          status: call.status,
          duration: call.duration,
          to: call.to,
          from: call.from,
          startTime: call.startTime,
          endTime: call.endTime,
          price: call.price,
          priceUnit: call.priceUnit
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Failed to get call status`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Update active call
   * Useful for transferring, putting on hold, or terminating calls
   *
   * @param {string} callSid - Twilio call SID
   * @param {Object} options - Update options
   * @param {string} options.url - New TwiML URL
   * @param {string} options.status - New status ('completed' to hangup)
   * @param {string} options.method - HTTP method for URL
   * @returns {Promise<Object>} APIResponse with updated call
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * // Hangup call
   * const result = await twilioService.updateCall('CA123456', {
   *   status: 'completed'
   * });
   *
   * @example
   * // Transfer call
   * const result = await twilioService.updateCall('CA123456', {
   *   url: 'https://example.com/transfer-twiml'
   * });
   */
  async updateCall(callSid, options) {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Updating call`, {
        callSid,
        options
      });

      // Ensure client is initialized
      if (!this.initialized || !this.client) {
        throw new Error('TwilioService not initialized. Call initialize() first.');
      }

      // Validate call SID format
      if (!callSid || !callSid.startsWith('CA')) {
        throw new Error('Invalid call SID format');
      }

      // Build update parameters
      const updateParams = {};

      if (options.url) {
        updateParams.url = options.url;
        updateParams.method = options.method || 'POST';
      }

      if (options.status) {
        updateParams.status = options.status;
      }

      // Update the call via Twilio API
      const call = await this.client.calls(callSid).update(updateParams);

      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Call updated successfully`, {
        callSid: call.sid,
        status: call.status
      });

      return {
        success: true,
        data: {
          sid: call.sid,
          status: call.status,
          to: call.to,
          from: call.from
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Failed to update call`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId()
      };
    }
  }

  /**
   * Health check - verify Twilio service is operational
   * @returns {Promise<Object>} Health status object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async healthCheck() {
    try {
      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Running health check`);

      if (!this.initialized || !this.client) {
        return {
          healthy: false,
          details: {
            initialized: false,
            error: 'Service not initialized'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Try to fetch account details as health check
      const account = await this.client.api.accounts(this.config.accountSid).fetch();

      console.log(`[${new Date().toISOString()}] [INFO] [TwilioService] Health check passed`, {
        accountSid: account.sid,
        status: account.status
      });

      return {
        healthy: true,
        details: {
          initialized: true,
          accountStatus: account.status,
          accountSid: account.sid
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [TwilioService] Health check failed`, error);

      return {
        healthy: false,
        details: {
          error: error.message
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Mask phone number for logging (privacy)
   * Shows format: +1XXX***XXX1234
   * @param {string} phoneNumber - Phone number to mask
   * @returns {string} Masked phone number
   * @created 2025-10-01T12:00:00Z
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 8) {
      return '***';
    }

    // Show first 5 characters (+1XXX) and last 4 digits
    const start = phoneNumber.substring(0, 5);
    const end = phoneNumber.substring(phoneNumber.length - 4);
    const middle = '***';

    return `${start}${middle}${end}`;
  }

  /**
   * Validate E.164 phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} True if valid E.164 format
   * @created 2025-10-01T12:00:00Z
   */
  isValidE164(phoneNumber) {
    // E.164 format: +[country code][subscriber number]
    // Example: +1234567890 (1-15 digits total after +)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Generate unique request ID
   * @returns {string} UUID v4
   * @created 2025-10-01T12:00:00Z
   */
  generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = TwilioService;
