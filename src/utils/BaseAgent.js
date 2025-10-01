/**
 * @fileoverview Base agent class providing common functionality
 * @author LegacyAI Subagent Fleet
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 *
 * This base class provides common functionality for all agents including:
 * - Structured logging with timestamps
 * - Request ID generation
 * - Standard initialization patterns
 * - Common utility methods
 */

/**
 * Base agent class that all agents should extend
 * Provides logging, request ID generation, and common patterns
 *
 * @class BaseAgent
 * @created 2025-10-01T12:00:00Z
 * @lastModified 2025-10-01T12:00:00Z
 */
class BaseAgent {
  /**
   * Initialize base agent
   *
   * @param {Object} config - Agent configuration object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  constructor(config = {}) {
    this.config = config;
    this.logger = this.initLogger();
    this.startTime = new Date().toISOString();

    this.logger.info(`${this.constructor.name} initialized`);
  }

  /**
   * Initialize logger with timestamps
   * Creates a logger that formats messages with timestamps and class names
   *
   * @returns {Object} Logger instance with info, warn, error, debug methods
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  initLogger() {
    const name = this.constructor.name;
    return {
      info: (msg, data) => {
        const logData = data ? ` ${JSON.stringify(data)}` : '';
        console.log(`[${new Date().toISOString()}] [INFO] [${name}] ${msg}${logData}`);
      },
      warn: (msg, data) => {
        const logData = data ? ` ${JSON.stringify(data)}` : '';
        console.warn(`[${new Date().toISOString()}] [WARN] [${name}] ${msg}${logData}`);
      },
      error: (msg, err) => {
        console.error(`[${new Date().toISOString()}] [ERROR] [${name}] ${msg}`, err);
      },
      debug: (msg, data) => {
        const logData = data ? ` ${JSON.stringify(data)}` : '';
        console.debug(`[${new Date().toISOString()}] [DEBUG] [${name}] ${msg}${logData}`);
      }
    };
  }

  /**
   * Generate unique request ID using UUID v4 format
   * Used for tracking requests and responses across the system
   *
   * @returns {string} UUID v4
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   *
   * @example
   * const requestId = this.generateRequestId();
   * // Returns: '123e4567-e89b-12d3-a456-426614174000'
   */
  generateRequestId() {
    // Simple UUID v4 generator
    // Uses random numbers to create a valid UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Initialize agent and dependencies
   * Override this method in subclasses to add specific initialization logic
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async initialize() {
    this.logger.info('Base initialization complete');
  }

  /**
   * Health check for agent
   * Override this method in subclasses to add specific health checks
   *
   * @returns {Promise<Object>} Health status object
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async healthCheck() {
    this.logger.info('Running health check');
    return {
      healthy: true,
      details: {},
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Graceful shutdown
   * Override this method in subclasses to add cleanup logic
   *
   * @returns {Promise<void>}
   * @created 2025-10-01T12:00:00Z
   * @lastModified 2025-10-01T12:00:00Z
   */
  async shutdown() {
    this.logger.info('Shutting down...');
    this.logger.info('Shutdown complete');
  }
}

module.exports = { BaseAgent };
