/**
 * @fileoverview Comprehensive test suite for ConversationAgent
 * @author LegacyAI Subagent Fleet - Conversation Agent Builder
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This test suite covers all aspects of the ConversationAgent including:
 * - Speech processing end-to-end
 * - AI response generation with context
 * - Context retrieval from database
 * - Message logging
 * - Sentiment analysis
 * - Error handling and edge cases
 */

const ConversationAgent = require('../src/agents/ConversationAgent');
const OpenAIService = require('../src/services/OpenAIService');
const AnthropicService = require('../src/services/AnthropicService');
const DatabaseService = require('../src/services/DatabaseService');

// Mock the services
jest.mock('../src/services/OpenAIService');
jest.mock('../src/services/AnthropicService');
jest.mock('../src/services/DatabaseService');

describe('ConversationAgent', () => {
  let agent;
  let mockConfig;
  let mockOpenAIService;
  let mockAnthropicService;
  let mockDatabaseService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      openai: {
        apiKey: 'test-openai-key',
        model: 'gpt-4-1106-preview',
        realtimeModel: 'whisper-1',
      },
      anthropic: {
        apiKey: 'test-anthropic-key',
        model: 'claude-3-opus-20240229',
      },
    };

    // Create mock service instances
    mockOpenAIService = {
      healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
      generateCompletion: jest.fn(),
      transcribeAudio: jest.fn(),
      getUsageStats: jest.fn().mockReturnValue({ totalTokensUsed: 0 }),
    };

    mockAnthropicService = {
      healthCheck: jest.fn().mockResolvedValue({ healthy: true }),
      generateResponse: jest.fn(),
      getUsageStats: jest.fn().mockReturnValue({ totalTokens: 0 }),
    };

    mockDatabaseService = {
      initialize: jest.fn().mockResolvedValue(undefined),
      getConversationByCallSid: jest.fn(),
      getConversationMessages: jest.fn(),
      createMessage: jest.fn(),
      updateConversation: jest.fn(),
      createConversation: jest.fn(),
    };

    // Mock the service constructors
    OpenAIService.mockImplementation(() => mockOpenAIService);
    AnthropicService.mockImplementation(() => mockAnthropicService);
    DatabaseService.mockImplementation(() => mockDatabaseService);

    // Create agent instance
    agent = new ConversationAgent(mockConfig);
  });

  describe('Constructor and Initialization', () => {
    test('should create ConversationAgent instance', () => {
      expect(agent).toBeInstanceOf(ConversationAgent);
      expect(agent.openaiService).toBe(mockOpenAIService);
      expect(agent.anthropicService).toBe(mockAnthropicService);
      expect(agent.dbService).toBe(mockDatabaseService);
    });

    test('should initialize with empty active sessions', () => {
      expect(agent.activeSessions).toBeInstanceOf(Map);
      expect(agent.activeSessions.size).toBe(0);
    });

    test('should initialize all dependencies successfully', async () => {
      await agent.initialize();

      expect(mockDatabaseService.initialize).toHaveBeenCalledTimes(1);
      expect(mockOpenAIService.healthCheck).toHaveBeenCalledTimes(1);
      expect(mockAnthropicService.healthCheck).toHaveBeenCalledTimes(1);
    });

    test('should throw error if OpenAI health check fails', async () => {
      mockOpenAIService.healthCheck.mockResolvedValue({ healthy: false });

      await expect(agent.initialize()).rejects.toThrow('OpenAI service health check failed');
    });

    test('should throw error if Anthropic health check fails', async () => {
      mockAnthropicService.healthCheck.mockResolvedValue({ healthy: false });

      await expect(agent.initialize()).rejects.toThrow('Anthropic service health check failed');
    });
  });

  describe('processSpeech', () => {
    test('should process speech successfully with valid input', async () => {
      const speechData = {
        CallSid: 'CA123456',
        SpeechResult: 'I need help with my order',
        Confidence: 0.95,
        From: '+1234567890',
      };

      const mockContext = {
        conversationId: 'conv-uuid-123',
        callSid: 'CA123456',
        messages: [],
        metadata: {},
      };

      const mockAIResponse = {
        text: 'I can help you with your order. What seems to be the issue?',
        model: 'claude-3-opus-20240229',
        totalTokens: 25,
        latencyMs: 150,
      };

      // Mock dependencies
      mockDatabaseService.getConversationByCallSid.mockResolvedValue({
        success: true,
        data: {
          id: 'conv-uuid-123',
          call_sid: 'CA123456',
          phone_number: '+1234567890',
        },
      });

      mockDatabaseService.getConversationMessages.mockResolvedValue({
        success: true,
        data: [],
      });

      mockAnthropicService.generateResponse.mockResolvedValue(mockAIResponse);

      mockDatabaseService.createMessage.mockResolvedValue({ success: true });
      mockDatabaseService.updateConversation.mockResolvedValue({ success: true });

      const result = await agent.processSpeech(speechData);

      expect(result.success).toBe(true);
      expect(result.data.aiResponse).toBe(mockAIResponse.text);
      expect(result.data.twiml).toContain('<Say voice="alice">');
      expect(result.data.sentiment).toBeDefined();
      expect(mockDatabaseService.createMessage).toHaveBeenCalledTimes(2); // user + assistant
    });

    test('should reject speech with low confidence', async () => {
      const speechData = {
        CallSid: 'CA123456',
        SpeechResult: 'unclear speech',
        Confidence: 0.3, // Below 0.5 threshold
      };

      const result = await agent.processSpeech(speechData);

      expect(result.success).toBe(true);
      expect(result.data.needsRepeat).toBe(true);
      expect(result.data.twiml).toContain("I didn't quite catch that");
    });

    test('should handle missing CallSid', async () => {
      const speechData = {
        SpeechResult: 'Hello',
        Confidence: 0.95,
      };

      const result = await agent.processSpeech(speechData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('CallSid and SpeechResult are required');
    });

    test('should handle missing SpeechResult', async () => {
      const speechData = {
        CallSid: 'CA123456',
        Confidence: 0.95,
      };

      const result = await agent.processSpeech(speechData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('CallSid and SpeechResult are required');
    });

    test('should include sentiment analysis in response', async () => {
      const speechData = {
        CallSid: 'CA123456',
        SpeechResult: 'This is terrible service!',
        Confidence: 0.95,
      };

      mockDatabaseService.getConversationByCallSid.mockResolvedValue({
        success: true,
        data: { id: 'conv-123', call_sid: 'CA123456' },
      });

      mockDatabaseService.getConversationMessages.mockResolvedValue({
        success: true,
        data: [],
      });

      mockAnthropicService.generateResponse.mockResolvedValue({
        text: 'I apologize for the inconvenience.',
        totalTokens: 10,
        latencyMs: 100,
      });

      mockDatabaseService.createMessage.mockResolvedValue({ success: true });
      mockDatabaseService.updateConversation.mockResolvedValue({ success: true });

      const result = await agent.processSpeech(speechData);

      expect(result.success).toBe(true);
      expect(result.data.sentiment.label).toBe('negative');
      expect(result.data.sentiment.score).toBeLessThan(0);
    });
  });

  describe('generateResponse', () => {
    test('should generate response with empty context', async () => {
      const mockResponse = {
        text: 'Hello! How can I help you today?',
        model: 'claude-3-opus-20240229',
        totalTokens: 15,
        latencyMs: 120,
      };

      mockAnthropicService.generateResponse.mockResolvedValue(mockResponse);

      const context = { messages: [] };
      const result = await agent.generateResponse('Hello', context);

      expect(result.text).toBe(mockResponse.text);
      expect(mockAnthropicService.generateResponse).toHaveBeenCalledWith(
        [{ role: 'user', content: 'Hello' }],
        expect.stringContaining('helpful AI voice assistant'),
        expect.objectContaining({
          maxTokens: 150,
          temperature: 0.7,
        })
      );
    });

    test('should include previous messages in context', async () => {
      const mockResponse = {
        text: 'Based on our previous conversation, here is the information.',
        totalTokens: 20,
        latencyMs: 150,
      };

      mockAnthropicService.generateResponse.mockResolvedValue(mockResponse);

      const context = {
        messages: [
          { role: 'user', content: 'Tell me about your products' },
          { role: 'assistant', content: 'We have many products available' },
        ],
      };

      const result = await agent.generateResponse('What are the prices?', context);

      expect(result.text).toBe(mockResponse.text);
      expect(mockAnthropicService.generateResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          { role: 'user', content: 'Tell me about your products' },
          { role: 'assistant', content: 'We have many products available' },
          { role: 'user', content: 'What are the prices?' },
        ]),
        expect.any(String),
        expect.any(Object)
      );
    });

    test('should return fallback response on error', async () => {
      mockAnthropicService.generateResponse.mockRejectedValue(new Error('API error'));

      const context = { messages: [] };
      const result = await agent.generateResponse('Hello', context);

      expect(result.text).toContain("I'm having trouble processing");
      expect(result.model).toBe('fallback');
    });
  });

  describe('getConversationContext', () => {
    test('should retrieve context from database', async () => {
      const callSid = 'CA123456';

      mockDatabaseService.getConversationByCallSid.mockResolvedValue({
        success: true,
        data: {
          id: 'conv-uuid-123',
          call_sid: callSid,
          phone_number: '+1234567890',
          customer_id: 'customer-uuid',
          started_at: '2025-10-01T10:00:00Z',
          metadata: { source: 'inbound' },
        },
      });

      mockDatabaseService.getConversationMessages.mockResolvedValue({
        success: true,
        data: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
      });

      const context = await agent.getConversationContext(callSid);

      expect(context.conversationId).toBe('conv-uuid-123');
      expect(context.callSid).toBe(callSid);
      expect(context.messages).toHaveLength(2);
      expect(context.phoneNumber).toBe('+1234567890');
      expect(context.customerId).toBe('customer-uuid');
    });

    test('should cache context in active sessions', async () => {
      const callSid = 'CA123456';

      mockDatabaseService.getConversationByCallSid.mockResolvedValue({
        success: true,
        data: { id: 'conv-123', call_sid: callSid },
      });

      mockDatabaseService.getConversationMessages.mockResolvedValue({
        success: true,
        data: [],
      });

      // First call - should fetch from database
      await agent.getConversationContext(callSid);
      expect(mockDatabaseService.getConversationByCallSid).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await agent.getConversationContext(callSid);
      expect(mockDatabaseService.getConversationByCallSid).toHaveBeenCalledTimes(1);

      expect(agent.activeSessions.has(callSid)).toBe(true);
    });

    test('should return empty context if conversation not found', async () => {
      const callSid = 'CA999999';

      mockDatabaseService.getConversationByCallSid.mockResolvedValue({
        success: true,
        data: null,
      });

      const context = await agent.getConversationContext(callSid);

      expect(context.conversationId).toBeNull();
      expect(context.callSid).toBe(callSid);
      expect(context.messages).toEqual([]);
    });

    test('should handle database errors gracefully', async () => {
      const callSid = 'CA123456';

      mockDatabaseService.getConversationByCallSid.mockRejectedValue(new Error('DB error'));

      const context = await agent.getConversationContext(callSid);

      expect(context.conversationId).toBeNull();
      expect(context.messages).toEqual([]);
    });
  });

  describe('logMessage', () => {
    test('should log message to database successfully', async () => {
      const conversationId = 'conv-uuid-123';
      const role = 'user';
      const content = 'Hello';
      const metadata = { confidence: 0.95 };

      mockDatabaseService.createMessage.mockResolvedValue({ success: true });

      const result = await agent.logMessage(conversationId, role, content, metadata);

      expect(result.success).toBe(true);
      expect(mockDatabaseService.createMessage).toHaveBeenCalledWith(
        conversationId,
        role,
        content,
        metadata
      );
    });

    test('should handle database errors when logging', async () => {
      mockDatabaseService.createMessage.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const result = await agent.logMessage('conv-123', 'user', 'Hello');

      expect(result.success).toBe(false);
    });

    test('should handle exceptions when logging', async () => {
      mockDatabaseService.createMessage.mockRejectedValue(new Error('Exception'));

      const result = await agent.logMessage('conv-123', 'user', 'Hello');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Exception');
    });
  });

  describe('analyzeSentiment', () => {
    test('should detect positive sentiment', async () => {
      const text = 'This is great! I love this service. Excellent work!';
      const sentiment = await agent.analyzeSentiment(text);

      expect(sentiment.label).toBe('positive');
      expect(sentiment.score).toBeGreaterThan(0);
      expect(sentiment.needsEscalation).toBe(false);
    });

    test('should detect negative sentiment', async () => {
      const text = 'This is terrible. I hate this. Awful service!';
      const sentiment = await agent.analyzeSentiment(text);

      expect(sentiment.label).toBe('negative');
      expect(sentiment.score).toBeLessThan(0);
    });

    test('should detect neutral sentiment', async () => {
      const text = 'I need information about my account.';
      const sentiment = await agent.analyzeSentiment(text);

      expect(sentiment.label).toBe('neutral');
      expect(sentiment.score).toBe(0);
    });

    test('should flag escalation for customer requesting manager', async () => {
      const text = 'I want to speak to a manager right now!';
      const sentiment = await agent.analyzeSentiment(text);

      expect(sentiment.needsEscalation).toBe(true);
    });

    test('should flag escalation for highly negative sentiment', async () => {
      const text = 'This is the worst experience ever. Terrible, awful, bad!';
      const sentiment = await agent.analyzeSentiment(text);

      expect(sentiment.needsEscalation).toBe(true);
      expect(sentiment.label).toBe('negative');
    });

    test('should not flag escalation for mild negativity', async () => {
      const text = 'I had a bad experience but it is okay.';
      const sentiment = await agent.analyzeSentiment(text);

      expect(sentiment.needsEscalation).toBe(false);
    });

    test('should handle empty text', async () => {
      const sentiment = await agent.analyzeSentiment('');

      expect(sentiment.score).toBe(0);
      expect(sentiment.label).toBe('neutral');
    });
  });

  describe('TwiML Generation', () => {
    test('should generate valid TwiML for conversation', () => {
      const responseText = 'How can I help you today?';
      const twiml = agent.generateConversationTwiML(responseText);

      expect(twiml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(twiml).toContain('<Response>');
      expect(twiml).toContain('<Say voice="alice">How can I help you today?</Say>');
      expect(twiml).toContain('<Gather input="speech"');
      expect(twiml).toContain('</Response>');
    });

    test('should escape XML special characters', () => {
      const responseText = 'We have < & > " \' characters';
      const twiml = agent.generateConversationTwiML(responseText);

      expect(twiml).toContain('&lt;');
      expect(twiml).toContain('&amp;');
      expect(twiml).toContain('&gt;');
      expect(twiml).toContain('&quot;');
      expect(twiml).toContain('&apos;');
    });

    test('should generate repeat request TwiML', () => {
      const twiml = agent.generateRepeatRequestTwiML();

      expect(twiml).toContain("I didn't quite catch that");
      expect(twiml).toContain('<Gather input="speech"');
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when all services are healthy', async () => {
      const health = await agent.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details.openai.healthy).toBe(true);
      expect(health.details.anthropic.healthy).toBe(true);
      expect(health.details.activeSessions).toBe(0);
    });

    test('should return unhealthy if OpenAI is down', async () => {
      mockOpenAIService.healthCheck.mockResolvedValue({ healthy: false });

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details.openai.healthy).toBe(false);
    });

    test('should return unhealthy if Anthropic is down', async () => {
      mockAnthropicService.healthCheck.mockResolvedValue({ healthy: false });

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.details.anthropic.healthy).toBe(false);
    });

    test('should handle health check errors', async () => {
      mockOpenAIService.healthCheck.mockRejectedValue(new Error('Service error'));

      const health = await agent.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('shutdown', () => {
    test('should clear active sessions on shutdown', async () => {
      agent.activeSessions.set('CA123', {});
      agent.activeSessions.set('CA456', {});

      expect(agent.activeSessions.size).toBe(2);

      await agent.shutdown();

      expect(agent.activeSessions.size).toBe(0);
    });

    test('should handle shutdown errors gracefully', async () => {
      // Force an error during shutdown
      agent.activeSessions = {
        clear: jest.fn(() => {
          throw new Error('Clear failed');
        }),
      };

      // Should not throw
      await expect(agent.shutdown()).resolves.not.toThrow();
    });
  });
});
