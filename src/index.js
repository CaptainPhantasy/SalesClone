/**
 * @fileoverview Main application entry point for LegacyAI Voice Agent System
 * @author LegacyAI Subagent Fleet - API Server & WebSocket Agent
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 *
 * This is the primary server application that:
 * - Initializes Express HTTP server on port 3000
 * - Sets up WebSocket server on port 3001
 * - Loads all AI agents (Voice, Conversation, Analytics, Integration)
 * - Configures middleware (CORS, body parsing, logging, error handling)
 * - Mounts API routes and webhook handlers
 * - Manages graceful shutdown
 */

const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { config } = require('./config');
const { VoiceGatewayAgent } = require('./agents/VoiceGatewayAgent');
const { ConversationAgent } = require('./agents/ConversationAgent');
const { AnalyticsAgent } = require('./agents/AnalyticsAgent');
const { IntegrationAgent } = require('./agents/IntegrationAgent');
const QueueManager = require('./services/QueueManager');
const DatabaseService = require('./services/DatabaseService');
const requestLogger = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const webhooksRouter = require('./routes/webhooks');
const apiRouter = require('./routes/api');
const { initializeWebSocketServer } = require('./websocket/server');

/**
 * Main application class for LegacyAI Voice System
 * Orchestrates all services, agents, and servers
 *
 * @class LegacyAIVoiceSystem
 * @created 2025-10-01T18:00:00Z
 * @lastModified 2025-10-01T18:00:00Z
 */
