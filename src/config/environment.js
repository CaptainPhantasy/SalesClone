/**
 * @fileoverview Main configuration loader for all environment variables and service configs
 * @author LegacyAI Subagent Fleet - Configuration Management Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

const path = require('path');
const { validateRequiredVars, validateConfigFormat, maskApiKey } = require('../utils/configValidator');

/**
 * Load environment variables from .env file
 * Uses dotenv to load variables into process.env
 * @returns {boolean} True if .env loaded successfully
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function loadEnvFile() {
  try {
    console.log(`[${new Date().toISOString()}] [INFO] [environment] Attempting to load .env file`);

    // Try to load dotenv
    const dotenv = require('dotenv');
    const envPath = path.resolve(process.cwd(), '.env');
    const result = dotenv.config({ path: envPath });

    if (result.error) {
      // .env file not found is acceptable in production (using real env vars)
      console.warn(`[${new Date().toISOString()}] [WARN] [environment] .env file not found at ${envPath}, using system environment variables`);
      return false;
    }

    console.log(`[${new Date().toISOString()}] [INFO] [environment] .env file loaded successfully from ${envPath}`);
    return true;
  } catch (error) {
    // If dotenv is not installed, that's okay - we might be using real env vars
    console.warn(`[${new Date().toISOString()}] [WARN] [environment] dotenv not available, using system environment variables:`, error.message);
    return false;
  }
}

// Load .env file before accessing environment variables
loadEnvFile();

/**
 * Get environment mode (development, production, test)
 * @returns {string} Current environment mode
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getNodeEnv() {
  return process.env.NODE_ENV || 'development';
}

/**
 * Check if running in production mode
 * @returns {boolean} True if production environment
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function isProduction() {
  return getNodeEnv() === 'production';
}

/**
 * Check if running in development mode
 * @returns {boolean} True if development environment
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function isDevelopment() {
  return getNodeEnv() === 'development';
}

/**
 * Check if running in test mode
 * @returns {boolean} True if test environment
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function isTest() {
  return getNodeEnv() === 'test';
}

/**
 * Twilio service configuration
 * @typedef {Object} TwilioConfig
 * @property {string} accountSid - Twilio account SID
 * @property {string} authToken - Twilio auth token
 * @property {string} phoneNumber - Twilio phone number in E.164 format
 * @property {string} webhookUrl - Base webhook URL for Twilio callbacks
 */

/**
 * Load and return Twilio configuration
 * @returns {TwilioConfig} Twilio configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getTwilioConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading Twilio configuration`);

  try {
    const config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || (process.env.APP_URL ? `${process.env.APP_URL}/webhooks/voice` : undefined),
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] Twilio config loaded - SID: ${maskApiKey(config.accountSid)}, Phone: ${config.phoneNumber}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load Twilio config:`, error);
    throw error;
  }
}

/**
 * OpenAI service configuration
 * @typedef {Object} OpenAIConfig
 * @property {string} apiKey - OpenAI API key
 * @property {string} model - Default model for text completions
 * @property {string} realtimeModel - Model for real-time audio processing
 */

/**
 * Load and return OpenAI configuration
 * @returns {OpenAIConfig} OpenAI configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getOpenAIConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading OpenAI configuration`);

  try {
    const config = {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4-1106-preview',
      realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'whisper-1',
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] OpenAI config loaded - Key: ${maskApiKey(config.apiKey)}, Model: ${config.model}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load OpenAI config:`, error);
    throw error;
  }
}

/**
 * Anthropic service configuration
 * @typedef {Object} AnthropicConfig
 * @property {string} apiKey - Anthropic API key
 * @property {string} model - Default Claude model
 */

/**
 * Load and return Anthropic configuration
 * @returns {AnthropicConfig} Anthropic configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getAnthropicConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading Anthropic configuration`);

  try {
    const config = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229',
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] Anthropic config loaded - Key: ${maskApiKey(config.apiKey)}, Model: ${config.model}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load Anthropic config:`, error);
    throw error;
  }
}

/**
 * Supabase database configuration
 * @typedef {Object} SupabaseConfig
 * @property {string} url - Supabase project URL
 * @property {string} anonKey - Anon/public key for client-side access
 * @property {string} serviceKey - Service role key for server-side access
 * @property {string} databaseUrl - Direct PostgreSQL connection URL
 */

/**
 * Load and return Supabase configuration
 * @returns {SupabaseConfig} Supabase configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getSupabaseConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading Supabase configuration`);

  try {
    const config = {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_KEY,
      databaseUrl: process.env.SUPABASE_DATABASE_URL,
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] Supabase config loaded - URL: ${config.url}, Service Key: ${maskApiKey(config.serviceKey)}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load Supabase config:`, error);
    throw error;
  }
}

/**
 * Upstash Redis configuration
 * @typedef {Object} UpstashConfig
 * @property {string} redisUrl - Upstash Redis REST URL
 * @property {string} redisToken - Upstash Redis REST token
 * @property {string} queuePrefix - Prefix for queue names
 */

/**
 * Load and return Upstash configuration
 * @returns {UpstashConfig} Upstash configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getUpstashConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading Upstash configuration`);

  try {
    const config = {
      redisUrl: process.env.UPSTASH_REDIS_URL,
      redisToken: process.env.UPSTASH_REDIS_TOKEN,
      queuePrefix: process.env.UPSTASH_QUEUE_PREFIX || 'legacyai:voice:',
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] Upstash config loaded - URL: ${config.redisUrl}, Token: ${maskApiKey(config.redisToken)}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load Upstash config:`, error);
    throw error;
  }
}

/**
 * Clerk authentication configuration
 * @typedef {Object} ClerkConfig
 * @property {string} publishableKey - Clerk publishable key for client-side
 * @property {string} secretKey - Clerk secret key for server-side
 * @property {string} domain - Clerk domain URL
 */

