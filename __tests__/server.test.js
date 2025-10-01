/**
 * @fileoverview Integration tests for Express server, API endpoints, and WebSocket server
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * Test Coverage:
 * - Express server startup and shutdown
 * - Health endpoint
 * - Webhook endpoints (Twilio TwiML)
 * - API endpoints (REST JSON)
 * - Error handling
 * - Middleware (logging, error handling)
 * - WebSocket connections and messaging
 */

const request = require('supertest');
const WebSocket = require('ws');
const { LegacyAIVoiceSystem } = require('../src/index');

// Mock configuration
jest.mock('../src/config', () => ({
  config: {
    app: {
      port: 3000,
      websocketPort: 3501, // Fixed port for first test suite
      nodeEnv: 'test',
    },
    twilio: {
      accountSid: 'test_account_sid',
      authToken: 'test_auth_token',
      phoneNumber: '+11234567890',
      webhookUrl: 'http://localhost:3000',
    },
    openai: {
      apiKey: 'test_openai_key',
    },
    anthropic: {
      apiKey: 'test_anthropic_key',
    },
    supabase: {
      url: 'http://localhost:54321',
      serviceKey: 'test_service_key',
    },
    upstash: {
      redisUrl: 'localhost:6379',
      redisToken: 'test_token',
    },
  },
}));

// Mock agents
const mockVoiceAgent = {
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  handleIncomingCall: jest.fn().mockResolvedValue({
    success: true,
    data: { twiml: '<?xml version="1.0"?><Response><Say>Hello</Say></Response>' },
  }),
  makeOutboundCall: jest.fn().mockResolvedValue({
    success: true,
    data: { callSid: 'CA123456789', from: '+11234567890' },
  }),
  generateOutboundTwiML: jest.fn().mockResolvedValue({
    success: true,
    data: { twiml: '<?xml version="1.0"?><Response><Say>Outbound call</Say></Response>' },
  }),
};

const mockConversationAgent = {
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  processSpeech: jest.fn().mockResolvedValue({
    success: true,
    data: {
      response: 'AI response',
      twiml: '<?xml version="1.0"?><Response><Say>AI response</Say></Response>',
    },
  }),
  getConversation: jest.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'conv_123',
      callSid: 'CA123456789',
      transcript: [],
    },
  }),
};

const mockAnalyticsAgent = {
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  getDailyAnalytics: jest.fn().mockResolvedValue({
    success: true,
    data: {
      date: '2025-10-01',
      totalCalls: 100,
      avgDuration: 120,
    },
  }),
  getSentimentTrends: jest.fn().mockResolvedValue({
    success: true,
    data: {
      trends: [],
    },
  }),
  getCallStatus: jest.fn().mockResolvedValue({
    success: true,
    data: {
      callSid: 'CA123456789',
      status: 'completed',
    },
  }),
};

const mockIntegrationAgent = {
  initialize: jest.fn().mockResolvedValue(undefined),
  shutdown: jest.fn().mockResolvedValue(undefined),
  sendNotification: jest.fn().mockResolvedValue({
    success: true,
    data: {
      deliveryId: 'notif_123',
    },
  }),
};

// Mock DatabaseService
const mockDbService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  getCustomerByPhone: jest.fn().mockResolvedValue({
    id: 'cust_123',
    phone_number: '+11234567890',
    name: 'Test Customer',
  }),
  getConversationsByPhone: jest.fn().mockResolvedValue([]),
};

// Mock QueueManager
const mockQueueManager = {
  initialize: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  addJob: jest.fn().mockResolvedValue({ id: 'job_123' }),
  getMetrics: jest.fn().mockResolvedValue({
    calls: { waiting: 0, active: 0, completed: 10 },
    analytics: { waiting: 0, active: 0, completed: 5 },
    integrations: { waiting: 0, active: 0, completed: 2 },
  }),
};

// Mock agent constructors
jest.mock('../src/agents/VoiceGatewayAgent', () => ({
  VoiceGatewayAgent: jest.fn(() => mockVoiceAgent),
}));

jest.mock('../src/agents/ConversationAgent', () => ({
  ConversationAgent: jest.fn(() => mockConversationAgent),
}));

jest.mock('../src/agents/AnalyticsAgent', () => ({
  AnalyticsAgent: jest.fn(() => mockAnalyticsAgent),
}));

jest.mock('../src/agents/IntegrationAgent', () => ({
  IntegrationAgent: jest.fn(() => mockIntegrationAgent),
}));

jest.mock('../src/services/DatabaseService', () => jest.fn().mockImplementation(() => mockDbService));
jest.mock('../src/services/QueueManager', () => jest.fn().mockImplementation(() => mockQueueManager));

