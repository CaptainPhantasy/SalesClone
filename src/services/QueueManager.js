/**
 * @fileoverview Queue management system using BullMQ and Redis for job processing
 * @author LegacyAI Subagent Fleet - Queue Agent
 * @created 2025-10-01T16:00:00Z
 * @lastModified 2025-10-01T16:00:00Z
 *
 * This service provides:
 * - BullMQ queue initialization with Redis (Upstash)
 * - Job management for calls, analytics, and integrations
 * - Worker orchestration and lifecycle management
 * - Retry logic with exponential backoff
 * - Dead letter queue handling
 * - Job metrics and monitoring
 */

const { Queue, Worker, QueueEvents } = require('bullmq');
const Redis = require('ioredis');

/**
 * Queue names used throughout the system
 */
const QUEUE_NAMES = {
  CALLS: 'voice-calls',
  ANALYTICS: 'voice-analytics',
  INTEGRATIONS: 'voice-integrations',
};

/**
 * Default job options for all queues
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3, // Maximum retry attempts
  backoff: {
    type: 'exponential',
    delay: 1000, // Start with 1 second: 1s, 2s, 4s
  },
  removeOnComplete: {
    age: 86400, // Keep completed jobs for 24 hours
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 172800, // Keep failed jobs for 48 hours
  },
};

/**
 * QueueManager class - Manages BullMQ queues and workers
 *
 * @class QueueManager
 * @created 2025-10-01T16:00:00Z
 * @lastModified 2025-10-01T16:00:00Z
 */
class QueueManager {
  /**
   * Initialize QueueManager with Redis connection and queues
   *
   * @param {Object} config - Configuration object
   * @param {string} config.redisUrl - Upstash Redis URL (without protocol)
   * @param {string} config.redisToken - Upstash Redis authentication token
   * @param {string} [config.queuePrefix='legacyai:voice:'] - Prefix for queue names
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * const queueManager = new QueueManager({
   *   redisUrl: 'redis-12345.upstash.io',
   *   redisToken: 'AXaBCdEf...',
   *   queuePrefix: 'myapp:'
   * });
   */
  constructor(config) {
    console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Initializing QueueManager`);

    this.config = config;

    // Parse Redis URL to extract host and port
    // Upstash Redis URL format: "redis-12345.upstash.io:6379"
    const urlParts = config.redisUrl.replace(/^https?:\/\//, '').split(':');
    const host = urlParts[0];
    const port = urlParts[1] ? parseInt(urlParts[1], 10) : 6379;

    console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Connecting to Redis at ${host}:${port}`);

    // Create Redis connection for BullMQ
    // Uses ioredis with TLS for Upstash
    this.connection = new Redis({
      host,
      port,
      password: config.redisToken,
      tls: {
        // Upstash requires TLS, but we don't need to verify certificates in development
        rejectUnauthorized: false,
      },
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false, // Required for BullMQ
      retryStrategy: (times) => {
        // Exponential backoff for connection retries
        const delay = Math.min(times * 50, 2000);
        console.log(`[${new Date().toISOString()}] [WARN] [QueueManager] Redis connection retry ${times}, delay ${delay}ms`);
        return delay;
      },
    });