/**
 * Load and return Clerk configuration
 * @returns {ClerkConfig} Clerk configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getClerkConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading Clerk configuration`);

  try {
    const config = {
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
      domain: process.env.CLERK_DOMAIN,
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] Clerk config loaded - Secret Key: ${maskApiKey(config.secretKey)}, Domain: ${config.domain}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load Clerk config:`, error);
    throw error;
  }
}

/**
 * Mailgun email configuration
 * @typedef {Object} MailgunConfig
 * @property {string} apiKey - Mailgun API key
 * @property {string} domain - Mailgun sending domain
 * @property {string} from - Default from email address
 */

/**
 * Load and return Mailgun configuration
 * @returns {MailgunConfig} Mailgun configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getMailgunConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading Mailgun configuration`);

  try {
    const config = {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      from: process.env.MAILGUN_FROM || 'LegacyAI Voice <voice@legacyai.info>',
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] Mailgun config loaded - Domain: ${config.domain}, From: ${config.from}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load Mailgun config:`, error);
    throw error;
  }
}

/**
 * Application-level configuration
 * @typedef {Object} AppConfig
 * @property {string} nodeEnv - Current environment (development/production/test)
 * @property {number} port - Server port number
 * @property {number} wsPort - WebSocket server port number
 * @property {string} appUrl - Application base URL
 * @property {string} logLevel - Logging level
 */

/**
 * Load and return application configuration
 * @returns {AppConfig} Application configuration object
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function getAppConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading application configuration`);

  try {
    const config = {
      nodeEnv: getNodeEnv(),
      port: parseInt(process.env.PORT || '3000', 10),
      wsPort: parseInt(process.env.WS_PORT || '3001', 10),
      appUrl: process.env.APP_URL,
      logLevel: process.env.LOG_LEVEL || 'info',
    };

    console.log(`[${new Date().toISOString()}] [INFO] [environment] App config loaded - Environment: ${config.nodeEnv}, Port: ${config.port}`);
    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load app config:`, error);
    throw error;
  }
}

/**
 * Complete application configuration object
 * @typedef {Object} Config
 * @property {AppConfig} app - Application configuration
 * @property {TwilioConfig} twilio - Twilio configuration
 * @property {OpenAIConfig} openai - OpenAI configuration
 * @property {AnthropicConfig} anthropic - Anthropic configuration
 * @property {SupabaseConfig} supabase - Supabase configuration
 * @property {UpstashConfig} upstash - Upstash configuration
 * @property {ClerkConfig} clerk - Clerk configuration
 * @property {MailgunConfig} mailgun - Mailgun configuration
 */

/**
 * Load all configuration with validation
 * @returns {Config} Complete validated configuration object
 * @throws {Error} If required environment variables are missing or invalid
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */
function loadConfig() {
  console.log(`[${new Date().toISOString()}] [INFO] [environment] ========================================`);
  console.log(`[${new Date().toISOString()}] [INFO] [environment] Loading LegacyAI Voice Agent Configuration`);
  console.log(`[${new Date().toISOString()}] [INFO] [environment] ========================================`);

  try {
    // First, validate that all required environment variables are present
    const validation = validateRequiredVars();

    if (!validation.valid) {
      console.error(`[${new Date().toISOString()}] [ERROR] [environment] Configuration validation failed!`);
      validation.errors.forEach(error => {
        console.error(`[${new Date().toISOString()}] [ERROR] [environment] ${error}`);
      });
      throw new Error(`Configuration validation failed: ${validation.errors.join('; ')}`);
    }

    // Load all configuration sections
    const config = {
      app: getAppConfig(),
      twilio: getTwilioConfig(),
      openai: getOpenAIConfig(),
      anthropic: getAnthropicConfig(),
      supabase: getSupabaseConfig(),
      upstash: getUpstashConfig(),
      clerk: getClerkConfig(),
      mailgun: getMailgunConfig(),
    };

    // Validate configuration format
    const formatValidation = validateConfigFormat(config);

    if (!formatValidation.valid) {
      console.error(`[${new Date().toISOString()}] [ERROR] [environment] Configuration format validation failed!`);
      formatValidation.errors.forEach(error => {
        console.error(`[${new Date().toISOString()}] [ERROR] [environment] ${error}`);
      });
      throw new Error(`Configuration format validation failed: ${formatValidation.errors.join('; ')}`);
    }

    console.log(`[${new Date().toISOString()}] [INFO] [environment] ========================================`);
    console.log(`[${new Date().toISOString()}] [INFO] [environment] Configuration loaded and validated successfully!`);
    console.log(`[${new Date().toISOString()}] [INFO] [environment] Environment: ${config.app.nodeEnv}`);
    console.log(`[${new Date().toISOString()}] [INFO] [environment] ========================================`);

    return config;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [environment] Failed to load configuration:`, error);
    throw error;
  }
}

module.exports = {
  loadConfig,
  getNodeEnv,
  isProduction,
  isDevelopment,
  isTest,
  // Export individual config loaders for testing purposes
  getTwilioConfig,
  getOpenAIConfig,
  getAnthropicConfig,
  getSupabaseConfig,
  getUpstashConfig,
  getClerkConfig,
  getMailgunConfig,
  getAppConfig,
};