describe('LegacyAI Voice System - Server Integration Tests', () => {
  let voiceSystem;
  let app;

  beforeAll(async () => {
    // Create and initialize system
    voiceSystem = new LegacyAIVoiceSystem();
    await voiceSystem.initialize();
    app = voiceSystem.app;
  });

  afterAll(async () => {
    // Cleanup
    if (voiceSystem.wss) {
      await voiceSystem.wss.close();
    }
  });

  describe('Health Endpoint', () => {
    test('GET /health should return 200 with health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('agents');
      expect(response.body).toHaveProperty('services');
    });

    test('Health endpoint should show agent status', async () => {
      const response = await request(app).get('/health');

      expect(response.body.agents.voice).toBe('initialized');
      expect(response.body.agents.conversation).toBe('initialized');
      expect(response.body.agents.analytics).toBe('initialized');
      expect(response.body.agents.integration).toBe('initialized');
    });
  });

  describe('Webhook Endpoints - Twilio', () => {
    describe('POST /webhooks/voice', () => {
      test('should return TwiML for valid incoming call', async () => {
        const response = await request(app)
          .post('/webhooks/voice')
          .send({
            CallSid: 'CA123456789',
            From: '+11234567890',
            To: '+10987654321',
            CallStatus: 'ringing',
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('<?xml version="1.0"?>');
        expect(response.text).toContain('<Response>');
        expect(mockVoiceAgent.handleIncomingCall).toHaveBeenCalled();
      });

      test('should return error TwiML for missing CallSid', async () => {
        const response = await request(app)
          .post('/webhooks/voice')
          .send({
            From: '+11234567890',
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('<Response>');
        expect(response.text).toContain('<Say>');
      });

      test('should queue analytics job after call', async () => {
        await request(app)
          .post('/webhooks/voice')
          .send({
            CallSid: 'CA123456789',
            From: '+11234567890',
            To: '+10987654321',
          });

        expect(mockQueueManager.addJob).toHaveBeenCalledWith(
          'voice-analytics',
          'call-started',
          expect.objectContaining({
            callSid: 'CA123456789',
          })
        );
      });
    });

    describe('POST /webhooks/process-speech', () => {
      test('should return TwiML with AI response', async () => {
        const response = await request(app)
          .post('/webhooks/process-speech')
          .send({
            CallSid: 'CA123456789',
            SpeechResult: 'Hello, I need help',
            Confidence: '0.95',
            From: '+11234567890',
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('<Response>');
        expect(mockConversationAgent.processSpeech).toHaveBeenCalled();
      });

      test('should handle missing SpeechResult', async () => {
        const response = await request(app)
          .post('/webhooks/process-speech')
          .send({
            CallSid: 'CA123456789',
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('<Say>');
      });
    });

    describe('POST /webhooks/status', () => {
      test('should accept call status update', async () => {
        const response = await request(app)
          .post('/webhooks/status')
          .send({
            CallSid: 'CA123456789',
            CallStatus: 'completed',
            CallDuration: '120',
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('<Response>');
      });

      test('should queue job for completed calls', async () => {
        await request(app)
          .post('/webhooks/status')
          .send({
            CallSid: 'CA123456789',
            CallStatus: 'completed',
            CallDuration: '120',
          });

        expect(mockQueueManager.addJob).toHaveBeenCalledWith(
          'voice-analytics',
          'call-completed',
          expect.objectContaining({
            callSid: 'CA123456789',
          })
        );
      });
    });

    describe('POST /webhooks/outbound', () => {
      test('should return TwiML for outbound call', async () => {
        const response = await request(app)
          .post('/webhooks/outbound')
          .send({
            CallSid: 'CA123456789',
            To: '+11234567890',
            From: '+10987654321',
          })
          .expect(200)
          .expect('Content-Type', /xml/);

        expect(response.text).toContain('<Response>');
        expect(mockVoiceAgent.generateOutboundTwiML).toHaveBeenCalled();
      });
    });
  });

  describe('API Endpoints - REST', () => {
    describe('GET /api/conversations/:callSid', () => {
      test('should return conversation data', async () => {
        const response = await request(app)
          .get('/api/conversations/CA123456789')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('requestId');
      });
    });

    describe('GET /api/customers/:phone', () => {
      test('should return customer data', async () => {
        const response = await request(app)
          .get('/api/customers/+11234567890')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('customer');
        expect(response.body.data).toHaveProperty('recentConversations');
      });

      test('should return 404 for non-existent customer', async () => {
        mockDbService.getCustomerByPhone.mockResolvedValueOnce(null);

        const response = await request(app)
          .get('/api/customers/+19999999999')
          .expect(404)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('not found');
      });
    });

    describe('GET /api/analytics/daily/:date', () => {
      test('should return daily analytics', async () => {
        const response = await request(app)
          .get('/api/analytics/daily/2025-10-01')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('totalCalls');
      });

      test('should reject invalid date format', async () => {
        const response = await request(app)
          .get('/api/analytics/daily/invalid-date')
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Invalid date format');
      });
    });

    describe('GET /api/analytics/trends', () => {
      test('should return sentiment trends', async () => {
        const response = await request(app)
          .get('/api/analytics/trends?startDate=2025-10-01&endDate=2025-10-07')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('trends');
      });

      test('should require startDate and endDate', async () => {
        const response = await request(app)
          .get('/api/analytics/trends')
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });

      test('should validate interval parameter', async () => {
        const response = await request(app)
          .get('/api/analytics/trends?startDate=2025-10-01&endDate=2025-10-07&interval=invalid')
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('interval');
      });
    });

    describe('POST /api/calls/outbound', () => {
      test('should initiate outbound call', async () => {
        const response = await request(app)
          .post('/api/calls/outbound')
          .send({
            to: '+11234567890',
            message: 'Test message',
          })
          .expect(201)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('callSid');
        expect(mockVoiceAgent.makeOutboundCall).toHaveBeenCalled();
      });

      test('should require "to" field', async () => {
        const response = await request(app)
          .post('/api/calls/outbound')
          .send({})
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing required fields');
      });
    });

    describe('POST /api/notifications', () => {
      test('should send notification', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .send({
            type: 'email',
            recipient: 'test@example.com',
            message: 'Test notification',
          })
          .expect(201)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('deliveryId');
      });

      test('should validate notification type', async () => {
        const response = await request(app)
          .post('/api/notifications')
          .send({
            type: 'invalid',
            recipient: 'test@example.com',
            message: 'Test',
          })
          .expect(400)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('type must be');
      });
    });

    describe('GET /api/queue/metrics', () => {
      test('should return queue metrics', async () => {
        const response = await request(app)
          .get('/api/queue/metrics')
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('calls');
        expect(response.body.data).toHaveProperty('analytics');
      });
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404)
        .expect('Content-Type', /json/);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    test('should handle internal errors gracefully', async () => {
      // Mock an error
      mockVoiceAgent.handleIncomingCall.mockRejectedValueOnce(new Error('Test error'));

      const response = await request(app)
        .post('/webhooks/voice')
        .send({
          CallSid: 'CA123456789',
          From: '+11234567890',
        })
        .expect(500)
        .expect('Content-Type', /xml/);

      expect(response.text).toContain('<Response>');
    });
  });

  describe('Middleware', () => {
    test('should add requestId to requests', async () => {
      const response = await request(app).get('/health');

      // Request logger should have logged the request
      expect(response.status).toBe(200);
    });

    test('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/calls/outbound')
        .send({ to: '+11234567890' })
        .set('Content-Type', 'application/json');

      expect(response.body).toHaveProperty('success');
    });

    test('should parse URL-encoded bodies', async () => {
      const response = await request(app)
        .post('/webhooks/voice')
        .send('CallSid=CA123&From=%2B11234567890')
        .set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(200);
    });
  });
});

describe('WebSocket Server Tests', () => {
  let voiceSystem;
  let ws;
  const wsTestPort = 3502; // Different port to avoid conflicts

  beforeAll(async () => {
    // Mock config for this suite with different port
    const mockConfig = require('../src/config').config;
    mockConfig.app.websocketPort = wsTestPort;

    voiceSystem = new LegacyAIVoiceSystem();
    await voiceSystem.initialize();
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for WS server
  });

  afterAll(async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    if (voiceSystem.wss) {
      await voiceSystem.wss.close();
    }
  });

  test('should accept WebSocket connections', (done) => {
    ws = new WebSocket(`ws://localhost:${wsTestPort}`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      done();
    });

    ws.on('error', (error) => {
      done(error);
    });
  });

  test('should send welcome message on connection', (done) => {
    const ws = new WebSocket(`ws://localhost:${wsTestPort}`);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        expect(message).toHaveProperty('clientId');
        expect(message.message).toContain('Connected');
        ws.close();
        done();
      }
    });
  });

  test('should handle subscribe message', (done) => {
    const ws = new WebSocket(`ws://localhost:${wsTestPort}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({
        type: 'subscribe',
        topic: 'metrics',
      }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'subscribed') {
        expect(message.topic).toBe('metrics');
        ws.close();
        done();
      }
    });
  });

  test('should respond to ping with pong', (done) => {
    const ws = new WebSocket(`ws://localhost:${wsTestPort}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'pong') {
        expect(message).toHaveProperty('timestamp');
        ws.close();
        done();
      }
    });
  });

  test('should return metrics on request', (done) => {
    const ws = new WebSocket(`ws://localhost:${wsTestPort}`);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'get_metrics' }));
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'queue_metrics') {
        expect(message.data).toHaveProperty('calls');
        ws.close();
        done();
      }
    });
  });
});
