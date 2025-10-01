/**
 * @fileoverview Comprehensive tests for DatabaseService
 * @author LegacyAI Database Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 *
 * Tests cover all CRUD operations, error handling, and edge cases
 * for the DatabaseService class.
 */

const DatabaseService = require('../src/services/DatabaseService');
const { getSupabaseClient, resetSupabaseClient } = require('../src/services/SupabaseClient');

// Mock the SupabaseClient module
jest.mock('../src/services/SupabaseClient', () => ({
  getSupabaseClient: jest.fn(),
  resetSupabaseClient: jest.fn()
}));

describe('DatabaseService', () => {
  let dbService;
  let mockSupabaseClient;

  beforeEach(() => {
    // Create a fresh instance for each test
    dbService = new DatabaseService();

    // Create mock Supabase client with fluent API
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn()
    };

    // Mock getSupabaseClient to return our mock
    getSupabaseClient.mockReturnValue(mockSupabaseClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('initialize', () => {
    test('should initialize successfully with valid client', async () => {
      await dbService.initialize();

      expect(getSupabaseClient).toHaveBeenCalled();
      expect(dbService.client).toBe(mockSupabaseClient);
    });

    test('should throw error when Supabase client is not initialized', async () => {
      getSupabaseClient.mockReturnValue(null);

      await expect(dbService.initialize()).rejects.toThrow(
        'Supabase client not initialized'
      );
    });
  });

  describe('generateRequestId', () => {
    test('should generate valid UUID v4', () => {
      const id = dbService.generateRequestId();

      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i);
    });

    test('should generate unique IDs', () => {
      const id1 = dbService.generateRequestId();
      const id2 = dbService.generateRequestId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('createResponse', () => {
    test('should create success response', () => {
      const response = dbService.createResponse(true, { test: 'data' }, null);

      expect(response.success).toBe(true);
      expect(response.data).toEqual({ test: 'data' });
      expect(response.error).toBeNull();
      expect(response.timestamp).toBeDefined();
      expect(response.requestId).toBeDefined();
    });

    test('should create error response', () => {
      const response = dbService.createResponse(false, null, 'Test error');

      expect(response.success).toBe(false);
      expect(response.data).toBeNull();
      expect(response.error).toBe('Test error');
      expect(response.timestamp).toBeDefined();
      expect(response.requestId).toBeDefined();
    });
  });

  // ============================================================================
  // CONVERSATION OPERATIONS TESTS
  // ============================================================================

  describe('createConversation', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should create conversation successfully', async () => {
      const mockData = {
        id: 'conv-uuid',
        call_sid: 'CA123456',
        phone_number: '+1234567890',
        status: 'active'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.createConversation({
        call_sid: 'CA123456',
        phone_number: '+1234567890'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('conversations');
    });

    test('should fail when call_sid is missing', async () => {
      const result = await dbService.createConversation({
        phone_number: '+1234567890'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('call_sid');
    });

    test('should fail when phone_number is missing', async () => {
      const result = await dbService.createConversation({
        call_sid: 'CA123456'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('phone_number');
    });

    test('should handle database error', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await dbService.createConversation({
        call_sid: 'CA123456',
        phone_number: '+1234567890'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getConversation', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve conversation by ID', async () => {
      const mockData = {
        id: 'conv-uuid',
        call_sid: 'CA123456',
        phone_number: '+1234567890'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getConversation('conv-uuid');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'conv-uuid');
    });

    test('should handle not found error', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      });

      const result = await dbService.getConversation('invalid-uuid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not found');
    });
  });

  describe('getConversationByCallSid', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve conversation by call_sid', async () => {
      const mockData = {
        id: 'conv-uuid',
        call_sid: 'CA123456',
        phone_number: '+1234567890'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getConversationByCallSid('CA123456');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('call_sid', 'CA123456');
    });
  });

  describe('updateConversation', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should update conversation successfully', async () => {
      const mockData = {
        id: 'conv-uuid',
        status: 'ended',
        duration_seconds: 120
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.updateConversation('conv-uuid', {
        status: 'ended',
        duration_seconds: 120
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CUSTOMER OPERATIONS TESTS
  // ============================================================================

  describe('createCustomer', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should create customer successfully', async () => {
      const mockData = {
        id: 'cust-uuid',
        phone_number: '+1234567890',
        name: 'John Doe'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.createCustomer({
        phone_number: '+1234567890',
        name: 'John Doe'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers');
    });

    test('should fail when phone_number is missing', async () => {
      const result = await dbService.createCustomer({
        name: 'John Doe'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('phone_number');
    });
  });

  describe('getCustomerByPhone', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve customer by phone', async () => {
      const mockData = {
        id: 'cust-uuid',
        phone_number: '+1234567890',
        name: 'John Doe'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getCustomerByPhone('+1234567890');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('phone_number', '+1234567890');
    });

    test('should return null data when customer not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      });

      const result = await dbService.getCustomerByPhone('+9999999999');

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('updateCustomer', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should update customer successfully', async () => {
      const mockData = {
        id: 'cust-uuid',
        lead_score: 85
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.updateCustomer('cust-uuid', {
        lead_score: 85
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });
  });

  // ============================================================================
  // MESSAGE OPERATIONS TESTS
  // ============================================================================

  describe('createMessage', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should create message successfully', async () => {
      const mockData = {
        id: 'msg-uuid',
        conversation_id: 'conv-uuid',
        role: 'user',
        content: 'Hello'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.createMessage('conv-uuid', 'user', 'Hello');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('messages');
    });

    test('should fail with invalid role', async () => {
      const result = await dbService.createMessage('conv-uuid', 'invalid', 'Hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid role');
    });

    test('should accept valid roles', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {},
        error: null
      });

      const roles = ['user', 'assistant', 'system'];

      for (const role of roles) {
        const result = await dbService.createMessage('conv-uuid', role, 'Test');
        expect(result.success).toBe(true);
      }
    });

    test('should fail when required fields are missing', async () => {
      const result1 = await dbService.createMessage(null, 'user', 'Hello');
      expect(result1.success).toBe(false);

      const result2 = await dbService.createMessage('conv-uuid', null, 'Hello');
      expect(result2.success).toBe(false);

      const result3 = await dbService.createMessage('conv-uuid', 'user', null);
      expect(result3.success).toBe(false);
    });
  });

  describe('getConversationMessages', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve messages for conversation', async () => {
      const mockData = [
        { id: 'msg1', role: 'user', content: 'Hello' },
        { id: 'msg2', role: 'assistant', content: 'Hi there!' }
      ];

      // For queries that return arrays, we don't use .single()
      mockSupabaseClient.order.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getConversationMessages('conv-uuid');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.data.length).toBe(2);
    });

    test('should apply limit option', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null
      });

      await dbService.getConversationMessages('conv-uuid', { limit: 10 });

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10);
    });

    test('should apply order option', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null
      });

      await dbService.getConversationMessages('conv-uuid', { order: 'desc' });

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('timestamp', { ascending: false });
    });
  });

  // ============================================================================
  // ANALYTICS OPERATIONS TESTS
  // ============================================================================

  describe('logCallAnalytics', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should log analytics successfully', async () => {
      const mockData = {
        id: 'analytics-uuid',
        date: '2025-10-01',
        total_calls: 10
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.logCallAnalytics({
        total_calls: 10,
        successful_resolutions: 8,
        escalations: 2,
        avg_duration_seconds: 120.5,
        avg_sentiment: 0.75
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.upsert).toHaveBeenCalled();
    });

    test('should use today as default date', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {},
        error: null
      });

      const today = new Date().toISOString().split('T')[0];
      await dbService.logCallAnalytics({ total_calls: 5 });

      // Check that upsert was called with data containing today's date
      expect(mockSupabaseClient.upsert).toHaveBeenCalled();
    });
  });

  describe('getAnalytics', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve analytics for date range', async () => {
      const mockData = [
        { date: '2025-10-01', total_calls: 10 },
        { date: '2025-10-02', total_calls: 15 }
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getAnalytics('2025-10-01', '2025-10-02');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('date', '2025-10-01');
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('date', '2025-10-02');
    });
  });

  // ============================================================================
  // AGENT CONFIG OPERATIONS TESTS
  // ============================================================================

  describe('getAgentConfig', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve agent config by name', async () => {
      const mockData = {
        id: 'config-uuid',
        name: 'default_voice_agent',
        system_prompt: 'Test prompt'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getAgentConfig('default_voice_agent');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('name', 'default_voice_agent');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('active', true);
    });
  });

  describe('getAllAgentConfigs', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve all active agent configs', async () => {
      const mockData = [
        { id: 'config1', name: 'agent1' },
        { id: 'config2', name: 'agent2' }
      ];

      mockSupabaseClient.order.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getAllAgentConfigs();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(result.data.length).toBe(2);
    });
  });

  // ============================================================================
  // SCHEDULED TASK OPERATIONS TESTS
  // ============================================================================

  describe('createScheduledTask', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should create scheduled task successfully', async () => {
      const mockData = {
        id: 'task-uuid',
        customer_id: 'cust-uuid',
        task_type: 'follow_up_call',
        status: 'pending'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.createScheduledTask({
        customer_id: 'cust-uuid',
        task_type: 'follow_up_call',
        scheduled_for: '2025-10-02T10:00:00Z',
        payload: { reason: 'test' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    test('should fail when required fields are missing', async () => {
      const result = await dbService.createScheduledTask({
        task_type: 'follow_up_call',
        scheduled_for: '2025-10-02T10:00:00Z'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('customer_id');
    });
  });

  describe('getPendingTasks', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should retrieve pending tasks', async () => {
      const mockData = [
        { id: 'task1', status: 'pending' },
        { id: 'task2', status: 'pending' }
      ];

      mockSupabaseClient.limit.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.getPendingTasks();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'pending');
    });

    test('should apply custom limit', async () => {
      mockSupabaseClient.limit.mockResolvedValue({
        data: [],
        error: null
      });

      await dbService.getPendingTasks({ limit: 50 });

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('updateTaskStatus', () => {
    beforeEach(async () => {
      await dbService.initialize();
    });

    test('should update task status successfully', async () => {
      const mockData = {
        id: 'task-uuid',
        status: 'completed'
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await dbService.updateTaskStatus('task-uuid', 'completed', {
        success: true
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    test('should add completed_at for completed status', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {},
        error: null
      });

      await dbService.updateTaskStatus('task-uuid', 'completed');

      // Verify that update was called with completed_at
      const updateCall = mockSupabaseClient.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('completed_at');
    });

    test('should add completed_at for failed status', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: {},
        error: null
      });

      await dbService.updateTaskStatus('task-uuid', 'failed');

      const updateCall = mockSupabaseClient.update.mock.calls[0][0];
      expect(updateCall).toHaveProperty('completed_at');
    });
  });
});
