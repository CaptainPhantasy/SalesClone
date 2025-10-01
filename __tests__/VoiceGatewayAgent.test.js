/**
 * @fileoverview Comprehensive test suite for VoiceGatewayAgent
 * @author LegacyAI Subagent Fleet - Voice Gateway Agent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * Tests cover:
 * - Agent initialization
 * - Incoming call handling
 * - Outbound call creation
 * - TwiML generation
 * - Call logging to database
 * - Error handling
 * - Phone number validation
 * - Privacy/masking functionality
 */

const { VoiceGatewayAgent } = require('../src/agents/VoiceGatewayAgent');
const TwilioService = require('../src/services/TwilioService');
const DatabaseService = require('../src/services/DatabaseService');

// Mock the dependencies
jest.mock('../src/services/TwilioService');
jest.mock('../src/services/DatabaseService');

describe('VoiceGatewayAgent', () => {
  let agent;
  let mockConfig;
  let mockTwilioService;
  let mockDatabaseService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock configuration
    mockConfig = {
      twilio: {
        accountSid: 'ACtest123',
        authToken: 'test_token',
        phoneNumber: '+15551234567',
        webhookUrl: 'https://example.com'
      }
    };

    // Setup mock Twilio service
    mockTwilioService = {
      initialize: jest.fn().mockResolvedValue(),
      makeCall: jest.fn().mockResolvedValue({
        success: true,
        data: {
          sid: 'CA123456789',
          status: 'queued'
        }
      }),
      healthCheck: jest.fn().mockResolvedValue({
        healthy: true,
        details: {}
      })
    };

    // Setup mock Database service
    mockDatabaseService = {
      initialize: jest.fn().mockResolvedValue(),
      createConversation: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'conv-123',
          call_sid: 'CA123456789'
        }
      }),
      getConversationByCallSid: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'conv-123',
          call_sid: 'CA123456789',
          metadata: {}
        }
      }),
      updateConversation: jest.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'conv-123'
        }
      })
    };

    // Mock the service constructors
    TwilioService.mockImplementation(() => mockTwilioService);
    DatabaseService.mockImplementation(() => mockDatabaseService);

    // Create agent instance
    agent = new VoiceGatewayAgent(mockConfig);
  });

  /**
   * Test 1: Agent Construction
   */
  describe('Constructor', () => {
    test('should construct agent with valid config', () => {
      expect(agent).toBeInstanceOf(VoiceGatewayAgent);
      expect(agent.config).toEqual(mockConfig);
      expect(agent.initialized).toBe(false);
    });

    test('should throw error when constructed without config', () => {
      expect(() => {
        new VoiceGatewayAgent();
      }).toThrow('Missing Twilio configuration');
    });

    test('should throw error when constructed without Twilio config', () => {
      expect(() => {
        new VoiceGatewayAgent({ something: 'else' });
      }).toThrow('Missing Twilio configuration');
    });
  });

  /**
   * Test 2: Initialization
   */
  describe('initialize()', () => {
    test('should initialize agent and dependencies successfully', async () => {
      await agent.initialize();

      expect(agent.initialized).toBe(true);
      expect(mockDatabaseService.initialize).toHaveBeenCalledTimes(1);
      expect(mockTwilioService.initialize).toHaveBeenCalledTimes(1);
    });

    test('should throw error if database initialization fails', async () => {
      mockDatabaseService.initialize = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(agent.initialize()).rejects.toThrow('Database connection failed');
    });

    test('should throw error if Twilio initialization fails', async () => {
      mockTwilioService.initialize = jest.fn().mockRejectedValue(
        new Error('Invalid Twilio credentials')
      );

      await expect(agent.initialize()).rejects.toThrow('Invalid Twilio credentials');
    });
  });

  /**
   * Test 3: Incoming Call Handling
   */
  describe('handleIncomingCall()', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should handle incoming call and return valid TwiML', async () => {
      const callData = {
        CallSid: 'CA123456789',
        From: '+15559876543',
        To: '+15551234567',
        CallStatus: 'ringing',
        Direction: 'inbound'
      };

      const result = await agent.handleIncomingCall(callData);

      expect(result.success).toBe(true);
      expect(result.data.twiml).toBeDefined();
      expect(result.data.twiml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.data.twiml).toContain('<Response>');
      expect(result.data.callSid).toBe('CA123456789');
    });

    test('should generate TwiML with initial greeting', async () => {
      const callData = {
        CallSid: 'CA123456789',
        From: '+15559876543',
        To: '+15551234567',
        CallStatus: 'ringing'
      };

      const result = await agent.handleIncomingCall(callData);

      expect(result.data.twiml).toContain('Hello! I\'m your AI assistant');
    });

    test('should generate TwiML with Gather for speech input', async () => {
      const callData = {
        CallSid: 'CA123456789',
        From: '+15559876543',
        To: '+15551234567',
        CallStatus: 'ringing'
      };

      const result = await agent.handleIncomingCall(callData);

      expect(result.data.twiml).toContain('<Gather');
      expect(result.data.twiml).toContain('input="speech"');
      expect(result.data.twiml).toContain('speechTimeout="auto"');
      expect(result.data.twiml).toContain('/webhooks/process-speech');
    });

    test('should log call to database', async () => {
      const callData = {
        CallSid: 'CA123456789',
        From: '+15559876543',
        To: '+15551234567',
        CallStatus: 'ringing'
      };

      await agent.handleIncomingCall(callData);

      expect(mockDatabaseService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          call_sid: 'CA123456789',
          phone_number: '+15559876543',
          agent_type: 'voice'
        })
      );
    });

    test('should handle missing CallSid', async () => {
      const callData = {
        From: '+15559876543',
        To: '+15551234567'
      };

      const result = await agent.handleIncomingCall(callData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required call data fields');
    });

    test('should handle invalid phone number format', async () => {
      const callData = {
        CallSid: 'CA123456789',
        From: '555-123-4567', // Invalid format
        To: '+15551234567'
      };

      const result = await agent.handleIncomingCall(callData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('E.164 format');
    });

    test('should continue even if database logging fails', async () => {
      mockDatabaseService.createConversation = jest.fn().mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const callData = {
        CallSid: 'CA123456789',
        From: '+15559876543',
        To: '+15551234567',
        CallStatus: 'ringing'
      };

      const result = await agent.handleIncomingCall(callData);

      // Should still return TwiML even if logging fails
      expect(result.success).toBe(true);
      expect(result.data.twiml).toBeDefined();
    });
  });

  /**
   * Test 4: Outbound Calls
   */
  describe('makeOutboundCall()', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should make outbound call successfully', async () => {
      const result = await agent.makeOutboundCall(
        '+15559876543',
        'Test message'
      );

      expect(result.success).toBe(true);
      expect(result.data.callSid).toBe('CA123456789');
      expect(mockTwilioService.makeCall).toHaveBeenCalled();
    });

    test('should validate phone number format', async () => {
      const result = await agent.makeOutboundCall(
        '555-123-4567', // Invalid format
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('E.164 format');
    });

    test('should log outbound call to database', async () => {
      await agent.makeOutboundCall('+15559876543', 'Test message');

      expect(mockDatabaseService.createConversation).toHaveBeenCalled();
    });

    test('should handle Twilio API error', async () => {
      mockTwilioService.makeCall = jest.fn().mockResolvedValue({
        success: false,
        error: 'Twilio API error'
      });

      const result = await agent.makeOutboundCall(
        '+15559876543',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Test 5: Call Logging
   */
  describe('logCallStart()', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should log call start successfully', async () => {
      const result = await agent.logCallStart(
        'CA123456789',
        '+15559876543',
        '+15551234567'
      );

      expect(result.success).toBe(true);
      expect(mockDatabaseService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          call_sid: 'CA123456789',
          phone_number: '+15559876543'
        })
      );
    });

    test('should include metadata in call log', async () => {
      const metadata = {
        Direction: 'outbound',
        message: 'Test'
      };

      await agent.logCallStart(
        'CA123456789',
        '+15559876543',
        '+15551234567',
        metadata
      );

      expect(mockDatabaseService.createConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            Direction: 'outbound'
          })
        })
      );
    });
  });

  describe('logCallEnd()', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should log call end successfully', async () => {
      const result = await agent.logCallEnd(
        'CA123456789',
        120, // duration
        'completed'
      );

      expect(result.success).toBe(true);
      expect(mockDatabaseService.getConversationByCallSid).toHaveBeenCalledWith('CA123456789');
      expect(mockDatabaseService.updateConversation).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          status: 'ended',
          duration_seconds: 120
        })
      );
    });

    test('should handle failed call status', async () => {
      const result = await agent.logCallEnd(
        'CA123456789',
        0,
        'failed'
      );

      expect(result.success).toBe(true);
      expect(mockDatabaseService.updateConversation).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          status: 'failed'
        })
      );
    });

    test('should handle missing conversation', async () => {
      mockDatabaseService.getConversationByCallSid = jest.fn().mockResolvedValue({
        success: true,
        data: null
      });

      const result = await agent.logCallEnd(
        'CA123456789',
        120,
        'completed'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conversation not found');
    });
  });

  /**
   * Test 6: Phone Number Utilities
   */
  describe('Phone Number Validation and Masking', () => {
    test('should validate correct E.164 format', () => {
      expect(agent.isValidE164('+15551234567')).toBe(true);
      expect(agent.isValidE164('+442071234567')).toBe(true);
      expect(agent.isValidE164('+861234567890')).toBe(true);
    });

    test('should reject invalid E.164 format', () => {
      expect(agent.isValidE164('555-123-4567')).toBe(false);
      expect(agent.isValidE164('15551234567')).toBe(false); // Missing +
      expect(agent.isValidE164('+0555123456')).toBe(false); // Starts with 0
      expect(agent.isValidE164('+1')).toBe(false); // Too short
    });

    test('should mask phone numbers for privacy', () => {
      expect(agent.maskPhoneNumber('+15551234567')).toBe('+1555***4567');
      expect(agent.maskPhoneNumber('+442071234567')).toBe('+4420***4567');
    });

    test('should handle short phone numbers in masking', () => {
      expect(agent.maskPhoneNumber('+1234')).toBe('***');
      expect(agent.maskPhoneNumber('')).toBe('***');
      expect(agent.maskPhoneNumber(null)).toBe('***');
    });
  });

  /**
   * Test 7: Health Check
   */
  describe('healthCheck()', () => {
    test('should return healthy status when initialized', async () => {
      await agent.initialize();

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details.initialized).toBe(true);
    });

    test('should return unhealthy if not initialized', async () => {
      const health = await agent.healthCheck();

      expect(health.details.initialized).toBe(false);
    });

    test('should check Twilio service health', async () => {
      await agent.initialize();

      await agent.healthCheck();

      expect(mockTwilioService.healthCheck).toHaveBeenCalled();
    });

    test('should return unhealthy if Twilio service fails', async () => {
      await agent.initialize();

      mockTwilioService.healthCheck = jest.fn().mockResolvedValue({
        healthy: false
      });

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(false);
    });
  });

  /**
   * Test 8: Shutdown
   */
  describe('shutdown()', () => {
    test('should shutdown gracefully', async () => {
      await agent.initialize();

      await expect(agent.shutdown()).resolves.not.toThrow();
      expect(agent.initialized).toBe(false);
    });

    test('should handle shutdown when not initialized', async () => {
      await expect(agent.shutdown()).resolves.not.toThrow();
    });
  });

  /**
   * Test 9: Error Handling
   */
  describe('Error Handling', () => {
    test('should handle exceptions in handleIncomingCall', async () => {
      await agent.initialize();

      // Force an error by making database throw
      mockDatabaseService.createConversation = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      const callData = {
        CallSid: 'CA123456789',
        From: '+15559876543',
        To: '+15551234567',
        CallStatus: 'ringing'
      };

      const result = await agent.handleIncomingCall(callData);

      // Should continue successfully even if database fails (designed behavior)
      // We don't want to drop calls due to database issues
      expect(result.success).toBe(true);
      expect(result.data.twiml).toBeDefined();
    });

    test('should handle exceptions in makeOutboundCall', async () => {
      await agent.initialize();

      mockTwilioService.makeCall = jest.fn().mockRejectedValue(
        new Error('Network error')
      );

      const result = await agent.makeOutboundCall(
        '+15559876543',
        'Test message'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  /**
   * Test 10: Logger Functionality
   */
  describe('Logger', () => {
    test('should have logger with all methods', () => {
      expect(agent.logger).toBeDefined();
      expect(agent.logger.info).toBeInstanceOf(Function);
      expect(agent.logger.warn).toBeInstanceOf(Function);
      expect(agent.logger.error).toBeInstanceOf(Function);
      expect(agent.logger.debug).toBeInstanceOf(Function);
    });

    test('should log without throwing errors', () => {
      expect(() => {
        agent.logger.info('Test message');
        agent.logger.warn('Test warning');
        agent.logger.error('Test error', new Error('test'));
        agent.logger.debug('Test debug');
      }).not.toThrow();
    });
  });

  /**
   * Test 11: Request ID Generation
   */
  describe('generateRequestId()', () => {
    test('should generate valid UUID v4', () => {
      const id = agent.generateRequestId();

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    test('should generate unique IDs', () => {
      const id1 = agent.generateRequestId();
      const id2 = agent.generateRequestId();

      expect(id1).not.toBe(id2);
    });
  });

  /**
   * Test 12: TwiML Generation Edge Cases
   */
  describe('generateInitialTwiML()', () => {
    test('should handle errors in TwiML generation gracefully', async () => {
      await agent.initialize();

      // Pass invalid data that might cause TwiML generation issues
      const result = agent.generateInitialTwiML({});

      expect(result).toBeDefined();
      expect(result.toString()).toContain('<?xml version');
    });
  });

  /**
   * Test 13: Configuration Validation
   */
  describe('Configuration', () => {
    test('should accept valid Twilio configuration', () => {
      const validConfig = {
        twilio: {
          accountSid: 'ACtest',
          authToken: 'token',
          phoneNumber: '+15551234567',
          webhookUrl: 'https://example.com'
        }
      };

      expect(() => {
        new VoiceGatewayAgent(validConfig);
      }).not.toThrow();
    });

    test('should store webhook URL correctly', () => {
      expect(agent.config.twilio.webhookUrl).toBe('https://example.com');
    });
  });
});
