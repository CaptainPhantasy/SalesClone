/**
 * @fileoverview WebSocket server for real-time updates and live data streaming
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * This module provides WebSocket functionality for:
 * - Real-time call status updates
 * - Live transcription streaming
 * - Queue metrics broadcasting
 * - Agent status monitoring
 * - Client connection management
 * - Message type routing
 *
 * Message Types:
 * - call_status: Real-time call status updates
 * - live_transcript: Live transcription streaming during calls
 * - queue_metrics: Queue statistics and job counts
 * - agent_status: AI agent health and status
 * - subscribe: Client subscription to specific data streams
 * - unsubscribe: Client unsubscription from data streams
 */

const WebSocket = require('ws');
const http = require('http');

/**
 * Generate unique client ID for tracking
 * @returns {string} UUID v4 string
 * @created 2025-10-01T18:00:00Z
 */
function generateClientId() {
  return 'client-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * WebSocket server manager class
 * Handles client connections, subscriptions, and message broadcasting
 *
 * @class WebSocketServer
 * @created 2025-10-01T18:00:00Z
 */
class WebSocketServerManager {
  /**
   * Initialize WebSocket server manager
   * @param {Object} config - Configuration object
   * @param {number} config.port - WebSocket server port
   * @param {Object} config.agents - AI agents
   * @param {Object} config.queueManager - Queue manager
   * @created 2025-10-01T18:00:00Z
   */
  constructor(config) {
    this.config = config;
    this.agents = config.agents;
    this.queueManager = config.queueManager;

    // Client connection tracking
    // Map of clientId -> { ws, subscriptions: Set<string>, metadata: Object }
    this.clients = new Map();

    // Subscription tracking
    // Map of subscription topic -> Set<clientId>
    this.subscriptions = new Map();

    // WebSocket server instance
    this.wss = null;
    this.httpServer = null;

    // Metrics update interval
    this.metricsInterval = null;

    console.log(`[${new Date().toISOString()}] [INFO] [WebSocketServer] WebSocket server manager initialized`);
  }

  /**
   * Start WebSocket server
   * @returns {WebSocket.Server} WebSocket server instance
   * @created 2025-10-01T18:00:00Z
   */
  start() {
    const timestamp = new Date().toISOString();
    const port = this.config.port;

    console.log(`[${timestamp}] [INFO] [WebSocketServer] Starting WebSocket server on port ${port}...`);

    try {
      // Create HTTP server for WebSocket
      this.httpServer = http.createServer((req, res) => {
        // Handle HTTP health check on WebSocket port
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'healthy',
            type: 'websocket',
            clients: this.clients.size,
            subscriptions: this.subscriptions.size,
            timestamp: new Date().toISOString(),
          }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      // Create WebSocket server
      this.wss = new WebSocket.Server({
        server: this.httpServer,
        clientTracking: true,
        // Verify client connections (optional authentication)
        verifyClient: (info, callback) => {
          // For now, accept all connections
          // In production, implement token-based authentication here
          // const token = info.req.headers['sec-websocket-protocol'];
          // if (validateToken(token)) {
          //   callback(true);
          // } else {
          //   callback(false, 401, 'Unauthorized');
          // }
          callback(true);
        },
      });

      // Setup connection handler
      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      // Start listening
      this.httpServer.listen(port, () => {
        console.log(`[${new Date().toISOString()}] [INFO] [WebSocketServer] WebSocket server started on port ${port}`);
        console.log(`[${new Date().toISOString()}] [INFO] [WebSocketServer] ws://localhost:${port}`);
      });

      // Start metrics broadcasting (every 5 seconds)
      this.startMetricsBroadcast();

      return this.wss;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebSocketServer] Failed to start WebSocket server:`, error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} req - HTTP request object
   * @created 2025-10-01T18:00:00Z
   */
  handleConnection(ws, req) {
    const timestamp = new Date().toISOString();
    const clientId = generateClientId();

    // Get client IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.socket.remoteAddress ||
               'unknown';

    console.log(`[${timestamp}] [INFO] [WebSocketServer] New client connected - ClientID: ${clientId}, IP: ${ip}`);

    // Store client connection
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      metadata: {
        ip,
        connectedAt: timestamp,
        userAgent: req.headers['user-agent'],
      },
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      clientId,
      message: 'Connected to LegacyAI Voice System WebSocket',
      timestamp,
    });

    // Setup message handler
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    // Setup close handler
    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    // Setup error handler
    ws.on('error', (error) => {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebSocketServer] Client ${clientId} error:`, error);
    });

    // Send current metrics to new client
    this.sendMetricsToClient(clientId);
  }

  /**
   * Handle incoming message from client
   * @param {string} clientId - Client ID
   * @param {string|Buffer} message - WebSocket message
   * @created 2025-10-01T18:00:00Z
   */
  async handleMessage(clientId, message) {
    const timestamp = new Date().toISOString();

    try {
      // Parse JSON message
      const data = JSON.parse(message.toString());
      console.log(`[${timestamp}] [INFO] [WebSocketServer] Message from ${clientId}:`, data.type);

      // Route message based on type
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(clientId, data);
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(clientId, data);
          break;

        case 'get_metrics':
          this.sendMetricsToClient(clientId);
          break;

        case 'get_call_status':
          await this.sendCallStatusToClient(clientId, data.callSid);
          break;

        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp });
          break;

        default:
          console.warn(`[${timestamp}] [WARN] [WebSocketServer] Unknown message type: ${data.type}`);
          this.sendToClient(clientId, {
            type: 'error',
            error: `Unknown message type: ${data.type}`,
            timestamp,
          });
      }
    } catch (error) {
      console.error(`[${timestamp}] [ERROR] [WebSocketServer] Error handling message from ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        error: 'Invalid message format',
        timestamp,
      });
    }
  }

  /**
   * Handle client subscription to topic
   * @param {string} clientId - Client ID
   * @param {Object} data - Subscription data
   * @param {string} data.topic - Topic to subscribe to (calls|metrics|transcripts|agents)
   * @created 2025-10-01T18:00:00Z
   */
  handleSubscribe(clientId, data) {
    const timestamp = new Date().toISOString();
    const { topic } = data;

    console.log(`[${timestamp}] [INFO] [WebSocketServer] Client ${clientId} subscribing to: ${topic}`);

    // Validate topic
    const validTopics = ['calls', 'metrics', 'transcripts', 'agents'];
    if (!validTopics.includes(topic)) {
      this.sendToClient(clientId, {
        type: 'error',
        error: `Invalid topic: ${topic}. Valid topics: ${validTopics.join(', ')}`,
        timestamp,
      });
      return;
    }

    // Add to client subscriptions
    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.add(topic);

      // Add to topic subscribers
      if (!this.subscriptions.has(topic)) {
        this.subscriptions.set(topic, new Set());
      }
      this.subscriptions.get(topic).add(clientId);

      console.log(`[${timestamp}] [INFO] [WebSocketServer] Client ${clientId} subscribed to ${topic}`);

      this.sendToClient(clientId, {
        type: 'subscribed',
        topic,
        message: `Successfully subscribed to ${topic}`,
        timestamp,
      });
    }
  }

  /**
   * Handle client unsubscription from topic
   * @param {string} clientId - Client ID
   * @param {Object} data - Unsubscription data
   * @param {string} data.topic - Topic to unsubscribe from
   * @created 2025-10-01T18:00:00Z
   */
  handleUnsubscribe(clientId, data) {
    const timestamp = new Date().toISOString();
    const { topic } = data;

    console.log(`[${timestamp}] [INFO] [WebSocketServer] Client ${clientId} unsubscribing from: ${topic}`);

    const client = this.clients.get(clientId);
    if (client) {
      client.subscriptions.delete(topic);

      // Remove from topic subscribers
      if (this.subscriptions.has(topic)) {
        this.subscriptions.get(topic).delete(clientId);
      }

      this.sendToClient(clientId, {
        type: 'unsubscribed',
        topic,
        message: `Successfully unsubscribed from ${topic}`,
        timestamp,
      });
    }
  }

  /**
   * Handle client disconnection
   * @param {string} clientId - Client ID
   * @param {number} code - Close code
   * @param {string} reason - Close reason
   * @created 2025-10-01T18:00:00Z
   */
  handleDisconnection(clientId, code, reason) {
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] [INFO] [WebSocketServer] Client disconnected - ClientID: ${clientId}, Code: ${code}`);

    // Get client data
    const client = this.clients.get(clientId);
    if (client) {
      // Remove from all subscriptions
      client.subscriptions.forEach(topic => {
        if (this.subscriptions.has(topic)) {
          this.subscriptions.get(topic).delete(clientId);
        }
      });
    }

    // Remove client
    this.clients.delete(clientId);

    console.log(`[${timestamp}] [INFO] [WebSocketServer] Client ${clientId} cleaned up. Active clients: ${this.clients.size}`);
  }

  /**
   * Send message to specific client
   * @param {string} clientId - Client ID
   * @param {Object} data - Data to send
   * @created 2025-10-01T18:00:00Z
   */
  sendToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [WebSocketServer] Failed to send to client ${clientId}:`, error);
      }
    }
  }

  /**
   * Broadcast message to all subscribers of a topic
   * @param {string} topic - Topic name
   * @param {Object} data - Data to broadcast
   * @created 2025-10-01T18:00:00Z
   */
  broadcastToTopic(topic, data) {
    const timestamp = new Date().toISOString();
    const subscribers = this.subscriptions.get(topic);

    if (subscribers && subscribers.size > 0) {
      console.log(`[${timestamp}] [DEBUG] [WebSocketServer] Broadcasting to ${subscribers.size} subscribers of ${topic}`);

      subscribers.forEach(clientId => {
        this.sendToClient(clientId, {
          ...data,
          topic,
          timestamp,
        });
      });
    }
  }

  /**
   * Send queue metrics to specific client
   * @param {string} clientId - Client ID
   * @created 2025-10-01T18:00:00Z
   */
  async sendMetricsToClient(clientId) {
    try {
      const metrics = await this.queueManager.getMetrics();
      this.sendToClient(clientId, {
        type: 'queue_metrics',
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebSocketServer] Failed to send metrics:`, error);
    }
  }

  /**
   * Send call status to specific client
   * @param {string} clientId - Client ID
   * @param {string} callSid - Call SID
   * @created 2025-10-01T18:00:00Z
   */
  async sendCallStatusToClient(clientId, callSid) {
    try {
      const result = await this.agents.analytics.getCallStatus(callSid);
      this.sendToClient(clientId, {
        type: 'call_status',
        data: result.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [WebSocketServer] Failed to send call status:`, error);
    }
  }

  /**
   * Start periodic metrics broadcasting
   * Broadcasts queue metrics every 5 seconds to subscribed clients
   * @created 2025-10-01T18:00:00Z
   */
  startMetricsBroadcast() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [WebSocketServer] Starting metrics broadcast (every 5 seconds)`);

    this.metricsInterval = setInterval(async () => {
      try {
        // Only broadcast if there are subscribers
        if (this.subscriptions.has('metrics') && this.subscriptions.get('metrics').size > 0) {
          const metrics = await this.queueManager.getMetrics();
          this.broadcastToTopic('metrics', {
            type: 'queue_metrics',
            data: metrics,
          });
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] [ERROR] [WebSocketServer] Metrics broadcast error:`, error);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Broadcast call status update
   * Called externally when call status changes
   * @param {Object} callData - Call status data
   * @created 2025-10-01T18:00:00Z
   */
  broadcastCallStatus(callData) {
    this.broadcastToTopic('calls', {
      type: 'call_status',
      data: callData,
    });
  }

  /**
   * Broadcast live transcript
   * Called externally during active calls
   * @param {Object} transcriptData - Transcript data
   * @created 2025-10-01T18:00:00Z
   */
  broadcastLiveTranscript(transcriptData) {
    this.broadcastToTopic('transcripts', {
      type: 'live_transcript',
      data: transcriptData,
    });
  }

  /**
   * Close WebSocket server
   * @returns {Promise<void>}
   * @created 2025-10-01T18:00:00Z
   */
  async close() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [WebSocketServer] Closing WebSocket server...`);

    // Stop metrics broadcast
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      console.log(`[${timestamp}] [INFO] [WebSocketServer] Metrics broadcast stopped`);
    }

    // Close all client connections
    this.clients.forEach((client, clientId) => {
      console.log(`[${timestamp}] [INFO] [WebSocketServer] Closing connection to client ${clientId}`);
      client.ws.close(1000, 'Server shutdown');
    });

    // Close WebSocket server
    if (this.wss) {
      await new Promise((resolve) => {
        this.wss.close(() => {
          console.log(`[${timestamp}] [INFO] [WebSocketServer] WebSocket server closed`);
          resolve();
        });
      });
    }

    // Close HTTP server
    if (this.httpServer) {
      await new Promise((resolve) => {
        this.httpServer.close(() => {
          console.log(`[${timestamp}] [INFO] [WebSocketServer] HTTP server closed`);
          resolve();
        });
      });
    }

    console.log(`[${timestamp}] [INFO] [WebSocketServer] WebSocket server shutdown complete`);
  }
}

/**
 * Initialize WebSocket server
 * Factory function to create and start WebSocket server
 *
 * @param {Object} config - Configuration object
 * @returns {WebSocketServerManager} WebSocket server manager instance
 * @created 2025-10-01T18:00:00Z
 *
 * @example
 * const wss = initializeWebSocketServer({
 *   port: 3001,
 *   agents: { voice, conversation, analytics, integration },
 *   queueManager
 * });
 */
function initializeWebSocketServer(config) {
  const manager = new WebSocketServerManager(config);
  manager.start();
  return manager;
}

module.exports = {
  initializeWebSocketServer,
  WebSocketServerManager,
};
