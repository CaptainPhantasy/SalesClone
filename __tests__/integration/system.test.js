/**
 * @fileoverview End-to-end integration tests for LegacyAI Voice Agent System
 * @author LegacyAI Subagent Fleet - Testing & Deployment Agent
 * @created 2025-10-01T19:00:00Z
 * @lastModified 2025-10-01T19:00:00Z
 *
 * Comprehensive integration tests that verify:
 * - Full system startup and initialization
 * - Database connectivity and operations
 * - Redis/Queue connectivity
 * - All agents initialization
 * - HTTP server functionality
 * - WebSocket server functionality
 * - Health endpoint responses
 * - Complete call flow simulation
 * - Analytics generation
 * - Queue job processing
 */

const request = require('supertest');
const WebSocket = require('ws');
const { LegacyAIVoiceSystem } = require('../../src/index');

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

describe('LegacyAI Voice Agent System - Integration Tests', () => {
  let voiceSystem;
  let app;
  let httpServer;

  /**
   * Setup: Initialize the entire system before running tests
   * This simulates a production startup
   */
  beforeAll(async () => {
    console.log(`[${new Date().toISOString()}] [TEST] Setting up integration test environment...`);

    try {
      // Create system instance
      voiceSystem = new LegacyAIVoiceSystem();

      // Initialize the system
      await voiceSystem.initialize();

      // Get Express app for testing
      app = voiceSystem.app;
      httpServer = voiceSystem.httpServer;

      console.log(`[${new Date().toISOString()}] [TEST] System initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [TEST ERROR] Failed to initialize system:`, error);
      throw error;
    }
  }, TEST_TIMEOUT);

  /**
   * Teardown: Gracefully shutdown the system after all tests
   */
  afterAll(async () => {
    console.log(`[${new Date().toISOString()}] [TEST] Tearing down integration test environment...`);

    try {
      // Shutdown the system gracefully
      if (voiceSystem && typeof voiceSystem.shutdown === 'function') {
        await voiceSystem.shutdown();
      }

      console.log(`[${new Date().toISOString()}] [TEST] System shutdown complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [TEST ERROR] Error during shutdown:`, error);
    }
  }, TEST_TIMEOUT);

  /**
   * Test Suite 1: System Initialization
   */
  describe('System Initialization', () => {
    test('should initialize all core services', () => {
      expect(voiceSystem.initialized).toBe(true);
      expect(voiceSystem.dbService).toBeDefined();
      expect(voiceSystem.queueManager).toBeDefined();
    });

    test('should initialize all AI agents', () => {
      expect(voiceSystem.agents.voice).toBeDefined();
      expect(voiceSystem.agents.conversation).toBeDefined();
      expect(voiceSystem.agents.analytics).toBeDefined();
      expect(voiceSystem.agents.integration).toBeDefined();
    });

    test('should have Express app configured', () => {
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
    });

    test('should have WebSocket server configured', () => {
      expect(voiceSystem.wss).toBeDefined();
    });
  });

  /**
   * Test Suite 2: Health Checks
   */
  describe('Health Endpoint', () => {
    test('should respond to health check requests', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    test('should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });

    test('should report all agents initialized', async () => {
      const response = await request(app).get('/health');

      expect(response.body.agents).toBeDefined();
      expect(response.body.agents.voice).toBe('initialized');
      expect(response.body.agents.conversation).toBe('initialized');
      expect(response.body.agents.analytics).toBe('initialized');
      expect(response.body.agents.integration).toBe('initialized');
    });

    test('should report services connected', async () => {
      const response = await request(app).get('/health');

      expect(response.body.services).toBeDefined();
      expect(response.body.services.database).toBe('connected');
      expect(response.body.services.queue).toBe('connected');
    });

    test('should include environment information', async () => {
      const response = await request(app).get('/health');

      expect(response.body.environment).toBe('test');
      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  /**
   * Test Suite 3: Webhook Endpoints
   */
  describe('Twilio Webhook Endpoints', () => {
    test('should accept incoming call webhook', async () => {
      const mockCallData = {
        CallSid: 'CA' + Math.random().toString(36).substring(7),
        From: '+15551234567',
        To: '+18338542355',
        CallStatus: 'ringing',
        Direction: 'inbound',
      };

      const response = await request(app)
        .post('/webhooks/voice')
        .send(mockCallData)
        .expect('Content-Type', /xml/);

      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response>');
    });

    test('should handle call status updates', async () => {
      const mockStatusUpdate = {
        CallSid: 'CA' + Math.random().toString(36).substring(7),
        CallStatus: 'completed',
        CallDuration: '45',
      };

      const response = await request(app)
        .post('/webhooks/status')
        .send(mockStatusUpdate);

      expect(response.status).toBe(200);
    });

    test('should process voice input webhook', async () => {
      const mockVoiceInput = {
        CallSid: 'CA' + Math.random().toString(36).substring(7),
        SpeechResult: 'Hello, I need help with my account',
        Confidence: 0.95,
      };

      const response = await request(app)
        .post('/webhooks/gather')
        .send(mockVoiceInput)
        .expect('Content-Type', /xml/);

      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response>');
    });
  });

  /**
   * Test Suite 4: API Endpoints
   */
  describe('API Endpoints', () => {
    test('should retrieve call analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/summary')
        .query({ period: 'today' });

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });

    test('should list active calls', async () => {
      const response = await request(app)
        .get('/api/calls/active');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should handle queue status requests', async () => {
      const response = await request(app)
        .get('/api/queue/status');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });
  });

  /**
   * Test Suite 5: Database Connectivity
   */
  describe('Database Operations', () => {
    test('should connect to database successfully', async () => {
      expect(voiceSystem.dbService).toBeDefined();

      // Test database connection by attempting a simple query
      const isConnected = await voiceSystem.dbService.testConnection();
      expect(isConnected).toBe(true);
    });

    test('should create call records', async () => {
      const testCall = {
        callSid: 'TEST_' + Math.random().toString(36).substring(7),
        from: '+15551234567',
        to: '+18338542355',
        status: 'initiated',
      };

      const result = await voiceSystem.dbService.createCall(testCall);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });

    test('should retrieve call history', async () => {
      const calls = await voiceSystem.dbService.getCalls({ limit: 10 });
      expect(Array.isArray(calls)).toBe(true);
    });
  });

  /**
   * Test Suite 6: Queue Processing
   */
  describe('Queue Manager', () => {
    test('should connect to Redis successfully', async () => {
      expect(voiceSystem.queueManager).toBeDefined();

      // Verify queue connection
      const isConnected = await voiceSystem.queueManager.isConnected();
      expect(isConnected).toBe(true);
    });

    test('should add jobs to queue', async () => {
      const jobData = {
        type: 'test',
        callSid: 'TEST_JOB_' + Date.now(),
        timestamp: new Date().toISOString(),
      };

      const job = await voiceSystem.queueManager.addJob('call-processing', jobData);
      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });

    test('should retrieve queue statistics', async () => {
      const stats = await voiceSystem.queueManager.getQueueStats();
      expect(stats).toBeDefined();
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
    });
  });

  /**
   * Test Suite 7: Agent Functionality
   */
  describe('AI Agent Operations', () => {
    test('VoiceGatewayAgent should handle calls', async () => {
      const agent = voiceSystem.agents.voice;
      expect(agent).toBeDefined();
      expect(typeof agent.handleIncomingCall).toBe('function');
    });

    test('ConversationAgent should process messages', async () => {
      const agent = voiceSystem.agents.conversation;
      expect(agent).toBeDefined();
      expect(typeof agent.processMessage).toBe('function');
    });

    test('AnalyticsAgent should generate metrics', async () => {
      const agent = voiceSystem.agents.analytics;
      expect(agent).toBeDefined();
      expect(typeof agent.generateMetrics).toBe('function');
    });

    test('IntegrationAgent should handle webhooks', async () => {
      const agent = voiceSystem.agents.integration;
      expect(agent).toBeDefined();
      expect(typeof agent.sendWebhook).toBe('function');
    });
  });

  /**
   * Test Suite 8: Complete Call Flow
   */
  describe('End-to-End Call Flow', () => {
    let testCallSid;

    test('should initiate a complete call flow', async () => {
      // Step 1: Incoming call webhook
      testCallSid = 'CA_E2E_' + Math.random().toString(36).substring(7);

      const incomingCall = {
        CallSid: testCallSid,
        From: '+15551234567',
        To: '+18338542355',
        CallStatus: 'ringing',
        Direction: 'inbound',
      };

      const response = await request(app)
        .post('/webhooks/voice')
        .send(incomingCall);

      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response>');

      // Verify call was logged in database
      const calls = await voiceSystem.dbService.getCalls({
        filter: { callSid: testCallSid }
      });
      expect(calls.length).toBeGreaterThan(0);
    });

    test('should process voice input during call', async () => {
      // Step 2: Voice input webhook
      const voiceInput = {
        CallSid: testCallSid,
        SpeechResult: 'I need help with my account',
        Confidence: 0.95,
      };

      const response = await request(app)
        .post('/webhooks/gather')
        .send(voiceInput);

      expect(response.status).toBe(200);
    });

    test('should complete the call', async () => {
      // Step 3: Call completion webhook
      const callComplete = {
        CallSid: testCallSid,
        CallStatus: 'completed',
        CallDuration: '120',
      };

      const response = await request(app)
        .post('/webhooks/status')
        .send(callComplete);

      expect(response.status).toBe(200);

      // Verify call was marked as completed
      const calls = await voiceSystem.dbService.getCalls({
        filter: { callSid: testCallSid }
      });
      expect(calls[0].status).toBe('completed');
    });
  });

  /**
   * Test Suite 9: Error Handling
   */
  describe('Error Handling', () => {
    test('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    test('should handle invalid webhook data', async () => {
      const response = await request(app)
        .post('/webhooks/voice')
        .send({ invalid: 'data' });

      // Should still return valid TwiML even with invalid data
      expect(response.status).toBe(200);
      expect(response.text).toContain('<Response>');
    });

    test('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/analytics/summary')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });
  });

  /**
   * Test Suite 10: Performance and Scalability
   */
  describe('Performance Tests', () => {
    test('should handle concurrent webhook requests', async () => {
      const concurrentRequests = 10;
      const requests = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const mockCall = {
          CallSid: 'CA_PERF_' + i + '_' + Date.now(),
          From: '+15551234567',
          To: '+18338542355',
          CallStatus: 'ringing',
        };

        requests.push(
          request(app)
            .post('/webhooks/voice')
            .send(mockCall)
        );
      }

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    }, TEST_TIMEOUT);

    test('health check should respond quickly', async () => {
      const startTime = Date.now();

      await request(app).get('/health');

      const responseTime = Date.now() - startTime;

      // Health check should respond in less than 1 second
      expect(responseTime).toBeLessThan(1000);
    });
  });
});
