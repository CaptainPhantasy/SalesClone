/**
 * @fileoverview Comprehensive test suite for IntegrationAgent
 * @author LegacyAI Subagent Fleet - Integration Agent Builder
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * Tests cover:
 * - Agent initialization and configuration
 * - Customer data synchronization
 * - Email notifications
 * - Webhook notifications
 * - Scheduled task creation
 * - Webhook event processing
 * - Error handling and edge cases
 * - Rate limiting
 * - Retry logic
 * - Health checks
 */

const IntegrationAgent = require('../src/agents/IntegrationAgent');
const DatabaseService = require('../src/services/DatabaseService');
const WebhookService = require('../src/services/WebhookService');
const EmailService = require('../src/services/EmailService');

// Mock dependencies
jest.mock('../src/services/DatabaseService');
jest.mock('../src/services/WebhookService');
jest.mock('../src/services/EmailService');

describe('IntegrationAgent', () => {
  let agent;
  let mockConfig;
  let mockDbService;
  let mockWebhookService;
  let mockEmailService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      app: {
        nodeEnv: 'test',
      },
      mailgun: {
        apiKey: 'test-api-key',
        domain: 'test.mailgun.org',
        from: 'test@example.com',
      },
    };

    // Create mock service instances
    mockDbService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getCustomerByPhone: jest.fn(),
      updateCustomer: jest.fn(),
      createScheduledTask: jest.fn(),
      client: {},
    };

    mockWebhookService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      sendWebhook: jest.fn(),
      validateWebhookSignature: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };

    mockEmailService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      sendEmail: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    };

    // Configure mocks to return mock instances
    DatabaseService.mockImplementation(() => mockDbService);
    WebhookService.mockImplementation(() => mockWebhookService);
    EmailService.mockImplementation(() => mockEmailService);

    // Create agent instance
    agent = new IntegrationAgent(mockConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================================================
  // TEST SUITE 1: Initialization and Configuration
  // ============================================================================

  describe('Initialization', () => {
    test('should create IntegrationAgent instance with config', () => {
      expect(agent).toBeInstanceOf(IntegrationAgent);
      expect(agent.config).toBe(mockConfig);
      expect(agent.dbService).toBeDefined();
    });

    test('should initialize all service dependencies', async () => {
      await agent.initialize();

      expect(mockDbService.initialize).toHaveBeenCalledTimes(1);
      expect(mockWebhookService.initialize).toHaveBeenCalledTimes(1);
      expect(mockEmailService.initialize).toHaveBeenCalledTimes(1);
    });

    test('should throw error if initialization fails', async () => {
      mockDbService.initialize.mockRejectedValue(new Error('DB init failed'));

      await expect(agent.initialize()).rejects.toThrow('DB init failed');
    });
  });

  // ============================================================================
  // TEST SUITE 2: Customer Data Synchronization
  // ============================================================================

  describe('syncCustomerData', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should successfully sync customer data', async () => {
      const mockCustomer = {
        id: 'customer-123',
        phone_number: '+1234567890',
        name: 'John Doe',
        metadata: {},
      };

      mockDbService.getCustomerByPhone.mockResolvedValue({
        success: true,
        data: mockCustomer,
      });

      mockDbService.updateCustomer.mockResolvedValue({
        success: true,
        data: { ...mockCustomer, metadata: { integration: {} } },
      });

      const result = await agent.syncCustomerData('customer-123');

      expect(result.success).toBe(true);
      expect(result.data.customerId).toBe('customer-123');
      expect(mockDbService.getCustomerByPhone).toHaveBeenCalledWith('customer-123');
      expect(mockDbService.updateCustomer).toHaveBeenCalled();
    });

    test('should return error if customer not found', async () => {
      mockDbService.getCustomerByPhone.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await agent.syncCustomerData('nonexistent-customer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Customer not found');
    });

    test('should validate customerId parameter', async () => {
      const result = await agent.syncCustomerData(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('customerId is required');
    });

    test('should handle database errors gracefully', async () => {
      mockDbService.getCustomerByPhone.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      const result = await agent.syncCustomerData('customer-123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to fetch customer data');
    });
  });

  // ============================================================================
  // TEST SUITE 3: Email Notifications
  // ============================================================================

  describe('sendNotification - Email', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should send email notification successfully', async () => {
      mockEmailService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await agent.sendNotification('email', 'test@example.com', {
        subject: 'Test Email',
        body: 'This is a test email',
      });

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('email');
      expect(result.data.recipient).toBe('test@example.com');
      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test Email',
        'This is a test email'
      );
    });

    test('should validate email notification data', async () => {
      const result = await agent.sendNotification('email', 'test@example.com', {
        // Missing subject and body
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('subject and body');
    });

    test('should handle email service errors', async () => {
      mockEmailService.sendEmail.mockRejectedValue(new Error('Email service unavailable'));

      const result = await agent.sendNotification('email', 'test@example.com', {
        subject: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email service unavailable');
    });
  });

  // ============================================================================
  // TEST SUITE 4: Webhook Notifications
  // ============================================================================

  describe('sendNotification - Webhook', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should send webhook notification successfully', async () => {
      mockWebhookService.sendWebhook.mockResolvedValue({
        success: true,
        deliveryId: 'delivery-123',
      });

      const result = await agent.sendNotification(
        'webhook',
        'https://example.com/webhook',
        { event: 'test.event', data: { foo: 'bar' } }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('webhook');
      expect(mockWebhookService.sendWebhook).toHaveBeenCalled();
    });

    test('should validate webhook URL format', async () => {
      const result = await agent.sendNotification(
        'webhook',
        'invalid-url',
        { event: 'test' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook URL');
    });

    test('should handle webhook service errors', async () => {
      mockWebhookService.sendWebhook.mockRejectedValue(new Error('Webhook delivery failed'));

      const result = await agent.sendNotification(
        'webhook',
        'https://example.com/webhook',
        { event: 'test' }
      );

      expect(result.success).toBe(false);
    });
  });

  // ============================================================================
  // TEST SUITE 5: Notification Type Validation
  // ============================================================================

  describe('sendNotification - Type Validation', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should reject unsupported notification types', async () => {
      const result = await agent.sendNotification('sms', 'recipient', { data: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported notification type');
    });

    test('should require all parameters', async () => {
      const result = await agent.sendNotification('email', null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('required');
    });
  });

  // ============================================================================
  // TEST SUITE 6: Scheduled Tasks
  // ============================================================================

  describe('scheduleFollowUp', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should schedule follow-up task successfully', async () => {
      const taskData = {
        taskType: 'follow_up_call',
        scheduledFor: new Date('2025-10-02T10:00:00Z'),
        payload: { reason: 'product_inquiry' },
      };

      mockDbService.createScheduledTask.mockResolvedValue({
        success: true,
        data: {
          id: 'task-123',
          ...taskData,
        },
      });

      const result = await agent.scheduleFollowUp('customer-123', taskData);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('task-123');
      expect(mockDbService.createScheduledTask).toHaveBeenCalledWith({
        customer_id: 'customer-123',
        task_type: 'follow_up_call',
        scheduled_for: taskData.scheduledFor,
        payload: taskData.payload,
      });
    });

    test('should validate customerId parameter', async () => {
      const result = await agent.scheduleFollowUp(null, {
        taskType: 'test',
        scheduledFor: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('customerId is required');
    });

    test('should validate taskData parameters', async () => {
      const result = await agent.scheduleFollowUp('customer-123', {
        // Missing taskType and scheduledFor
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('taskType and scheduledFor');
    });

    test('should handle database errors', async () => {
      mockDbService.createScheduledTask.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const result = await agent.scheduleFollowUp('customer-123', {
        taskType: 'test',
        scheduledFor: new Date(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create scheduled task');
    });
  });

  // ============================================================================
  // TEST SUITE 7: Webhook Processing
  // ============================================================================

  describe('processWebhook', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should process webhook without signature validation', async () => {
      const payload = {
        event_type: 'user.created',
        data: { userId: '123' },
      };

      const result = await agent.processWebhook('stripe', payload);

      expect(result.success).toBe(true);
      expect(result.data.source).toBe('stripe');
      expect(result.data.eventType).toBe('user.created');
    });

    test('should process webhook with signature validation', async () => {
      mockWebhookService.validateWebhookSignature.mockResolvedValue(true);

      const payload = { event: 'test' };
      const result = await agent.processWebhook(
        'stripe',
        payload,
        'signature-123',
        'secret-key'
      );

      expect(result.success).toBe(true);
      expect(mockWebhookService.validateWebhookSignature).toHaveBeenCalledWith(
        payload,
        'signature-123',
        'secret-key'
      );
    });

    test('should reject webhook with invalid signature', async () => {
      mockWebhookService.validateWebhookSignature.mockResolvedValue(false);

      const result = await agent.processWebhook(
        'stripe',
        { event: 'test' },
        'invalid-signature',
        'secret-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid webhook signature');
    });

    test('should validate required parameters', async () => {
      const result = await agent.processWebhook(null, null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('source and payload are required');
    });

    test('should extract event type from different payload formats', async () => {
      const payloads = [
        { type: 'payment.succeeded' },
        { event_type: 'user.updated' },
        { data: 'test' }, // No event type
      ];

      for (const payload of payloads) {
        const result = await agent.processWebhook('test', payload);
        expect(result.success).toBe(true);
        expect(result.data.eventType).toBeDefined();
      }
    });
  });

  // ============================================================================
  // TEST SUITE 8: Rate Limiting
  // ============================================================================

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      await agent.initialize();
      mockEmailService.sendEmail.mockResolvedValue({ success: true });
    });

    test('should enforce rate limits for email notifications', async () => {
      // Set low rate limit for testing
      agent.rateLimits.email = 3;

      const results = [];

      // Send 5 emails (should hit rate limit after 3)
      for (let i = 0; i < 5; i++) {
        const result = await agent.sendNotification('email', 'test@example.com', {
          subject: 'Test',
          body: 'Test',
        });
        results.push(result);
      }

      const successCount = results.filter(r => r.success).length;
      const rateLimitedCount = results.filter(r => !r.success && r.error.includes('Rate limit')).length;

      expect(successCount).toBe(3);
      expect(rateLimitedCount).toBe(2);
    });
  });

  // ============================================================================
  // TEST SUITE 9: Health Check
  // ============================================================================

  describe('healthCheck', () => {
    test('should return healthy status when all services are initialized', async () => {
      await agent.initialize();

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details.database).toBe(true);
      expect(health.details.webhook).toBe(true);
      expect(health.details.email).toBe(true);
    });

    test('should return unhealthy status when services are not initialized', async () => {
      // Don't initialize agent
      const health = await agent.healthCheck();

      expect(health.healthy).toBe(false);
    });

    test('should handle health check errors gracefully', async () => {
      // Make dbService throw error
      agent.dbService = {
        get client() {
          throw new Error('Database error');
        },
      };

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details.database).toBe(false);
    });
  });

  // ============================================================================
  // TEST SUITE 10: Shutdown
  // ============================================================================

  describe('shutdown', () => {
    test('should shutdown all services gracefully', async () => {
      await agent.initialize();
      await agent.shutdown();

      expect(mockWebhookService.shutdown).toHaveBeenCalledTimes(1);
      expect(mockEmailService.shutdown).toHaveBeenCalledTimes(1);
    });

    test('should handle shutdown errors', async () => {
      await agent.initialize();
      mockWebhookService.shutdown.mockRejectedValue(new Error('Shutdown error'));

      await expect(agent.shutdown()).rejects.toThrow('Shutdown error');
    });
  });

  // ============================================================================
  // TEST SUITE 11: Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should return proper error response format', async () => {
      const result = await agent.syncCustomerData(null);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('requestId');
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    test('should generate unique request IDs', async () => {
      mockDbService.getCustomerByPhone.mockResolvedValue({
        success: false,
        error: 'Error',
      });

      const result1 = await agent.syncCustomerData('test1');
      const result2 = await agent.syncCustomerData('test2');

      expect(result1.requestId).not.toBe(result2.requestId);
    });
  });

  // ============================================================================
  // TEST SUITE 12: Retry Logic
  // ============================================================================

  describe('Retry Logic', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should retry failed email operations', async () => {
      // Fail twice, then succeed
      mockEmailService.sendEmail
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({ success: true, messageId: 'msg-123' });

      const result = await agent.sendNotification('email', 'test@example.com', {
        subject: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(true);
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries', async () => {
      // Always fail
      mockEmailService.sendEmail.mockRejectedValue(new Error('Permanent error'));

      const result = await agent.sendNotification('email', 'test@example.com', {
        subject: 'Test',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(3); // maxRetries
    });
  });

  // ============================================================================
  // TEST SUITE 13: Integration Test
  // ============================================================================

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    test('should handle complete customer sync and notification flow', async () => {
      // Setup mocks
      const mockCustomer = {
        id: 'customer-123',
        phone_number: '+1234567890',
        name: 'John Doe',
        metadata: {},
      };

      mockDbService.getCustomerByPhone.mockResolvedValue({
        success: true,
        data: mockCustomer,
      });

      mockDbService.updateCustomer.mockResolvedValue({
        success: true,
        data: mockCustomer,
      });

      mockEmailService.sendEmail.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      // Execute flow
      const syncResult = await agent.syncCustomerData('customer-123');
      expect(syncResult.success).toBe(true);

      const emailResult = await agent.sendNotification('email', 'test@example.com', {
        subject: 'Customer Synced',
        body: 'Customer data has been synchronized',
      });
      expect(emailResult.success).toBe(true);

      // Verify all operations completed
      expect(mockDbService.getCustomerByPhone).toHaveBeenCalled();
      expect(mockDbService.updateCustomer).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // TEST SUITE 14: Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('should handle missing configuration gracefully', () => {
      // IntegrationAgent accepts null config but EmailService throws
      // when trying to initialize without config
      const agentWithNoConfig = new IntegrationAgent(null);
      expect(agentWithNoConfig).toBeDefined();
      expect(agentWithNoConfig.config).toBeNull();
    });

    test('should handle operations before initialization', async () => {
      const uninitializedAgent = new IntegrationAgent(mockConfig);

      // Try to sync without initializing
      mockDbService.getCustomerByPhone.mockResolvedValue({
        success: true,
        data: null,
      });

      const result = await uninitializedAgent.syncCustomerData('customer-123');
      expect(result).toBeDefined(); // Should not crash
    });
  });

  // ============================================================================
  // TEST SUITE 15: Logging and Monitoring
  // ============================================================================

  describe('Logging', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log operations with timestamps', async () => {
      await agent.initialize();

      expect(consoleSpy).toHaveBeenCalled();
      const logCalls = consoleSpy.mock.calls;

      // Verify timestamp format in logs
      logCalls.forEach(call => {
        const logMessage = call[0];
        expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      });
    });
  });
});
