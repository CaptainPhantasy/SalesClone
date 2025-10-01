/**
 * @fileoverview Comprehensive test suite for AnalyticsAgent
 * @author LegacyAI Analytics Agent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This test suite provides comprehensive coverage of all AnalyticsAgent functionality:
 * - Call status tracking
 * - Metrics tracking and aggregation
 * - Daily analytics calculation
 * - Sentiment trend analysis
 * - Escalation rate monitoring
 * - Daily report generation
 * - Error handling and edge cases
 */

const AnalyticsAgent = require('../src/agents/AnalyticsAgent');
const MetricsService = require('../src/services/MetricsService');

/**
 * Mock DatabaseService for testing
 * Provides in-memory data storage without requiring actual database
 */
class MockDatabaseService {
  constructor() {
    this.client = {
      from: (table) => ({
        select: () => ({
          gte: () => ({
            lte: () => ({
              then: (callback) => callback({ data: this.mockConversations, error: null })
            })
          })
        })
      })
    };
    this.mockConversations = [];
    this.mockAnalytics = [];
  }

  async initialize() {
    console.log(`[${new Date().toISOString()}] [INFO] [MockDatabaseService] Mock database initialized`);
  }

  async getConversationByCallSid(callSid) {
    const conversation = this.mockConversations.find(c => c.call_sid === callSid);
    return {
      success: !!conversation,
      data: conversation || null,
      error: conversation ? null : 'Conversation not found',
      timestamp: new Date().toISOString(),
      requestId: 'mock-request-id'
    };
  }

  async logCallAnalytics(analyticsData) {
    this.mockAnalytics.push(analyticsData);
    return {
      success: true,
      data: analyticsData,
      error: null,
      timestamp: new Date().toISOString(),
      requestId: 'mock-request-id'
    };
  }

  async getAnalytics(startDate, endDate) {
    const filtered = this.mockAnalytics.filter(a => {
      return a.date >= startDate && a.date <= endDate;
    });
    return {
      success: true,
      data: filtered,
      error: null,
      timestamp: new Date().toISOString(),
      requestId: 'mock-request-id'
    };
  }

  // Helper method to add mock data
  addMockConversation(conversation) {
    this.mockConversations.push(conversation);
  }

  // Helper method to reset mock data
  reset() {
    this.mockConversations = [];
    this.mockAnalytics = [];
  }
}