class LegacyAIVoiceSystem {
  /**
   * Initialize the voice system with all components
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  constructor() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing system...`);

    // Create Express app and HTTP server
    this.app = express();
    this.httpServer = createServer(this.app);

    // Initialize core services
    this.dbService = null;
    this.queueManager = null;

    // Initialize AI agents
    this.agents = {
      voice: null,
      conversation: null,
      analytics: null,
      integration: null,
    };

    // WebSocket server instance
    this.wss = null;

    // Track initialization status
    this.initialized = false;
    this.isShuttingDown = false;

    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] System instance created`);
  }

  /**
   * Setup Express middleware
   * Configures CORS, body parsing, logging, and timeout
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  setupMiddleware() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Setting up middleware...`);

    try {
      // CORS configuration - Allow all origins in development, restrict in production
      const corsOptions = {
        origin: config.app.nodeEnv === 'production'
          ? config.app.corsOrigin || 'https://yourdomain.com'
          : '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      };

      this.app.use(cors(corsOptions));
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] CORS enabled`);

      // Body parsing middleware
      this.app.use(express.json({ limit: '10mb' })); // JSON parsing with 10MB limit
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded parsing
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Body parsing middleware configured`);

      // Custom request logging middleware
      this.app.use(requestLogger);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Request logger enabled`);

      // Request timeout middleware (30 seconds)
      this.app.use((req, res, next) => {
        req.setTimeout(30000); // 30 second timeout
        res.setTimeout(30000);
        next();
      });
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Request timeout set to 30s`);

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Middleware setup complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] Middleware setup failed:`, error);
      throw error;
    }
  }

  /**
   * Setup Express routes
   * Mounts webhook handlers and API endpoints
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  setupRoutes() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Setting up routes...`);

    try {
      // Health check endpoint - No authentication required
      this.app.get('/health', (req, res) => {
        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: config.app.nodeEnv,
          agents: {
            voice: this.agents.voice ? 'initialized' : 'not initialized',
            conversation: this.agents.conversation ? 'initialized' : 'not initialized',
            analytics: this.agents.analytics ? 'initialized' : 'not initialized',
            integration: this.agents.integration ? 'initialized' : 'not initialized',
          },
          services: {
            database: this.dbService ? 'connected' : 'not connected',
            queue: this.queueManager ? 'connected' : 'not connected',
          },
        };

        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Health check requested`);
        res.json(healthStatus);
      });

      // Mount webhook routes (Twilio callbacks)
      // Pass agents and queue manager to webhook handlers
      this.app.use('/webhooks', webhooksRouter({
        agents: this.agents,
        queueManager: this.queueManager,
      }));
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Webhook routes mounted at /webhooks`);

      // Mount API routes (REST endpoints)
      this.app.use('/api', apiRouter({
        agents: this.agents,
        dbService: this.dbService,
        queueManager: this.queueManager,
      }));
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] API routes mounted at /api`);

      // 404 handler - Must be after all routes
      this.app.use(notFoundHandler);

      // Error handling middleware - Must be last
      this.app.use(errorHandler);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Error handlers configured`);

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Routes setup complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] Routes setup failed:`, error);
      throw error;
    }
  }

  /**
   * Initialize all AI agents
   * Creates and initializes Voice, Conversation, Analytics, and Integration agents
   * @returns {Promise<void>}
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  async initializeAgents() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing AI agents...`);

    try {
      // Initialize Voice Gateway Agent
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing VoiceGatewayAgent...`);
      this.agents.voice = new VoiceGatewayAgent(config);
      await this.agents.voice.initialize();
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] VoiceGatewayAgent initialized`);

      // Initialize Conversation Agent
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing ConversationAgent...`);
      this.agents.conversation = new ConversationAgent(config);
      await this.agents.conversation.initialize();
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] ConversationAgent initialized`);

      // Initialize Analytics Agent
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing AnalyticsAgent...`);
      this.agents.analytics = new AnalyticsAgent(config);
      await this.agents.analytics.initialize();
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] AnalyticsAgent initialized`);

      // Initialize Integration Agent
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing IntegrationAgent...`);
      this.agents.integration = new IntegrationAgent(config);
      await this.agents.integration.initialize();
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] IntegrationAgent initialized`);

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] All agents initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] Agent initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Initialize core services (Database and Queue Manager)
   * @returns {Promise<void>}
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  async initializeServices() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing core services...`);

    try {
      // Initialize Database Service
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing DatabaseService...`);
      this.dbService = new DatabaseService(config.supabase);
      await this.dbService.initialize();
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] DatabaseService initialized`);

      // Initialize Queue Manager
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Initializing QueueManager...`);
      this.queueManager = new QueueManager(config.upstash);
      await this.queueManager.initialize();
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] QueueManager initialized`);

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Core services initialized successfully`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] Service initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Setup WebSocket server for real-time updates
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  setupWebSocket() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Setting up WebSocket server...`);

    try {
      // Initialize WebSocket server on separate port (3001)
      this.wss = initializeWebSocketServer({
        port: config.app.websocketPort || 3001,
        agents: this.agents,
        queueManager: this.queueManager,
      });

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] WebSocket server configured on port ${config.app.websocketPort || 3001}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] WebSocket setup failed:`, error);
      throw error;
    }
  }

  /**
   * Initialize the entire system
   * Sets up all services, agents, middleware, and servers
   * @returns {Promise<void>}
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  async initialize() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Starting system initialization...`);

    try {
      // Step 1: Initialize core services (database, queue)
      await this.initializeServices();

      // Step 2: Initialize AI agents
      await this.initializeAgents();

      // Step 3: Setup Express middleware
      this.setupMiddleware();

      // Step 4: Setup Express routes
      this.setupRoutes();

      // Step 5: Setup WebSocket server
      this.setupWebSocket();

      this.initialized = true;
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] System initialization complete`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] System initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Start the HTTP server
   * @returns {Promise<void>}
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  async start() {
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Starting HTTP server...`);

    try {
      if (!this.initialized) {
        console.log(`[${new Date().toISOString()}] [WARN] [LegacyAIVoiceSystem] System not initialized, initializing now...`);
        await this.initialize();
      }

      const PORT = config.app.port || 3000;

      // Start listening
      await new Promise((resolve, reject) => {
        this.httpServer.listen(PORT, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] ====================================`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] LegacyAI Voice System Started`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] ====================================`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] HTTP Server: http://localhost:${PORT}`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] WebSocket Server: ws://localhost:${config.app.websocketPort || 3001}`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Environment: ${config.app.nodeEnv}`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Health Check: http://localhost:${PORT}/health`);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] ====================================`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] Failed to start server:`, error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown the system
   * Closes all connections, workers, and services
   * @returns {Promise<void>}
   * @created 2025-10-01T18:00:00Z
   * @lastModified 2025-10-01T18:00:00Z
   */
  async shutdown() {
    if (this.isShuttingDown) {
      console.log(`[${new Date().toISOString()}] [WARN] [LegacyAIVoiceSystem] Shutdown already in progress...`);
      return;
    }

    this.isShuttingDown = true;
    console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Starting graceful shutdown...`);

    try {
      // Step 1: Close WebSocket server
      if (this.wss) {
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Closing WebSocket server...`);
        this.wss.close();
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] WebSocket server closed`);
      }

      // Step 2: Close HTTP server
      if (this.httpServer) {
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Closing HTTP server...`);
        await new Promise((resolve) => {
          this.httpServer.close(() => {
            console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] HTTP server closed`);
            resolve();
          });
        });
      }

      // Step 3: Shutdown agents
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Shutting down agents...`);
      const agentShutdowns = Object.keys(this.agents).map(async (key) => {
        if (this.agents[key] && typeof this.agents[key].shutdown === 'function') {
          await this.agents[key].shutdown();
          console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] ${key} agent shutdown complete`);
        }
      });
      await Promise.all(agentShutdowns);
      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] All agents shut down`);

      // Step 4: Close queue manager
      if (this.queueManager && typeof this.queueManager.close === 'function') {
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Closing queue manager...`);
        await this.queueManager.close();
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Queue manager closed`);
      }

      // Step 5: Close database connection
      if (this.dbService && typeof this.dbService.close === 'function') {
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Closing database connection...`);
        await this.dbService.close();
        console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Database connection closed`);
      }

      console.log(`[${new Date().toISOString()}] [INFO] [LegacyAIVoiceSystem] Graceful shutdown complete`);
      process.exit(0);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] [ERROR] [LegacyAIVoiceSystem] Error during shutdown:`, error);
      process.exit(1);
    }
  }
}

// Create system instance
const voiceSystem = new LegacyAIVoiceSystem();

// Handle process signals for graceful shutdown
process.on('SIGTERM', async () => {
  console.log(`[${new Date().toISOString()}] [INFO] [Process] Received SIGTERM signal`);
  await voiceSystem.shutdown();
});

process.on('SIGINT', async () => {
  console.log(`[${new Date().toISOString()}] [INFO] [Process] Received SIGINT signal`);
  await voiceSystem.shutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] [ERROR] [Process] Unhandled Rejection at:`, promise, 'reason:', reason);
  // In production, you might want to shutdown gracefully
  if (config.app.nodeEnv === 'production') {
    voiceSystem.shutdown();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] [ERROR] [Process] Uncaught Exception:`, error);
  // In production, shutdown gracefully
  if (config.app.nodeEnv === 'production') {
    voiceSystem.shutdown();
  }
});

// Start the system if not in test environment
if (process.env.NODE_ENV !== 'test') {
  voiceSystem.start().catch((error) => {
    console.error(`[${new Date().toISOString()}] [ERROR] [Process] Failed to start system:`, error);
    process.exit(1);
  });
}

// Export for testing
module.exports = { LegacyAIVoiceSystem, voiceSystem };
