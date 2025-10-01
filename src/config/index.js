/**
 * @fileoverview Configuration module exports - Main entry point for configuration
 * @author LegacyAI Subagent Fleet - Configuration Management Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

const {
  loadConfig,
  getNodeEnv,
  isProduction,
  isDevelopment,
  isTest,
} = require('./environment');

const {
  validateRequiredVars,
  validateConfigFormat,
  REQUIRED_ENV_VARS,
} = require('../utils/configValidator');

// Load configuration on module initialization
let config = null;

try {
  console.log(`[${new Date().toISOString()}] [INFO] [config] Initializing configuration module`);

  // Load and validate all configuration
  config = loadConfig();

  console.log(`[${new Date().toISOString()}] [INFO] [config] Configuration module initialized successfully`);
  console.log(`[${new Date().toISOString()}] [INFO] [config] Running in ${config.app.nodeEnv} mode`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] [ERROR] [config] Fatal error initializing configuration module:`, error);

  // In production, we should fail fast if configuration is invalid
  if (process.env.NODE_ENV === 'production') {
    console.error(`[${new Date().toISOString()}] [ERROR] [config] Exiting due to invalid configuration in production mode`);
    process.exit(1);
  }

  // In development/test, allow the module to load but config will be null
  console.warn(`[${new Date().toISOString()}] [WARN] [config] Configuration not loaded - this may cause errors. Please check your .env file.`);
}

/**
 * Get the current configuration object
 * @returns {Object} Configuration object
 * @throws {Error} If configuration is not loaded
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * const config = getConfig();
 * console.log(config.twilio.phoneNumber);
 */
function getConfig() {
  if (!config) {
    throw new Error('Configuration not loaded. Please ensure all required environment variables are set.');
  }
  return config;
}

/**
 * Reload configuration (useful for testing or hot-reloading)
 * @returns {Object} Newly loaded configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * // Reload config after environment changes
 * const newConfig = reloadConfig();
 */
function reloadConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [config] Reloading configuration`);

  try {
    config = loadConfig();
    console.log(`[${new Date().toISOString()}] [INFO] [config] Configuration reloaded successfully`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [config] Failed to reload configuration:`, error);
    throw error;
  }
}

/**
 * Validate current configuration
 * @returns {{valid: boolean, errors: string[]}} Validation result
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * const validation = validateConfig();
 * if (!validation.valid) {
 *   console.error('Config errors:', validation.errors);
 * }
 */
function validateConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [config] Validating configuration`);

  try {
    // Validate required environment variables
    const envValidation = validateRequiredVars();

    if (!envValidation.valid) {
      return {
        valid: false,
        errors: envValidation.errors,
      };
    }

    // Validate configuration format if config is loaded
    if (config) {
      const formatValidation = validateConfigFormat(config);
      return formatValidation;
    }

    return {
      valid: true,
      errors: [],
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [config] Validation error:`, error);
    return {
      valid: false,
      errors: [error.message],
    };
  }
}

/**
 * Check if configuration is loaded and valid
 * @returns {boolean} True if configuration is loaded
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function isConfigLoaded() {
  return config !== null;
}

// Export named exports for better flexibility
module.exports = {
  // Main config object
  config,
  default: config,

  // Config functions
  getConfig,
  reloadConfig,
  validateConfig,
  isConfigLoaded,

  // Environment helpers
  getNodeEnv,
  isProduction,
  isDevelopment,
  isTest,

  // Validation utilities
  validateRequiredVars,
  validateConfigFormat,
  REQUIRED_ENV_VARS,
};
