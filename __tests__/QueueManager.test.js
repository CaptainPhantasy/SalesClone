/**
 * @fileoverview Comprehensive test suite for QueueManager
 * @author LegacyAI Subagent Fleet - Queue Agent
 * @created 2025-10-01T16:00:00Z
 * @lastModified 2025-10-01T16:00:00Z
 *
 * Tests cover:
 * - Queue initialization
 * - Job adding (calls, analytics, integrations)
 * - Worker setup
 * - Job processing
 * - Retry logic
 * - Error handling
 * - Metrics tracking
 * - Graceful shutdown
 */

const QueueManager = require('../src/services/QueueManager');
const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');

// Mock dependencies
jest.mock('bullmq');
jest.mock('ioredis');

describe('QueueManager', () => {
  let queueManager;
  let mockConnection;
  let mockQueue;
  let mockWorker;
  let mockQueueEvents;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Redis connection
    mockConnection = {
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    Redis.mockImplementation(() => mockConnection);

    // Mock Queue
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      close: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(5),
    };

    Queue.mockImplementation(() => mockQueue);

    // Mock Worker
    mockWorker = {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    Worker.mockImplementation(() => mockWorker);

    // Mock QueueEvents
    mockQueueEvents = {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };

    QueueEvents.mockImplementation(() => mockQueueEvents);

    // Create QueueManager instance
    queueManager = new QueueManager({
      redisUrl: 'redis-12345.upstash.io:6379',
      redisToken: 'test-token',
      queuePrefix: 'test:',
    });
  });

  afterEach(async () => {
    // Cleanup
    if (queueManager) {
      try {
        await queueManager.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });

  describe('Initialization', () => {
    test('should create QueueManager instance', () => {
      expect(queueManager).toBeDefined();
      expect(queueManager.config).toEqual({
        redisUrl: 'redis-12345.upstash.io:6379',
        redisToken: 'test-token',
        queuePrefix: 'test:',
      });
    });

    test('should create Redis connection with correct config', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis-12345.upstash.io',
          port: 6379,
          password: 'test-token',
          tls: expect.any(Object),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        })
      );
    });

    test('should create three queues (calls, analytics, integrations)', () => {
      expect(Queue).toHaveBeenCalledTimes(3);
      expect(Queue).toHaveBeenCalledWith('voice-calls', expect.any(Object));
      expect(Queue).toHaveBeenCalledWith('voice-analytics', expect.any(Object));
      expect(Queue).toHaveBeenCalledWith('voice-integrations', expect.any(Object));
    });

    test('should create queue events for monitoring', () => {
      expect(QueueEvents).toHaveBeenCalledTimes(3);
    });

    test('should setup connection event listeners', () => {
      expect(mockConnection.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should initialize metrics tracking', () => {
      expect(queueManager.metrics).toEqual({
        totalJobsAdded: 0,
        totalJobsCompleted: 0,
        totalJobsFailed: 0,
        jobsAddedByType: {},
        jobsCompletedByType: {},
        jobsFailedByType: {},
      });
    });
  });

  describe('addCallToQueue', () => {
    test('should add transcribe job to calls queue', async () => {
      const result = await queueManager.addCallToQueue(
        'CA123456',
        'transcribe',
        { audioUrl: 'https://example.com/audio.mp3' }
      );

      expect(result.success).toBe(true);
      expect(result.data.callSid).toBe('CA123456');
      expect(result.data.action).toBe('transcribe');
      expect(result.data.queueName).toBe('voice-calls');
      expect(mockQueue.add).toHaveBeenCalled();
    });

    test('should add analyze job to calls queue', async () => {
      const result = await queueManager.addCallToQueue(
        'CA123456',
        'analyze',
        { conversationId: 'conv-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('analyze');
    });

    test('should add post_call_actions job to calls queue', async () => {
      const result = await queueManager.addCallToQueue(
        'CA123456',
        'post_call_actions',
        { conversationId: 'conv-123' }
      );

      expect(result.success).toBe(true);
      expect(result.data.action).toBe('post_call_actions');
    });

    test('should reject invalid action type', async () => {
      const result = await queueManager.addCallToQueue(
        'CA123456',
        'invalid_action',
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action type');
    });

    test('should set custom priority', async () => {
      await queueManager.addCallToQueue(
        'CA123456',
        'transcribe',
        { audioUrl: 'https://example.com/audio.mp3' },
        8
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'call-transcribe',
        expect.objectContaining({
          priority: 8,
        }),
        expect.objectContaining({
          priority: 8,
        })
      );
    });

    test('should update metrics when job is added', async () => {
      await queueManager.addCallToQueue('CA123456', 'transcribe', {});

      expect(queueManager.metrics.totalJobsAdded).toBe(1);
      expect(queueManager.metrics.jobsAddedByType.transcribe).toBe(1);
    });

    test('should handle queue errors gracefully', async () => {
      mockQueue.add.mockRejectedValueOnce(new Error('Queue error'));

      const result = await queueManager.addCallToQueue('CA123456', 'transcribe', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Queue error');
    });

    test('should generate unique job ID', async () => {
      await queueManager.addCallToQueue('CA123456', 'transcribe', {});

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          jobId: expect.stringMatching(/^CA123456-transcribe-\d+$/),
        })
      );
    });
  });

  describe('addAnalyticsJob', () => {
    test('should add daily_aggregation job to analytics queue', async () => {
      const result = await queueManager.addAnalyticsJob(
        'daily_aggregation',
        { date: '2025-10-01' }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('daily_aggregation');
      expect(result.data.queueName).toBe('voice-analytics');
    });

    test('should add sentiment_analysis job to analytics queue', async () => {
      const result = await queueManager.addAnalyticsJob(
        'sentiment_analysis',
        { conversationIds: ['conv-1', 'conv-2'] }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('sentiment_analysis');
    });

    test('should add trend_calculation job to analytics queue', async () => {
      const result = await queueManager.addAnalyticsJob(
        'trend_calculation',
        { startDate: '2025-10-01', endDate: '2025-10-07' }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('trend_calculation');
    });

    test('should reject invalid analytics type', async () => {
      const result = await queueManager.addAnalyticsJob('invalid_type', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid analytics type');
    });

    test('should use lower default priority for analytics jobs', async () => {
      await queueManager.addAnalyticsJob('daily_aggregation', {});

      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          priority: 3,
        }),
        expect.objectContaining({
          priority: 3,
        })
      );
    });

    test('should update metrics when analytics job is added', async () => {
      await queueManager.addAnalyticsJob('daily_aggregation', {});

      expect(queueManager.metrics.totalJobsAdded).toBe(1);
      expect(queueManager.metrics.jobsAddedByType.daily_aggregation).toBe(1);
    });
  });

  describe('addIntegrationJob', () => {
    test('should add webhook_delivery job to integrations queue', async () => {
      const result = await queueManager.addIntegrationJob(
        'webhook_delivery',
        { url: 'https://example.com/webhook', payload: {} }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('webhook_delivery');
      expect(result.data.queueName).toBe('voice-integrations');
    });

    test('should add email_send job to integrations queue', async () => {
      const result = await queueManager.addIntegrationJob(
        'email_send',
        { to: 'test@example.com', subject: 'Test' }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('email_send');
    });

    test('should add customer_sync job to integrations queue', async () => {
      const result = await queueManager.addIntegrationJob(
        'customer_sync',
        { customerId: 'cust-123', action: 'update' }
      );

      expect(result.success).toBe(true);
      expect(result.data.type).toBe('customer_sync');
    });

    test('should reject invalid integration type', async () => {
      const result = await queueManager.addIntegrationJob('invalid_type', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid integration type');
    });

    test('should update metrics when integration job is added', async () => {
      await queueManager.addIntegrationJob('webhook_delivery', {});

      expect(queueManager.metrics.totalJobsAdded).toBe(1);
      expect(queueManager.metrics.jobsAddedByType.webhook_delivery).toBe(1);
    });
  });

  describe('setupWorkers', () => {
    test('should setup workers with processors', async () => {
      const mockProcessors = {
        callProcessor: jest.fn(),
        analyticsProcessor: jest.fn(),
        integrationProcessor: jest.fn(),
      };

      await queueManager.setupWorkers(mockProcessors);

      expect(Worker).toHaveBeenCalledTimes(3);
      expect(queueManager.workers).toHaveLength(3);
    });

    test('should setup call worker with correct concurrency', async () => {
      const mockProcessors = {
        callProcessor: jest.fn(),
      };

      await queueManager.setupWorkers(mockProcessors);

      expect(Worker).toHaveBeenCalledWith(
        'voice-calls',
        mockProcessors.callProcessor,
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });

    test('should setup analytics worker with correct concurrency', async () => {
      const mockProcessors = {
        analyticsProcessor: jest.fn(),
      };

      await queueManager.setupWorkers(mockProcessors);

      expect(Worker).toHaveBeenCalledWith(
        'voice-analytics',
        mockProcessors.analyticsProcessor,
        expect.objectContaining({
          concurrency: 3,
        })
      );
    });

    test('should setup integration worker with correct concurrency', async () => {
      const mockProcessors = {
        integrationProcessor: jest.fn(),
      };

      await queueManager.setupWorkers(mockProcessors);

      expect(Worker).toHaveBeenCalledWith(
        'voice-integrations',
        mockProcessors.integrationProcessor,
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });

    test('should setup worker event listeners', async () => {
      const mockProcessors = {
        callProcessor: jest.fn(),
      };

      await queueManager.setupWorkers(mockProcessors);

      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    test('should handle partial processor setup', async () => {
      const mockProcessors = {
        callProcessor: jest.fn(),
        // Only call processor provided
      };

      await queueManager.setupWorkers(mockProcessors);

      expect(Worker).toHaveBeenCalledTimes(1);
      expect(queueManager.workers).toHaveLength(1);
    });
  });

  describe('getMetrics', () => {
    test('should return current metrics', async () => {
      // Add some jobs to update metrics
      await queueManager.addCallToQueue('CA123', 'transcribe', {});
      await queueManager.addAnalyticsJob('daily_aggregation', {});

      const result = await queueManager.getMetrics();

      expect(result.success).toBe(true);
      expect(result.data.totalJobsAdded).toBe(2);
      expect(result.data.currentQueueCounts).toBeDefined();
      expect(result.data.currentQueueCounts.calls).toBe(5);
    });

    test('should include queue counts', async () => {
      const result = await queueManager.getMetrics();

      expect(mockQueue.count).toHaveBeenCalled();
      expect(result.data.currentQueueCounts.calls).toBe(5);
      expect(result.data.currentQueueCounts.analytics).toBe(5);
      expect(result.data.currentQueueCounts.integrations).toBe(5);
    });

    test('should include worker count', async () => {
      await queueManager.setupWorkers({
        callProcessor: jest.fn(),
        analyticsProcessor: jest.fn(),
      });

      const result = await queueManager.getMetrics();

      expect(result.data.workers).toBe(2);
    });

    test('should handle metrics errors gracefully', async () => {
      mockQueue.count.mockRejectedValueOnce(new Error('Count error'));

      const result = await queueManager.getMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Count error');
    });
  });

  describe('shutdown', () => {
    test('should close all workers', async () => {
      await queueManager.setupWorkers({
        callProcessor: jest.fn(),
        analyticsProcessor: jest.fn(),
        integrationProcessor: jest.fn(),
      });

      await queueManager.shutdown();

      expect(mockWorker.close).toHaveBeenCalledTimes(3);
    });

    test('should close all queues', async () => {
      await queueManager.shutdown();

      expect(mockQueue.close).toHaveBeenCalledTimes(3);
    });

    test('should close queue events', async () => {
      await queueManager.shutdown();

      expect(mockQueueEvents.close).toHaveBeenCalledTimes(3);
    });

    test('should close Redis connection', async () => {
      await queueManager.shutdown();

      expect(mockConnection.quit).toHaveBeenCalled();
    });

    test('should handle shutdown errors', async () => {
      mockQueue.close.mockRejectedValueOnce(new Error('Shutdown error'));

      await expect(queueManager.shutdown()).rejects.toThrow('Shutdown error');
    });
  });

  describe('Retry Logic', () => {
    test('should configure exponential backoff', () => {
      expect(Queue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          }),
        })
      );
    });

    test('should configure job retention', () => {
      expect(Queue).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            removeOnComplete: {
              age: 86400,
              count: 1000,
            },
            removeOnFail: {
              age: 172800,
            },
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing priority parameter', async () => {
      const result = await queueManager.addCallToQueue('CA123', 'transcribe', {});

      expect(result.success).toBe(true);
      expect(result.data.priority).toBe(5); // Default priority
    });

    test('should handle empty data object', async () => {
      const result = await queueManager.addCallToQueue('CA123', 'transcribe', {});

      expect(result.success).toBe(true);
    });

    test('should generate unique request IDs', async () => {
      const result1 = await queueManager.addCallToQueue('CA123', 'transcribe', {});
      const result2 = await queueManager.addCallToQueue('CA124', 'transcribe', {});

      expect(result1.requestId).toBeDefined();
      expect(result2.requestId).toBeDefined();
      expect(result1.requestId).not.toBe(result2.requestId);
    });

    test('should handle concurrent job additions', async () => {
      const promises = [
        queueManager.addCallToQueue('CA123', 'transcribe', {}),
        queueManager.addCallToQueue('CA124', 'analyze', {}),
        queueManager.addAnalyticsJob('daily_aggregation', {}),
        queueManager.addIntegrationJob('webhook_delivery', {}),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      expect(results.every(r => r.success)).toBe(true);
      expect(queueManager.metrics.totalJobsAdded).toBe(4);
    });
  });

  describe('generateRequestId', () => {
    test('should generate valid UUID v4', () => {
      const requestId = queueManager.generateRequestId();

      expect(requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    test('should generate unique IDs', () => {
      const id1 = queueManager.generateRequestId();
      const id2 = queueManager.generateRequestId();
      const id3 = queueManager.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });
  });
});