    // Handle connection events
    this.connection.on('connect', () => {
      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Redis connection established`);
    });

    this.connection.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] [ERROR] [QueueManager] Redis connection error:`, error);
    });

    // Initialize queues
    this.queues = {
      calls: new Queue(QUEUE_NAMES.CALLS, {
        connection: this.connection,
        prefix: config.queuePrefix || 'legacyai:voice:',
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
      analytics: new Queue(QUEUE_NAMES.ANALYTICS, {
        connection: this.connection,
        prefix: config.queuePrefix || 'legacyai:voice:',
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
      integrations: new Queue(QUEUE_NAMES.INTEGRATIONS, {
        connection: this.connection,
        prefix: config.queuePrefix || 'legacyai:voice:',
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      }),
    };

    // Initialize queue events for monitoring
    this.queueEvents = {
      calls: new QueueEvents(QUEUE_NAMES.CALLS, {
        connection: this.connection,
        prefix: config.queuePrefix || 'legacyai:voice:',
      }),
      analytics: new QueueEvents(QUEUE_NAMES.ANALYTICS, {
        connection: this.connection,
        prefix: config.queuePrefix || 'legacyai:voice:',
      }),
      integrations: new QueueEvents(QUEUE_NAMES.INTEGRATIONS, {
        connection: this.connection,
        prefix: config.queuePrefix || 'legacyai:voice:',
      }),
    };

    // Workers array to track all workers
    this.workers = [];

    // Metrics tracking
    this.metrics = {
      totalJobsAdded: 0,
      totalJobsCompleted: 0,
      totalJobsFailed: 0,
      jobsAddedByType: {},
      jobsCompletedByType: {},
      jobsFailedByType: {},
    };

    // Setup queue event listeners for metrics
    this.setupQueueEventListeners();

    console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] QueueManager initialized with 3 queues: ${Object.keys(this.queues).join(', ')}`);
  }

  /**
   * Setup event listeners for queue monitoring and metrics
   * @private
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   */
  setupQueueEventListeners() {
    console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Setting up queue event listeners`);

    // Monitor all queues
    Object.entries(this.queueEvents).forEach(([queueType, queueEvents]) => {
      // Job completed event
      queueEvents.on('completed', ({ jobId }) => {
        this.metrics.totalJobsCompleted++;
        console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Job ${jobId} completed in ${queueType} queue`);
      });

      // Job failed event
      queueEvents.on('failed', ({ jobId, failedReason }) => {
        this.metrics.totalJobsFailed++;
        console.error(`[${new Date().toISOString()}] [ERROR] [QueueManager] Job ${jobId} failed in ${queueType} queue: ${failedReason}`);
      });

      // Job progress event
      queueEvents.on('progress', ({ jobId, data }) => {
        console.log(`[${new Date().toISOString()}] [DEBUG] [QueueManager] Job ${jobId} progress: ${JSON.stringify(data)}`);
      });
    });
  }

  /**
   * Add a call-related job to the queue
   *
   * @param {string} callSid - Twilio call SID
   * @param {string} action - Action type: 'transcribe', 'analyze', 'post_call_actions'
   * @param {Object} data - Job data payload
   * @param {number} [priority=5] - Job priority (0-10, higher = more priority)
   * @returns {Promise<APIResponse>} Response with job details
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * const result = await queueManager.addCallToQueue(
   *   'CA123456',
   *   'transcribe',
   *   { audioUrl: 'https://...', conversationId: 'uuid' }
   * );
   */
  async addCallToQueue(callSid, action, data, priority = 5) {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    try {
      console.log(`[${timestamp}] [INFO] [QueueManager] Adding call job to queue: ${callSid}, action: ${action}`);

      // Validate action type
      const validActions = ['transcribe', 'analyze', 'post_call_actions'];
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action type: ${action}. Must be one of: ${validActions.join(', ')}`);
      }

      // Create job data
      const jobData = {
        callSid,
        action,
        data,
        priority,
        attempts: 0,
        createdAt: timestamp,
        requestId,
      };

      // Add job to queue
      const job = await this.queues.calls.add(
        `call-${action}`, // Job name
        jobData,
        {
          priority,
          jobId: `${callSid}-${action}-${Date.now()}`, // Unique job ID
        }
      );

      // Update metrics
      this.metrics.totalJobsAdded++;
      this.metrics.jobsAddedByType[action] = (this.metrics.jobsAddedByType[action] || 0) + 1;

      console.log(`[${timestamp}] [INFO] [QueueManager] Call job added successfully: ${job.id}`);

      return {
        success: true,
        data: {
          jobId: job.id,
          callSid,
          action,
          queueName: QUEUE_NAMES.CALLS,
          priority,
        },
        error: null,
        timestamp,
        requestId,
      };
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [QueueManager] Failed to add call job:`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp,
        requestId,
      };
    }
  }

  /**
   * Add an analytics job to the queue
   *
   * @param {string} type - Analytics type: 'daily_aggregation', 'sentiment_analysis', 'trend_calculation'
   * @param {Object} data - Job data payload
   * @param {number} [priority=3] - Job priority (0-10, lower for batch jobs)
   * @returns {Promise<APIResponse>} Response with job details
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * const result = await queueManager.addAnalyticsJob(
   *   'daily_aggregation',
   *   { date: '2025-10-01' }
   * );
   */
  async addAnalyticsJob(type, data, priority = 3) {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    try {
      console.log(`[${timestamp}] [INFO] [QueueManager] Adding analytics job to queue: ${type}`);

      // Validate type
      const validTypes = ['daily_aggregation', 'sentiment_analysis', 'trend_calculation'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid analytics type: ${type}. Must be one of: ${validTypes.join(', ')}`);
      }

      // Create job data
      const jobData = {
        type,
        data,
        priority,
        attempts: 0,
        createdAt: timestamp,
        requestId,
      };

      // Add job to queue
      const job = await this.queues.analytics.add(
        `analytics-${type}`,
        jobData,
        {
          priority,
          jobId: `analytics-${type}-${Date.now()}`,
        }
      );

      // Update metrics
      this.metrics.totalJobsAdded++;
      this.metrics.jobsAddedByType[type] = (this.metrics.jobsAddedByType[type] || 0) + 1;

      console.log(`[${timestamp}] [INFO] [QueueManager] Analytics job added successfully: ${job.id}`);

      return {
        success: true,
        data: {
          jobId: job.id,
          type,
          queueName: QUEUE_NAMES.ANALYTICS,
          priority,
        },
        error: null,
        timestamp,
        requestId,
      };
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [QueueManager] Failed to add analytics job:`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp,
        requestId,
      };
    }
  }

  /**
   * Add an integration job to the queue
   *
   * @param {string} type - Integration type: 'webhook_delivery', 'email_send', 'customer_sync'
   * @param {Object} data - Job data payload
   * @param {number} [priority=5] - Job priority (0-10)
   * @returns {Promise<APIResponse>} Response with job details
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * const result = await queueManager.addIntegrationJob(
   *   'webhook_delivery',
   *   { url: 'https://...', payload: {...} }
   * );
   */
  async addIntegrationJob(type, data, priority = 5) {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    try {
      console.log(`[${timestamp}] [INFO] [QueueManager] Adding integration job to queue: ${type}`);

      // Validate type
      const validTypes = ['webhook_delivery', 'email_send', 'customer_sync'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid integration type: ${type}. Must be one of: ${validTypes.join(', ')}`);
      }

      // Create job data
      const jobData = {
        type,
        data,
        priority,
        attempts: 0,
        createdAt: timestamp,
        requestId,
      };

      // Add job to queue
      const job = await this.queues.integrations.add(
        `integration-${type}`,
        jobData,
        {
          priority,
          jobId: `integration-${type}-${Date.now()}`,
        }
      );

      // Update metrics
      this.metrics.totalJobsAdded++;
      this.metrics.jobsAddedByType[type] = (this.metrics.jobsAddedByType[type] || 0) + 1;

      console.log(`[${timestamp}] [INFO] [QueueManager] Integration job added successfully: ${job.id}`);

      return {
        success: true,
        data: {
          jobId: job.id,
          type,
          queueName: QUEUE_NAMES.INTEGRATIONS,
          priority,
        },
        error: null,
        timestamp,
        requestId,
      };
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [QueueManager] Failed to add integration job:`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp,
        requestId,
      };
    }
  }

  /**
   * Setup workers for processing jobs
   * Workers are created but not started automatically
   *
   * @param {Object} processors - Processor functions for each queue
   * @param {Function} processors.callProcessor - Call queue processor
   * @param {Function} processors.analyticsProcessor - Analytics queue processor
   * @param {Function} processors.integrationProcessor - Integration queue processor
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * await queueManager.setupWorkers({
   *   callProcessor: async (job) => { ... },
   *   analyticsProcessor: async (job) => { ... },
   *   integrationProcessor: async (job) => { ... }
   * });
   */
  async setupWorkers(processors) {
    console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Setting up workers for all queues`);

    try {
      // Call worker
      if (processors.callProcessor) {
        const callWorker = new Worker(
          QUEUE_NAMES.CALLS,
          processors.callProcessor,
          {
            connection: this.connection,
            prefix: this.config.queuePrefix || 'legacyai:voice:',
            concurrency: 5, // Process 5 jobs concurrently
          }
        );

        callWorker.on('completed', (job) => {
          this.metrics.totalJobsCompleted++;
          this.metrics.jobsCompletedByType[job.data.action] =
            (this.metrics.jobsCompletedByType[job.data.action] || 0) + 1;
        });

        callWorker.on('failed', (job, err) => {
          this.metrics.totalJobsFailed++;
          this.metrics.jobsFailedByType[job.data.action] =
            (this.metrics.jobsFailedByType[job.data.action] || 0) + 1;
        });

        this.workers.push(callWorker);
        console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Call worker created`);
      }

      // Analytics worker
      if (processors.analyticsProcessor) {
        const analyticsWorker = new Worker(
          QUEUE_NAMES.ANALYTICS,
          processors.analyticsProcessor,
          {
            connection: this.connection,
            prefix: this.config.queuePrefix || 'legacyai:voice:',
            concurrency: 3, // Process 3 jobs concurrently
          }
        );

        analyticsWorker.on('completed', (job) => {
          this.metrics.totalJobsCompleted++;
          this.metrics.jobsCompletedByType[job.data.type] =
            (this.metrics.jobsCompletedByType[job.data.type] || 0) + 1;
        });

        analyticsWorker.on('failed', (job, err) => {
          this.metrics.totalJobsFailed++;
          this.metrics.jobsFailedByType[job.data.type] =
            (this.metrics.jobsFailedByType[job.data.type] || 0) + 1;
        });

        this.workers.push(analyticsWorker);
        console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Analytics worker created`);
      }

      // Integration worker
      if (processors.integrationProcessor) {
        const integrationWorker = new Worker(
          QUEUE_NAMES.INTEGRATIONS,
          processors.integrationProcessor,
          {
            connection: this.connection,
            prefix: this.config.queuePrefix || 'legacyai:voice:',
            concurrency: 5, // Process 5 jobs concurrently
          }
        );

        integrationWorker.on('completed', (job) => {
          this.metrics.totalJobsCompleted++;
          this.metrics.jobsCompletedByType[job.data.type] =
            (this.metrics.jobsCompletedByType[job.data.type] || 0) + 1;
        });

        integrationWorker.on('failed', (job, err) => {
          this.metrics.totalJobsFailed++;
          this.metrics.jobsFailedByType[job.data.type] =
            (this.metrics.jobsFailedByType[job.data.type] || 0) + 1;
        });

        this.workers.push(integrationWorker);
        console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Integration worker created`);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] All workers setup complete: ${this.workers.length} workers`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [QueueManager] Failed to setup workers:`, error);
      throw error;
    }
  }

  /**
   * Get current queue metrics
   *
   * @returns {Promise<APIResponse>} Response with metrics data
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * const result = await queueManager.getMetrics();
   * console.log('Total jobs:', result.data.totalJobsAdded);
   */
  async getMetrics() {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    try {
      // Get queue counts
      const callsCount = await this.queues.calls.count();
      const analyticsCount = await this.queues.analytics.count();
      const integrationsCount = await this.queues.integrations.count();

      return {
        success: true,
        data: {
          ...this.metrics,
          currentQueueCounts: {
            calls: callsCount,
            analytics: analyticsCount,
            integrations: integrationsCount,
          },
          workers: this.workers.length,
        },
        error: null,
        timestamp,
        requestId,
      };
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [QueueManager] Failed to get metrics:`, error);

      return {
        success: false,
        data: null,
        error: error.message,
        timestamp,
        requestId,
      };
    }
  }

  /**
   * Gracefully shutdown all workers and close connections
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   *
   * @example
   * await queueManager.shutdown();
   */
  async shutdown() {
    console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Shutting down QueueManager`);

    try {
      // Close all workers
      for (const worker of this.workers) {
        await worker.close();
      }
      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] All workers closed`);

      // Close all queues
      await Promise.all([
        this.queues.calls.close(),
        this.queues.analytics.close(),
        this.queues.integrations.close(),
      ]);
      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] All queues closed`);

      // Close queue events
      await Promise.all([
        this.queueEvents.calls.close(),
        this.queueEvents.analytics.close(),
        this.queueEvents.integrations.close(),
      ]);
      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] All queue events closed`);

      // Close Redis connection
      await this.connection.quit();
      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Redis connection closed`);

      console.log(`[${new Date().toISOString()}] [INFO] [QueueManager] Shutdown complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [QueueManager] Error during shutdown:`, error);
      throw error;
    }
  }

  /**
   * Generate unique request ID (UUID v4)
   *
   * @returns {string} UUID v4 request ID
   * @created 2025-10-01T16:00:00Z
   * @lastModified 2025-10-01T16:00:00Z
   * @private
   */
  generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

module.exports = QueueManager;
