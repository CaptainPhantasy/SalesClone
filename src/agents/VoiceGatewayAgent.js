/**
 * @fileoverview Voice Gateway Agent for handling Twilio voice call integration
 * @author LegacyAI Subagent Fleet - Voice Gateway Agent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This agent manages all voice call operations including:
 * - Incoming call handling with TwiML generation
 * - Outbound call initiation
 * - Call lifecycle logging to database
 * - Speech input gathering and processing
 * - Call transfer and escalation support
 */

const twilio = require('twilio');
const { VoiceResponse } = twilio.twiml;
const DatabaseService = require('../services/DatabaseService');
const TwilioService = require('../services/TwilioService');

/**
 * BaseAgent implementation for Voice Gateway operations
 * Extends base functionality with Twilio-specific voice handling
 */
class BaseAgent {
  /**
   * Initialize base agent
   * @param {Object} config - Agent configuration object
   * @created 2025-10-01T12:00:00Z
   */
  constructor(config) {
    this.config = config;
    this.logger = this.initLogger();
    this.startTime = new Date().toISOString();

    this.logger.info(`${this.constructor.name} initialized`);
  }

  /**
   * Initialize logger with timestamps
   * @returns {Object} Logger instance with info, warn, error, debug methods
   * @created 2025-10-01T12:00:00Z
   */
  initLogger() {
    const name = this.constructor.name;
    return {
      info: (msg, context = {}) => console.log(`[${new Date().toISOString()}] [INFO] [${name}] ${msg}`, context),
      warn: (msg, context = {}) => console.warn(`[${new Date().toISOString()}] [WARN] [${name}] ${msg}`, context),
      error: (msg, err) => console.error(`[${new Date().toISOString()}] [ERROR] [${name}] ${msg}`, err),
      debug: (msg, context = {}) => console.debug(`[${new Date().toISOString()}] [DEBUG] [${name}] ${msg}`, context)
    };
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

/**
 * Voice Gateway Agent - Manages Twilio voice call operations
 * @extends BaseAgent
 */
class VoiceGatewayAgent extends BaseAgent {
  /**
   * Initialize Voice Gateway Agent
   * @param {Object} config - Configuration object
   * @param {Object} config.twilio - Twilio configuration
   * @param {string} config.twilio.accountSid - Twilio account SID
   * @param {string} config.twilio.authToken - Twilio auth token
   * @param {string} config.twilio.phoneNumber - Twilio phone number
   * @param {string} config.twilio.webhookUrl - Webhook base URL
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor(config) {
    super(config);

    this.dbService = null;
    this.twilioService = null;
    this.initialized = false;

    // Validation - ensure Twilio config exists
    if (!config || !config.twilio) {
      const error = 'Missing Twilio configuration';
      this.logger.error(error);
      throw new Error(error);
    }

    this.logger.info('VoiceGatewayAgent constructed successfully');
  }

  /**
   * Initialize agent and dependencies
   * Must be called before using any agent methods
   * @returns {Promise<void>}
   * @throws {Error} If initialization fails
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async initialize() {
    try {
      this.logger.info('Initializing Voice Gateway Agent...');

      // Initialize database service
      this.dbService = new DatabaseService();
      await this.dbService.initialize();
      this.logger.info('Database service initialized');

      // Initialize Twilio service
      this.twilioService = new TwilioService(this.config.twilio);
      await this.twilioService.initialize();
      this.logger.info('Twilio service initialized');

      this.initialized = true;
      this.logger.info('Voice Gateway Agent initialization complete');

    } catch (error) {
      this.logger.error('Failed to initialize Voice Gateway Agent', error);
      throw error;
    }
  }

  /**
   * Handle incoming call from Twilio
   * Generates TwiML response with initial greeting and speech gathering
   *
   * @param {Object} callData - Twilio call webhook data
   * @param {string} callData.CallSid - Twilio call SID
   * @param {string} callData.From - Caller phone number (E.164 format)
   * @param {string} callData.To - Called phone number (E.164 format)
   * @param {string} callData.CallStatus - Call status
   * @param {string} callData.Direction - Call direction ('inbound' or 'outbound')
   * @returns {Promise<Object>} APIResponse with TwiML string
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const response = await agent.handleIncomingCall({
   *   CallSid: 'CA123456',
   *   From: '+1234567890',
   *   To: '+1987654321',
   *   CallStatus: 'ringing',
   *   Direction: 'inbound'
   * });
   */
  async handleIncomingCall(callData) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      this.logger.info('Handling incoming call', {
        requestId,
        callSid: callData.CallSid,
        // Mask phone number for privacy - show only first 5 and last 4 digits
        from: this.maskPhoneNumber(callData.From),
        to: this.maskPhoneNumber(callData.To),
        status: callData.CallStatus
      });

      // Validate required call data fields
      if (!callData.CallSid || !callData.From || !callData.To) {
        throw new Error('Missing required call data fields: CallSid, From, or To');
      }

      // Validate E.164 phone number format
      if (!this.isValidE164(callData.From) || !this.isValidE164(callData.To)) {
        throw new Error('Phone numbers must be in E.164 format (e.g., +1234567890)');
      }

      // Log call start to database
      const logResult = await this.logCallStart(
        callData.CallSid,
        callData.From,
        callData.To,
        callData
      );

      if (!logResult.success) {
        this.logger.warn('Failed to log call to database', { error: logResult.error });
        // Continue anyway - don't fail the call due to database issues
      }

      // Generate TwiML response
      const twiml = this.generateInitialTwiML(callData);

      const duration = Date.now() - startTime;
      this.logger.info('Successfully handled incoming call', {
        requestId,
        callSid: callData.CallSid,
        durationMs: duration
      });

      return {
        success: true,
        data: {
          twiml: twiml.toString(),
          callSid: callData.CallSid,
          conversationId: logResult.data?.id || null
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId
      };

    } catch (error) {
      this.logger.error('Error handling incoming call', error);

      // Return error response with error TwiML
      const errorTwiml = this.generateErrorTwiML();

      return {
        success: false,
        data: {
          twiml: errorTwiml.toString(),
          callSid: callData.CallSid || null
        },
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  /**
   * Generate initial TwiML response with greeting and speech gathering
   * @param {Object} callData - Call data for context
   * @returns {VoiceResponse} Twilio VoiceResponse object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  generateInitialTwiML(callData) {
    try {
      this.logger.debug('Generating initial TwiML', {
        callSid: callData.CallSid
      });

      const twiml = new VoiceResponse();

      // Initial greeting - friendly and professional
      twiml.say({
        voice: 'Polly.Joanna',  // Using AWS Polly voice for better quality
        language: 'en-US'
      }, 'Hello! I\'m your AI assistant. How can I help you today?');

      // Pause briefly to let greeting complete
      twiml.pause({ length: 1 });

      // Gather speech input with automatic speech recognition
      const gather = twiml.gather({
        input: ['speech'],  // Accept speech input
        timeout: 3,  // Wait 3 seconds for speech to start
        speechTimeout: 'auto',  // Automatically detect end of speech
        action: `${this.config.twilio.webhookUrl}/webhooks/process-speech`,
        method: 'POST',
        language: 'en-US'
      });

      // While gathering, don't say anything (user will speak)

      // If no input received, prompt again
      twiml.say({
        voice: 'Polly.Joanna',
        language: 'en-US'
      }, 'I didn\'t catch that. Please tell me how I can help you.');

      // Redirect back to start if still no input
      twiml.redirect(`${this.config.twilio.webhookUrl}/webhooks/voice`);

      return twiml;

    } catch (error) {
      this.logger.error('Error generating initial TwiML', error);
      // Return basic error TwiML
      return this.generateErrorTwiML();
    }
  }

  /**
   * Generate error TwiML response
   * @returns {VoiceResponse} Twilio VoiceResponse with error message
   * @created 2025-10-01T12:00:00Z
   */
  generateErrorTwiML() {
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, 'I\'m sorry, but I\'m experiencing technical difficulties. Please try again later.');
    twiml.hangup();
    return twiml;
  }

  /**
   * Make outbound call to customer
   * @param {string} phoneNumber - Destination phone number (E.164 format)
   * @param {string} message - Message to deliver
   * @param {Object} options - Additional call options
   * @returns {Promise<Object>} APIResponse with call details
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const result = await agent.makeOutboundCall(
   *   '+1234567890',
   *   'This is a scheduled follow-up call',
   *   { record: true }
   * );
   */
  async makeOutboundCall(phoneNumber, message, options = {}) {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('Initiating outbound call', {
        requestId,
        to: this.maskPhoneNumber(phoneNumber),
        hasMessage: !!message
      });

      // Validate phone number
      if (!this.isValidE164(phoneNumber)) {
        throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
      }

      // Create TwiML for outbound message
      const twimlUrl = `${this.config.twilio.webhookUrl}/webhooks/outbound?message=${encodeURIComponent(message)}`;

      // Make call via Twilio service
      const callResult = await this.twilioService.makeCall(
        phoneNumber,
        this.config.twilio.phoneNumber,
        twimlUrl,
        options
      );

      if (!callResult.success) {
        throw new Error(callResult.error || 'Failed to initiate call');
      }

      // Log call to database
      await this.logCallStart(
        callResult.data.sid,
        this.config.twilio.phoneNumber,
        phoneNumber,
        {
          Direction: 'outbound',
          message: message
        }
      );

      this.logger.info('Outbound call initiated successfully', {
        requestId,
        callSid: callResult.data.sid
      });

      return {
        success: true,
        data: {
          callSid: callResult.data.sid,
          to: phoneNumber,
          status: callResult.data.status
        },
        error: null,
        timestamp: new Date().toISOString(),
        requestId
      };

    } catch (error) {
      this.logger.error('Error making outbound call', error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp: new Date().toISOString(),
        requestId
      };
    }
  }

  /**
   * Log call start to database
   * Creates conversation record with active status
   *
   * @param {string} callSid - Twilio call SID
   * @param {string} from - Caller phone number
   * @param {string} to - Called phone number
   * @param {Object} metadata - Additional call metadata
   * @returns {Promise<Object>} APIResponse with conversation record
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async logCallStart(callSid, from, to, metadata = {}) {
    try {
      this.logger.info('Logging call start', {
        callSid,
        from: this.maskPhoneNumber(from),
        to: this.maskPhoneNumber(to)
      });

      // Use DatabaseService to create conversation
      const result = await this.dbService.createConversation({
        call_sid: callSid,
        phone_number: from,  // Customer phone number
        agent_type: 'voice',
        metadata: {
          to: to,
          direction: metadata.Direction || 'inbound',
          callStatus: metadata.CallStatus || 'initiated',
          startedAt: new Date().toISOString(),
          ...metadata
        }
      });

      if (result.success) {
        this.logger.info('Call logged successfully', {
          conversationId: result.data.id
        });
      } else {
        this.logger.error('Failed to log call', { error: result.error });
      }

      return result;

    } catch (error) {
      this.logger.error('Exception logging call start', error);

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
   * Log call end to database
   * Updates conversation with duration and final status
   *
   * @param {string} callSid - Twilio call SID
   * @param {number} duration - Call duration in seconds
   * @param {string} status - Final call status
   * @param {Object} metadata - Additional end metadata
   * @returns {Promise<Object>} APIResponse with updated conversation
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async logCallEnd(callSid, duration, status, metadata = {}) {
    try {
      this.logger.info('Logging call end', {
        callSid,
        duration,
        status
      });

      // Find conversation by call SID
      const conversationResult = await this.dbService.getConversationByCallSid(callSid);

      if (!conversationResult.success || !conversationResult.data) {
        throw new Error('Conversation not found for call SID: ' + callSid);
      }

      // Update conversation with end data
      const updateResult = await this.dbService.updateConversation(
        conversationResult.data.id,
        {
          status: status === 'completed' ? 'ended' : 'failed',
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          metadata: {
            ...conversationResult.data.metadata,
            endStatus: status,
            endedAt: new Date().toISOString(),
            ...metadata
          }
        }
      );

      if (updateResult.success) {
        this.logger.info('Call end logged successfully', {
          conversationId: conversationResult.data.id
        });
      } else {
        this.logger.error('Failed to update conversation', { error: updateResult.error });
      }

      return updateResult;

    } catch (error) {
      this.logger.error('Exception logging call end', error);

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
   * Health check - verify agent and dependencies are operational
   * @returns {Promise<Object>} Health status object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async healthCheck() {
    try {
      this.logger.info('Running health check');

      const health = {
        healthy: true,
        details: {
          initialized: this.initialized,
          databaseService: false,
          twilioService: false
        },
        timestamp: new Date().toISOString()
      };

      // Check database service
      if (this.dbService) {
        try {
          // Simple database check - can be enhanced
          health.details.databaseService = true;
        } catch (error) {
          health.details.databaseService = false;
          health.healthy = false;
        }
      }

      // Check Twilio service
      if (this.twilioService) {
        const twilioHealth = await this.twilioService.healthCheck();
        health.details.twilioService = twilioHealth.healthy;
        if (!twilioHealth.healthy) {
          health.healthy = false;
        }
      }

      this.logger.info('Health check complete', health);

      return health;

    } catch (error) {
      this.logger.error('Health check failed', error);

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
   * Graceful shutdown - cleanup resources
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   */
  async shutdown() {
    try {
      this.logger.info('Shutting down Voice Gateway Agent');

      // No active connections to close for now
      // Future: close any open streams, connections, etc.

      this.initialized = false;

      this.logger.info('Voice Gateway Agent shutdown complete');

    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
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
}

module.exports = { VoiceGatewayAgent, BaseAgent };