describe('AnalyticsAgent', () => {
  let analyticsAgent;
  let mockDatabaseService;
  let metricsService;

  beforeEach(() => {
    // Create mock services
    mockDatabaseService = new MockDatabaseService();
    metricsService = new MetricsService();

    // Create analytics agent with mocked dependencies
    analyticsAgent = new AnalyticsAgent({
      databaseService: mockDatabaseService,
      metricsService: metricsService
    });

    // Mock console methods to reduce test output noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset mocks and clear data
    mockDatabaseService.reset();
    jest.restoreAllMocks();
  });

  describe('Constructor and Initialization', () => {
    test('should create AnalyticsAgent instance', () => {
      expect(analyticsAgent).toBeInstanceOf(AnalyticsAgent);
      expect(analyticsAgent.databaseService).toBeDefined();
      expect(analyticsAgent.metricsService).toBeDefined();
    });

    test('should initialize successfully', async () => {
      await expect(analyticsAgent.initialize()).resolves.not.toThrow();
    });

    test('should have logger initialized', () => {
      expect(analyticsAgent.logger).toBeDefined();
      expect(analyticsAgent.logger.info).toBeDefined();
      expect(analyticsAgent.logger.error).toBeDefined();
    });
  });

  describe('getCallStatus', () => {
    test('should get call status successfully', async () => {
      // Setup mock data
      const mockConversation = {
        call_sid: 'CA123456',
        phone_number: '+1234567890',
        status: 'ended',
        agent_type: 'voice',
        started_at: '2025-10-01T10:00:00Z',
        ended_at: '2025-10-01T10:05:00Z',
        duration_seconds: 300,
        sentiment_score: 0.8,
        escalated: false,
        metadata: {}
      };

      mockDatabaseService.addMockConversation(mockConversation);

      const result = await analyticsAgent.getCallStatus('CA123456');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.callSid).toBe('CA123456');
      expect(result.data.status).toBe('ended');
      expect(result.data.durationSeconds).toBe(300);
      expect(result.error).toBeNull();
    });

    test('should handle non-existent call SID', async () => {
      const result = await analyticsAgent.getCallStatus('CA999999');

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    test('should validate callSid parameter', async () => {
      const result = await analyticsAgent.getCallStatus(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callSid');
    });

    test('should validate callSid type', async () => {
      const result = await analyticsAgent.getCallStatus(123);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid callSid');
    });
  });

  describe('trackCallMetrics', () => {
    test('should track call metrics successfully', async () => {
      const mockConversation = {
        call_sid: 'CA123456',
        phone_number: '+1234567890',
        duration_seconds: 120,
        sentiment_score: 0.7,
        escalated: false,
        status: 'ended',
        started_at: '2025-10-01T10:00:00Z',
        ended_at: '2025-10-01T10:02:00Z'
      };

      mockDatabaseService.addMockConversation(mockConversation);

      const result = await analyticsAgent.trackCallMetrics({
        callSid: 'CA123456',
        phoneNumber: '+1234567890',
        durationSeconds: 120,
        sentimentScore: 0.7,
        escalated: false,
        status: 'ended'
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.callSid).toBe('CA123456');
      expect(result.data.durationSeconds).toBe(120);
    });

    test('should require callSid parameter', async () => {
      const result = await analyticsAgent.trackCallMetrics({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('callSid is required');
    });

    test('should handle non-existent conversation', async () => {
      const result = await analyticsAgent.trackCallMetrics({
        callSid: 'CA999999'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Conversation not found');
    });
  });

  describe('calculateDailyAnalytics', () => {
    test('should calculate daily analytics successfully', async () => {
      // Add mock conversations for the day
      const date = '2025-10-01';
      mockDatabaseService.mockConversations = [
        {
          call_sid: 'CA001',
          phone_number: '+1111111111',
          status: 'ended',
          started_at: '2025-10-01T10:00:00Z',
          duration_seconds: 120,
          sentiment_score: 0.8,
          escalated: false
        },
        {
          call_sid: 'CA002',
          phone_number: '+1222222222',
          status: 'ended',
          started_at: '2025-10-01T11:00:00Z',
          duration_seconds: 180,
          sentiment_score: 0.6,
          escalated: false
        },
        {
          call_sid: 'CA003',
          phone_number: '+1333333333',
          status: 'escalated',
          started_at: '2025-10-01T12:00:00Z',
          duration_seconds: 90,
          sentiment_score: -0.2,
          escalated: true
        }
      ];

      const result = await analyticsAgent.calculateDailyAnalytics(date);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.total_calls).toBe(3);
      expect(result.data.successful_resolutions).toBe(2);
      expect(result.data.escalations).toBe(1);
      expect(result.data.unique_callers).toBe(3);
      expect(result.data.avg_duration_seconds).toBeGreaterThan(0);
      expect(result.data.avg_sentiment).toBeDefined();
    });

    test('should handle date with no calls', async () => {
      const result = await analyticsAgent.calculateDailyAnalytics('2025-10-15');

      expect(result.success).toBe(true);
      expect(result.data.total_calls).toBe(0);
      expect(result.data.avg_duration_seconds).toBe(0);
    });

    test('should validate date format', async () => {
      const result = await analyticsAgent.calculateDailyAnalytics('invalid-date');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    test('should require date parameter', async () => {
      const result = await analyticsAgent.calculateDailyAnalytics(null);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid date format');
    });

    test('should count unique callers correctly', async () => {
      mockDatabaseService.mockConversations = [
        {
          call_sid: 'CA001',
          phone_number: '+1111111111',
          status: 'ended',
          started_at: '2025-10-01T10:00:00Z',
          duration_seconds: 120,
          sentiment_score: 0.8,
          escalated: false
        },
        {
          call_sid: 'CA002',
          phone_number: '+1111111111', // Same caller
          status: 'ended',
          started_at: '2025-10-01T11:00:00Z',
          duration_seconds: 180,
          sentiment_score: 0.6,
          escalated: false
        }
      ];

      const result = await analyticsAgent.calculateDailyAnalytics('2025-10-01');

      expect(result.success).toBe(true);
      expect(result.data.total_calls).toBe(2);
      expect(result.data.unique_callers).toBe(1); // Only one unique caller
    });
  });

  describe('getSentimentTrends', () => {
    test('should get sentiment trends successfully', async () => {
      // Add mock analytics data
      mockDatabaseService.mockAnalytics = [
        { date: '2025-10-01', avg_sentiment: 0.5, total_calls: 10 },
        { date: '2025-10-02', avg_sentiment: 0.6, total_calls: 12 },
        { date: '2025-10-03', avg_sentiment: 0.7, total_calls: 15 }
      ];

      const result = await analyticsAgent.getSentimentTrends('2025-10-01', '2025-10-03');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.dataPoints).toHaveLength(3);
      expect(result.data.averageSentiment).toBeDefined();
      expect(result.data.trend).toBeDefined();
      expect(result.data.minSentiment).toBe(0.5);
      expect(result.data.maxSentiment).toBe(0.7);
    });

    test('should identify improving trend', async () => {
      mockDatabaseService.mockAnalytics = [
        { date: '2025-10-01', avg_sentiment: 0.3, total_calls: 10 },
        { date: '2025-10-02', avg_sentiment: 0.5, total_calls: 12 },
        { date: '2025-10-03', avg_sentiment: 0.7, total_calls: 15 }
      ];

      const result = await analyticsAgent.getSentimentTrends('2025-10-01', '2025-10-03');

      expect(result.success).toBe(true);
      expect(result.data.trend).toBe('improving');
    });

    test('should identify declining trend', async () => {
      mockDatabaseService.mockAnalytics = [
        { date: '2025-10-01', avg_sentiment: 0.7, total_calls: 10 },
        { date: '2025-10-02', avg_sentiment: 0.5, total_calls: 12 },
        { date: '2025-10-03', avg_sentiment: 0.3, total_calls: 15 }
      ];

      const result = await analyticsAgent.getSentimentTrends('2025-10-01', '2025-10-03');

      expect(result.success).toBe(true);
      expect(result.data.trend).toBe('declining');
    });

    test('should validate date formats', async () => {
      const result = await analyticsAgent.getSentimentTrends('invalid', '2025-10-03');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid startDate format');
    });

    test('should handle empty date range', async () => {
      const result = await analyticsAgent.getSentimentTrends('2025-10-01', '2025-10-03');

      expect(result.success).toBe(true);
      expect(result.data.dataPoints).toHaveLength(0);
    });
  });

  describe('getEscalationRate', () => {
    test('should calculate escalation rate successfully', async () => {
      mockDatabaseService.mockAnalytics = [
        { date: '2025-10-01', total_calls: 10, escalations: 2 },
        { date: '2025-10-02', total_calls: 15, escalations: 3 },
        { date: '2025-10-03', total_calls: 20, escalations: 5 }
      ];

      const result = await analyticsAgent.getEscalationRate('2025-10-01', '2025-10-03');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalCalls).toBe(45);
      expect(result.data.totalEscalations).toBe(10);
      expect(result.data.escalationRate).toBeCloseTo(22.22, 1);
      expect(result.data.dailyBreakdown).toHaveLength(3);
    });

    test('should handle zero calls', async () => {
      mockDatabaseService.mockAnalytics = [];

      const result = await analyticsAgent.getEscalationRate('2025-10-01', '2025-10-03');

      expect(result.success).toBe(true);
      expect(result.data.totalCalls).toBe(0);
      expect(result.data.escalationRate).toBe(0);
    });

    test('should validate date formats', async () => {
      const result = await analyticsAgent.getEscalationRate('2025-10-01', 'invalid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid endDate format');
    });

    test('should include daily breakdown', async () => {
      mockDatabaseService.mockAnalytics = [
        { date: '2025-10-01', total_calls: 10, escalations: 2 },
        { date: '2025-10-02', total_calls: 20, escalations: 4 }
      ];

      const result = await analyticsAgent.getEscalationRate('2025-10-01', '2025-10-02');

      expect(result.success).toBe(true);
      expect(result.data.dailyBreakdown).toHaveLength(2);
      expect(result.data.dailyBreakdown[0].escalationRate).toBe(20);
      expect(result.data.dailyBreakdown[1].escalationRate).toBe(20);
    });
  });

  describe('generateDailyReport', () => {
    test('should generate daily report successfully', async () => {
      // Setup mock data for today
      const today = new Date().toISOString().split('T')[0];
      mockDatabaseService.mockConversations = [
        {
          call_sid: 'CA001',
          phone_number: '+1111111111',
          status: 'ended',
          started_at: `${today}T10:00:00Z`,
          duration_seconds: 120,
          sentiment_score: 0.8,
          escalated: false
        }
      ];

      const result = await analyticsAgent.generateDailyReport();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.date).toBe(today);
      expect(result.data.metrics).toBeDefined();
      expect(result.data.trends).toBeDefined();
      expect(result.data.insights).toBeDefined();
      expect(result.data.summary).toBeDefined();
    });

    test('should include insights in report', async () => {
      const today = new Date().toISOString().split('T')[0];
      mockDatabaseService.mockConversations = [
        {
          call_sid: 'CA001',
          phone_number: '+1111111111',
          status: 'ended',
          started_at: `${today}T10:00:00Z`,
          duration_seconds: 120,
          sentiment_score: 0.8,
          escalated: false
        }
      ];

      const result = await analyticsAgent.generateDailyReport();

      expect(result.success).toBe(true);
      expect(result.data.insights).toBeInstanceOf(Array);
      expect(result.data.insights.length).toBeGreaterThan(0);
    });

    test('should handle no calls today', async () => {
      const result = await analyticsAgent.generateDailyReport();

      expect(result.success).toBe(true);
      expect(result.data.metrics.total_calls).toBe(0);
    });
  });

  describe('Health Check', () => {
    test('should pass health check when services are available', async () => {
      const health = await analyticsAgent.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details.database).toBe(true);
      expect(health.details.metricsService).toBe(true);
      expect(health.timestamp).toBeDefined();
    });
  });

  describe('Shutdown', () => {
    test('should shutdown gracefully', async () => {
      await expect(analyticsAgent.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Create agent with broken database service
      const brokenDb = {
        client: null,
        initialize: async () => { throw new Error('Database error'); }
      };

      const brokenAgent = new AnalyticsAgent({
        databaseService: brokenDb,
        metricsService: metricsService
      });

      await expect(brokenAgent.initialize()).rejects.toThrow();
    });

    test('should return proper APIResponse format', async () => {
      const result = await analyticsAgent.getCallStatus('CA123456');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('requestId');
    });

    test('should generate unique request IDs', () => {
      const id1 = analyticsAgent.generateRequestId();
      const id2 = analyticsAgent.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });
});

describe('MetricsService', () => {
  let metricsService;

  beforeEach(() => {
    metricsService = new MetricsService();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateAverageDuration', () => {
    test('should calculate average duration correctly', () => {
      const calls = [
        { duration_seconds: 120 },
        { duration_seconds: 180 },
        { duration_seconds: 90 }
      ];

      const avg = metricsService.calculateAverageDuration(calls);

      expect(avg).toBe(130);
    });

    test('should handle empty array', () => {
      const avg = metricsService.calculateAverageDuration([]);

      expect(avg).toBe(0);
    });

    test('should filter out invalid durations', () => {
      const calls = [
        { duration_seconds: 120 },
        { duration_seconds: null },
        { duration_seconds: 180 }
      ];

      const avg = metricsService.calculateAverageDuration(calls);

      expect(avg).toBe(150);
    });
  });

  describe('calculateAverageSentiment', () => {
    test('should calculate average sentiment correctly', () => {
      const calls = [
        { sentiment_score: 0.8 },
        { sentiment_score: 0.6 },
        { sentiment_score: -0.2 }
      ];

      const avg = metricsService.calculateAverageSentiment(calls);

      expect(avg).toBeCloseTo(0.4, 1);
    });

    test('should filter out invalid sentiment scores', () => {
      const calls = [
        { sentiment_score: 0.8 },
        { sentiment_score: 5 }, // Invalid: > 1
        { sentiment_score: 0.6 }
      ];

      const avg = metricsService.calculateAverageSentiment(calls);

      expect(avg).toBe(0.7);
    });
  });

  describe('calculateSuccessRate', () => {
    test('should calculate success rate correctly', () => {
      const calls = [
        { escalated: false, status: 'ended' },
        { escalated: false, status: 'ended' },
        { escalated: true, status: 'escalated' }
      ];

      const rate = metricsService.calculateSuccessRate(calls);

      expect(rate).toBeCloseTo(66.67, 1);
    });

    test('should exclude active calls', () => {
      const calls = [
        { escalated: false, status: 'ended' },
        { escalated: false, status: 'active' } // Should be excluded
      ];

      const rate = metricsService.calculateSuccessRate(calls);

      expect(rate).toBe(100);
    });
  });

  describe('calculateEscalationRate', () => {
    test('should calculate escalation rate correctly', () => {
      const calls = [
        { escalated: false, status: 'ended' },
        { escalated: true, status: 'escalated' },
        { escalated: true, status: 'escalated' }
      ];

      const rate = metricsService.calculateEscalationRate(calls);

      expect(rate).toBeCloseTo(66.67, 1);
    });
  });

  describe('identifyTrends', () => {
    test('should identify improving trend', () => {
      const dataPoints = [
        { date: '2025-10-01', value: 0.3 },
        { date: '2025-10-02', value: 0.5 },
        { date: '2025-10-03', value: 0.7 }
      ];

      const trend = metricsService.identifyTrends(dataPoints);

      expect(trend.direction).toBe('improving');
      expect(trend.strength).toBeGreaterThan(0);
      expect(trend.summary).toBeDefined();
    });

    test('should identify declining trend', () => {
      const dataPoints = [
        { date: '2025-10-01', value: 0.7 },
        { date: '2025-10-02', value: 0.5 },
        { date: '2025-10-03', value: 0.3 }
      ];

      const trend = metricsService.identifyTrends(dataPoints);

      expect(trend.direction).toBe('declining');
    });

    test('should identify stable trend', () => {
      const dataPoints = [
        { date: '2025-10-01', value: 0.5 },
        { date: '2025-10-02', value: 0.5 },
        { date: '2025-10-03', value: 0.5 }
      ];

      const trend = metricsService.identifyTrends(dataPoints);

      expect(trend.direction).toBe('stable');
    });

    test('should handle insufficient data', () => {
      const dataPoints = [{ date: '2025-10-01', value: 0.5 }];

      const trend = metricsService.identifyTrends(dataPoints);

      expect(trend.direction).toBe('stable');
      expect(trend.strength).toBe(0);
    });
  });

  describe('generateSummary', () => {
    test('should generate summary with all metrics', () => {
      const metrics = {
        totalCalls: 100,
        escalationRate: 15.5,
        successRate: 84.5,
        avgSentiment: 0.75,
        avgDuration: 125
      };

      const summary = metricsService.generateSummary(metrics);

      expect(summary).toContain('100');
      expect(summary).toContain('15.5');
      expect(summary).toContain('84.5');
      expect(summary).toContain('0.75');
    });

    test('should handle partial metrics', () => {
      const metrics = {
        totalCalls: 50
      };

      const summary = metricsService.generateSummary(metrics);

      expect(summary).toContain('50');
    });
  });

  describe('exportToJSON', () => {
    test('should export metrics to JSON', () => {
      const metrics = {
        date: '2025-10-01',
        total_calls: 10,
        avg_sentiment: 0.8
      };

      const json = metricsService.exportToJSON(metrics);

      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).toContain('2025-10-01');
      expect(json).toContain('10');
    });
  });

  describe('exportToCSV', () => {
    test('should export metrics to CSV', () => {
      const metricsArray = [
        { date: '2025-10-01', total_calls: 10, avg_sentiment: 0.8 },
        { date: '2025-10-02', total_calls: 15, avg_sentiment: 0.7 }
      ];

      const csv = metricsService.exportToCSV(metricsArray);

      expect(csv).toContain('date');
      expect(csv).toContain('total_calls');
      expect(csv).toContain('2025-10-01');
      expect(csv).toContain('2025-10-02');
    });

    test('should handle empty array', () => {
      const csv = metricsService.exportToCSV([]);

      expect(csv).toBe('');
    });

    test('should escape CSV special characters', () => {
      const metricsArray = [
        { date: '2025-10-01', note: 'Value with, comma' }
      ];

      const csv = metricsService.exportToCSV(metricsArray);

      expect(csv).toContain('"Value with, comma"');
    });
  });
});
