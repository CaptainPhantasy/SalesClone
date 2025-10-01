# Queue System Usage Examples
**Created**: 2025-10-01T16:30:00Z
**Phase**: 4 - Queue System & Workers

This document provides comprehensive examples for using the QueueManager and workers.

---

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Adding Jobs to Queues](#adding-jobs-to-queues)
3. [Setting Up Workers](#setting-up-workers)
4. [Worker Implementations](#worker-implementations)
5. [Monitoring and Metrics](#monitoring-and-metrics)
6. [Error Handling](#error-handling)
7. [Production Configuration](#production-configuration)

---

## Basic Setup

### Initialize QueueManager

```javascript
const QueueManager = require('./src/services/QueueManager');
const { getConfig } = require('./src/config');

// Load configuration
const config = getConfig();

// Create QueueManager instance
const queueManager = new QueueManager({
  redisUrl: config.upstash.redisUrl,
  redisToken: config.upstash.redisToken,
  queuePrefix: config.upstash.queuePrefix,
});

console.log('QueueManager initialized successfully');
```

### With Error Handling

```javascript
try {
  const queueManager = new QueueManager({
    redisUrl: process.env.UPSTASH_REDIS_URL,
    redisToken: process.env.UPSTASH_REDIS_TOKEN,
    queuePrefix: 'myapp:',
  });

  // Test connection
  const metrics = await queueManager.getMetrics();
  console.log('Queue system ready:', metrics.data);
} catch (error) {
  console.error('Failed to initialize queue system:', error);
  process.exit(1);
}
```

---

## Adding Jobs to Queues

### Call Queue Jobs

#### Transcription Job
```javascript
// Add transcription job after call ends
const result = await queueManager.addCallToQueue(
  'CA1234567890abcdef', // Twilio call SID
  'transcribe',
  {
    audioUrl: 'https://api.twilio.com/recordings/RE123...',
    conversationId: 'uuid-conv-123',
    format: 'mp3',
  },
  8 // High priority
);

if (result.success) {
  console.log('Transcription job queued:', result.data.jobId);
} else {
  console.error('Failed to queue job:', result.error);
}
```

#### Analysis Job
```javascript
// Add analysis job to process conversation
await queueManager.addCallToQueue(
  'CA1234567890abcdef',
  'analyze',
  {
    conversationId: 'uuid-conv-123',
    messages: [
      { role: 'user', content: 'Hello', timestamp: '2025-10-01T10:00:00Z' },
      { role: 'assistant', content: 'Hi there!', timestamp: '2025-10-01T10:00:01Z' },
    ],
  },
  5 // Normal priority
);
```

#### Post-Call Actions Job
```javascript
// Add post-call actions after conversation ends
await queueManager.addCallToQueue(
  'CA1234567890abcdef',
  'post_call_actions',
  {
    conversationId: 'uuid-conv-123',
    conversationData: {
      messages: [...],
      duration_seconds: 120,
      sentiment_score: 0.8,
      escalated: false,
    },
  }
);
```

### Analytics Queue Jobs

#### Daily Aggregation
```javascript
// Schedule daily aggregation (typically via cron)
await queueManager.addAnalyticsJob(
  'daily_aggregation',
  {
    date: '2025-10-01',
  },
  2 // Low priority, batch job
);
```

#### Sentiment Analysis Batch
```javascript
// Analyze sentiment for multiple conversations
await queueManager.addAnalyticsJob(
  'sentiment_analysis',
  {
    conversationIds: [
      'uuid-conv-1',
      'uuid-conv-2',
      'uuid-conv-3',
      // ... up to 100 conversations per job
    ],
  }
);
```

#### Trend Calculation
```javascript
// Calculate trends for the past week
await queueManager.addAnalyticsJob(
  'trend_calculation',
  {
    startDate: '2025-09-24',
    endDate: '2025-10-01',
    metric: 'avg_sentiment', // or 'avg_duration', 'call_count', 'escalation_rate'
  }
);
```

### Integration Queue Jobs

#### Webhook Delivery
```javascript
// Send webhook to external system
await queueManager.addIntegrationJob(
  'webhook_delivery',
  {
    url: 'https://your-app.com/webhooks/call-ended',
    payload: {
      eventType: 'call.ended',
      callSid: 'CA123...',
      conversationId: 'uuid-conv-123',
      duration: 120,
      sentiment: 0.8,
    },
    headers: {
      'X-Webhook-Signature': 'sha256=...',
    },
    eventType: 'call.ended',
  },
  7 // High priority for webhooks
);
```

#### Email Send
```javascript
// Send follow-up email
await queueManager.addIntegrationJob(
  'email_send',
  {
    to: 'customer@example.com',
    subject: 'Thank you for your call',
    text: 'Thank you for calling. We appreciate your business.',
    html: '<p>Thank you for calling. We appreciate your business.</p>',
  }
);

// Or use template
await queueManager.addIntegrationJob(
  'email_send',
  {
    to: 'customer@example.com',
    subject: 'Call Summary',
    templateId: 'call-summary',
    templateData: {
      customerName: 'John Doe',
      callDate: '2025-10-01',
      summary: 'Discussed product features...',
    },
  }
);
```

#### Customer Sync
```javascript
// Sync customer to CRM
await queueManager.addIntegrationJob(
  'customer_sync',
  {
    customerId: 'uuid-cust-123',
    action: 'update', // or 'create', 'delete'
    customerData: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      company: 'Acme Corp',
    },
    externalSystem: 'salesforce',
  }
);
```

---

## Setting Up Workers

### Initialize All Workers

```javascript
const CallWorker = require('./src/workers/CallWorker');
const AnalyticsWorker = require('./src/workers/AnalyticsWorker');
const IntegrationWorker = require('./src/workers/IntegrationWorker');

// Initialize workers
const callWorker = new CallWorker(config);
const analyticsWorker = new AnalyticsWorker(config);
const integrationWorker = new IntegrationWorker(config);

// Initialize their dependencies
await callWorker.initialize();
await analyticsWorker.initialize();
await integrationWorker.initialize();

// Setup workers with QueueManager
await queueManager.setupWorkers({
  callProcessor: callWorker.getProcessor(),
  analyticsProcessor: analyticsWorker.getProcessor(),
  integrationProcessor: integrationWorker.getProcessor(),
});

console.log('All workers setup and ready to process jobs');
```

### Setup Individual Worker

```javascript
// Only setup call worker
const callWorker = new CallWorker(config);
await callWorker.initialize();

await queueManager.setupWorkers({
  callProcessor: callWorker.getProcessor(),
});
```

### Complete Initialization Flow

```javascript
const { getConfig } = require('./src/config');
const QueueManager = require('./src/services/QueueManager');
const CallWorker = require('./src/workers/CallWorker');
const AnalyticsWorker = require('./src/workers/AnalyticsWorker');
const IntegrationWorker = require('./src/workers/IntegrationWorker');

async function initializeQueueSystem() {
  try {
    console.log('Initializing queue system...');

    // Load config
    const config = getConfig();

    // Create queue manager
    const queueManager = new QueueManager({
      redisUrl: config.upstash.redisUrl,
      redisToken: config.upstash.redisToken,
      queuePrefix: config.upstash.queuePrefix,
    });

    // Create workers
    const callWorker = new CallWorker(config);
    const analyticsWorker = new AnalyticsWorker(config);
    const integrationWorker = new IntegrationWorker(config);

    // Initialize workers
    await Promise.all([
      callWorker.initialize(),
      analyticsWorker.initialize(),
      integrationWorker.initialize(),
    ]);

    // Setup workers with queue manager
    await queueManager.setupWorkers({
      callProcessor: callWorker.getProcessor(),
      analyticsProcessor: analyticsWorker.getProcessor(),
      integrationProcessor: integrationWorker.getProcessor(),
    });

    console.log('Queue system initialized successfully');

    // Return for use in app
    return {
      queueManager,
      workers: { callWorker, analyticsWorker, integrationWorker },
    };
  } catch (error) {
    console.error('Failed to initialize queue system:', error);
    throw error;
  }
}

// Use in app
const { queueManager, workers } = await initializeQueueSystem();
```

---

## Worker Implementations

### Custom Call Processor

```javascript
// Create custom processor if needed
const customCallProcessor = async (job) => {
  const startTime = Date.now();
  console.log(`Processing custom job ${job.id}`);

  try {
    const { callSid, action, data } = job.data;

    // Update progress
    await job.updateProgress(25);

    // Your custom logic here
    let result;
    switch (action) {
      case 'transcribe':
        result = await myCustomTranscriptionService(data);
        break;
      case 'analyze':
        result = await myCustomAnalysisService(data);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    await job.updateProgress(100);

    return {
      success: true,
      result,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Job failed:', error);
    throw error; // Will trigger retry
  }
};

// Use custom processor
await queueManager.setupWorkers({
  callProcessor: customCallProcessor,
});
```

---

## Monitoring and Metrics

### Get Current Metrics

```javascript
const metricsResult = await queueManager.getMetrics();

if (metricsResult.success) {
  const metrics = metricsResult.data;

  console.log('Total jobs added:', metrics.totalJobsAdded);
  console.log('Total jobs completed:', metrics.totalJobsCompleted);
  console.log('Total jobs failed:', metrics.totalJobsFailed);

  console.log('Current queue counts:');
  console.log('  Calls:', metrics.currentQueueCounts.calls);
  console.log('  Analytics:', metrics.currentQueueCounts.analytics);
  console.log('  Integrations:', metrics.currentQueueCounts.integrations);

  console.log('Active workers:', metrics.workers);

  console.log('Jobs by type:', metrics.jobsAddedByType);
}
```

### Monitor Queue Health

```javascript
setInterval(async () => {
  try {
    const metrics = await queueManager.getMetrics();

    if (metrics.success) {
      const { currentQueueCounts, totalJobsFailed } = metrics.data;

      // Alert if queues are backing up
      if (currentQueueCounts.calls > 100) {
        console.warn('⚠️ Call queue backing up:', currentQueueCounts.calls);
      }

      // Alert on high failure rate
      const failureRate = totalJobsFailed / (metrics.data.totalJobsAdded || 1);
      if (failureRate > 0.1) {
        console.error('🚨 High job failure rate:', failureRate * 100 + '%');
      }
    }
  } catch (error) {
    console.error('Failed to get metrics:', error);
  }
}, 60000); // Check every minute
```

---

## Error Handling

### Job-Level Error Handling

```javascript
// Jobs automatically retry up to 3 times with exponential backoff
// Backoff: 1s, 2s, 4s

// Add job with error handling
const result = await queueManager.addCallToQueue(
  'CA123',
  'transcribe',
  { audioUrl: 'https://...' }
);

if (!result.success) {
  // Handle queue addition failure
  console.error('Failed to add job:', result.error);

  // Could try again, alert, or fallback
  if (result.error.includes('connection')) {
    // Redis connection issue
    console.error('Queue system unavailable, using fallback');
    await fallbackTranscriptionMethod();
  }
}
```

### Worker Error Handling

```javascript
// Workers automatically handle errors and trigger retries
// Failed jobs move to dead letter queue after max attempts

// Check dead letter queue periodically
const checkDeadLetterQueue = async () => {
  // In production, implement dead letter queue monitoring
  console.log('Checking for failed jobs...');

  // Could implement notification system for failed jobs
};

setInterval(checkDeadLetterQueue, 3600000); // Every hour
```

---

## Production Configuration

### Environment Variables

```bash
# .env file
UPSTASH_REDIS_URL=redis-12345.upstash.io:6379
UPSTASH_REDIS_TOKEN=your_token_here
UPSTASH_QUEUE_PREFIX=prod:legacyai:

# Queue settings
QUEUE_CONCURRENCY=5
QUEUE_RETRY_ATTEMPTS=3
QUEUE_RETRY_DELAY=1000
```

### Graceful Shutdown

```javascript
// Handle shutdown signals
async function gracefulShutdown() {
  console.log('Shutting down queue system...');

  try {
    // Stop accepting new jobs
    // Workers will finish current jobs

    await queueManager.shutdown();

    console.log('Queue system shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### Production Initialization

```javascript
// src/queue-system.js
const { getConfig } = require('./config');
const QueueManager = require('./services/QueueManager');
const CallWorker = require('./workers/CallWorker');
const AnalyticsWorker = require('./workers/AnalyticsWorker');
const IntegrationWorker = require('./workers/IntegrationWorker');

let queueManager = null;
let workers = null;

async function initialize() {
  if (queueManager) {
    console.log('Queue system already initialized');
    return { queueManager, workers };
  }

  try {
    const config = getConfig();

    queueManager = new QueueManager({
      redisUrl: config.upstash.redisUrl,
      redisToken: config.upstash.redisToken,
      queuePrefix: config.upstash.queuePrefix,
    });

    const callWorker = new CallWorker(config);
    const analyticsWorker = new AnalyticsWorker(config);
    const integrationWorker = new IntegrationWorker(config);

    await Promise.all([
      callWorker.initialize(),
      analyticsWorker.initialize(),
      integrationWorker.initialize(),
    ]);

    await queueManager.setupWorkers({
      callProcessor: callWorker.getProcessor(),
      analyticsProcessor: analyticsWorker.getProcessor(),
      integrationProcessor: integrationWorker.getProcessor(),
    });

    workers = { callWorker, analyticsWorker, integrationWorker };

    console.log('✅ Queue system ready');

    return { queueManager, workers };
  } catch (error) {
    console.error('❌ Queue system initialization failed:', error);
    throw error;
  }
}

async function shutdown() {
  if (!queueManager) return;

  await queueManager.shutdown();
  queueManager = null;
  workers = null;
}

module.exports = {
  initialize,
  shutdown,
  getQueueManager: () => queueManager,
  getWorkers: () => workers,
};
```

### Usage in Main App

```javascript
// src/index.js
const express = require('express');
const queueSystem = require('./queue-system');

const app = express();

async function startServer() {
  try {
    // Initialize queue system
    const { queueManager } = await queueSystem.initialize();

    // Make queueManager available to routes
    app.locals.queueManager = queueManager;

    // Start server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', async () => {
  await queueSystem.shutdown();
  process.exit(0);
});

startServer();
```

---

## Performance Tips

### Batch Job Addition

```javascript
// Add multiple jobs efficiently
const jobs = [
  { callSid: 'CA1', action: 'transcribe', data: {...} },
  { callSid: 'CA2', action: 'transcribe', data: {...} },
  { callSid: 'CA3', action: 'transcribe', data: {...} },
];

const results = await Promise.all(
  jobs.map(job =>
    queueManager.addCallToQueue(job.callSid, job.action, job.data)
  )
);

const successCount = results.filter(r => r.success).length;
console.log(`Added ${successCount}/${jobs.length} jobs`);
```

### Priority Management

```javascript
// Use priorities strategically
const PRIORITY = {
  CRITICAL: 10,  // User-facing, real-time
  HIGH: 8,       // Important, time-sensitive
  NORMAL: 5,     // Standard processing
  LOW: 3,        // Batch jobs, analytics
  BACKGROUND: 1, // Non-urgent cleanup
};

// High priority for real-time transcription
await queueManager.addCallToQueue(
  callSid,
  'transcribe',
  data,
  PRIORITY.HIGH
);

// Low priority for daily reports
await queueManager.addAnalyticsJob(
  'daily_aggregation',
  data,
  PRIORITY.LOW
);
```

---

**Queue System Ready for Production** ✅
