/**
 * @fileoverview Configuration validation utility for environment variables
 * @author LegacyAI Subagent Fleet - Configuration Management Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

/**
 * List of all required environment variables for the application
 * @constant {string[]}
 */
const REQUIRED_ENV_VARS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_KEY',
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'CLERK_SECRET_KEY',
  'MAILGUN_API_KEY',
];

/**
 * Masks sensitive API keys for logging purposes
 * @param {string} key - The API key to mask
 * @returns {string} Masked key showing only first 7 and last 4 characters
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * maskApiKey('sk-1234567890abcdefghijklmnop')
 * // Returns: 'sk-1234...mnop'
 */
function maskApiKey(key) {
  try {
    if (!key || typeof key !== 'string') {
      return '***INVALID***';
    }

    // If key is too short, mask entirely
    if (key.length < 12) {
      return '***';
    }

    // Show first 7 chars and last 4 chars
    const start = key.substring(0, 7);
    const end = key.substring(key.length - 4);
    return `${start}...${end}`;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Failed to mask API key:`, error);
    return '***ERROR***';
  }
}

/**
 * Validates that all required environment variables are present
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @returns {{valid: boolean, missing: string[], errors: string[]}} Validation result
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * const result = validateRequiredVars();
 * if (!result.valid) {
 *   console.error('Missing vars:', result.missing);
 * }
 */
function validateRequiredVars(env = process.env) {
  console.log(`[${new Date().toISOString()}] [INFO] [configValidator] Starting validation of required environment variables`);

  const missing = [];
  const errors = [];

  try {
    // Check each required variable
    for (const varName of REQUIRED_ENV_VARS) {
      const value = env[varName];

      if (!value || value.trim() === '') {
        missing.push(varName);
        console.warn(`[${new Date().toISOString()}] [WARN] [configValidator] Missing required env var: ${varName}`);
      } else {
        console.log(`[${new Date().toISOString()}] [DEBUG] [configValidator] Found ${varName}: ${maskApiKey(value)}`);
      }
    }

    // Generate error messages if variables are missing
    if (missing.length > 0) {
      errors.push(`Missing ${missing.length} required environment variable(s): ${missing.join(', ')}`);
      errors.push('Please ensure all required variables are set in your .env file');
      console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Validation failed: ${missing.length} missing variables`);
    } else {
      console.log(`[${new Date().toISOString()}] [INFO] [configValidator] All required environment variables present`);
    }

    return {
      valid: missing.length === 0,
      missing,
      errors,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Validation error:`, error);
    return {
      valid: false,
      missing: [],
      errors: [`Validation process failed: ${error.message}`],
    };
  }
}

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL format
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * isValidUrl('https://example.com') // Returns: true
 * isValidUrl('not-a-url') // Returns: false
 */
function isValidUrl(url) {
  try {
    // Check if string is empty
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Try to construct a URL object - will throw if invalid
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates phone number format (E.164 format)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid E.164 format
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * isValidPhoneNumber('+18338542355') // Returns: true
 * isValidPhoneNumber('123456') // Returns: false
 */
function isValidPhoneNumber(phoneNumber) {
  try {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return false;
    }

    // E.164 format: +[country code][number] (max 15 digits)
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Phone validation error:`, error);
    return false;
  }
}

/**
 * Validates Twilio Account SID format
 * @param {string} sid - Account SID to validate
 * @returns {boolean} True if valid Twilio Account SID format
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * isValidTwilioSid('ACaee84a6ec0612f1443d3d2585ed8e1') // Returns: true
 */
function isValidTwilioSid(sid) {
  try {
    if (!sid || typeof sid !== 'string') {
      return false;
    }

    // Twilio Account SIDs start with AC and are 34 characters long
    // Case-insensitive check since Twilio uses lowercase hex
    const sidRegex = /^AC[a-f0-9]{32}$/i;
    return sidRegex.test(sid);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] SID validation error:`, error);
    return false;
  }
}

/**
 * Validates OpenAI API key format
 * @param {string} key - API key to validate
 * @returns {boolean} True if valid OpenAI key format
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * isValidOpenAIKey('sk-proj-...') // Returns: true
 */
function isValidOpenAIKey(key) {
  try {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // OpenAI keys start with 'sk-' or 'sk-proj-'
    return key.startsWith('sk-') || key.startsWith('sk-proj-');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] OpenAI key validation error:`, error);
    return false;
  }
}

/**
 * Validates Anthropic API key format
 * @param {string} key - API key to validate
 * @returns {boolean} True if valid Anthropic key format
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * isValidAnthropicKey('sk-ant-api03-...') // Returns: true
 */
function isValidAnthropicKey(key) {
  try {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Anthropic keys start with 'sk-ant-'
    return key.startsWith('sk-ant-');
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Anthropic key validation error:`, error);
    return false;
  }
}

/**
 * Validates configuration format for all services
 * @param {Object} config - Configuration object to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result with detailed errors
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 * @example
 * const result = validateConfigFormat(config);
 * if (!result.valid) {
 *   console.error('Config errors:', result.errors);
 * }
 */
function validateConfigFormat(config) {
  console.log(`[${new Date().toISOString()}] [INFO] [configValidator] Validating configuration format`);

  const errors = [];

  try {
    // Validate Twilio configuration
    if (config.twilio) {
      if (!isValidTwilioSid(config.twilio.accountSid)) {
        errors.push('Invalid Twilio Account SID format (should start with AC and be 34 chars)');
      }
      if (!isValidPhoneNumber(config.twilio.phoneNumber)) {
        errors.push('Invalid Twilio phone number format (should be E.164 format: +1234567890)');
      }
      if (config.twilio.webhookUrl && !isValidUrl(config.twilio.webhookUrl)) {
        errors.push('Invalid Twilio webhook URL format');
      }
    } else {
      errors.push('Missing Twilio configuration');
    }

    // Validate OpenAI configuration
    if (config.openai) {
      if (!isValidOpenAIKey(config.openai.apiKey)) {
        errors.push('Invalid OpenAI API key format (should start with sk-)');
      }
      if (!config.openai.model) {
        errors.push('Missing OpenAI model specification');
      }
    } else {
      errors.push('Missing OpenAI configuration');
    }

    // Validate Anthropic configuration
    if (config.anthropic) {
      if (!isValidAnthropicKey(config.anthropic.apiKey)) {
        errors.push('Invalid Anthropic API key format (should start with sk-ant-)');
      }
      if (!config.anthropic.model) {
        errors.push('Missing Anthropic model specification');
      }
    } else {
      errors.push('Missing Anthropic configuration');
    }

    // Validate Supabase configuration
    if (config.supabase) {
      if (!isValidUrl(config.supabase.url)) {
        errors.push('Invalid Supabase URL format');
      }
      if (!config.supabase.anonKey) {
        errors.push('Missing Supabase anon key');
      }
      if (!config.supabase.serviceKey) {
        errors.push('Missing Supabase service key');
      }
    } else {
      errors.push('Missing Supabase configuration');
    }

    // Validate Upstash configuration
    if (config.upstash) {
      if (!isValidUrl(config.upstash.redisUrl)) {
        errors.push('Invalid Upstash Redis URL format');
      }
      if (!config.upstash.redisToken) {
        errors.push('Missing Upstash Redis token');
      }
    } else {
      errors.push('Missing Upstash configuration');
    }

    // Validate Clerk configuration
    if (config.clerk) {
      if (!config.clerk.secretKey) {
        errors.push('Missing Clerk secret key');
      }
    } else {
      errors.push('Missing Clerk configuration');
    }

    // Validate Mailgun configuration
    if (config.mailgun) {
      if (!config.mailgun.apiKey) {
        errors.push('Missing Mailgun API key');
      }
      if (!config.mailgun.domain) {
        errors.push('Missing Mailgun domain');
      }
    } else {
      errors.push('Missing Mailgun configuration');
    }

    if (errors.length === 0) {
      console.log(`[${new Date().toISOString()}] [INFO] [configValidator] Configuration format validation passed`);
    } else {
      console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Configuration format validation failed with ${errors.length} error(s)`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [ERROR] [configValidator] Format validation error:`, error);
    return {
      valid: false,
      errors: [`Format validation failed: ${error.message}`],
    };
  }
}

module.exports = {
  REQUIRED_ENV_VARS,
  validateRequiredVars,
  validateConfigFormat,
  maskApiKey,
  isValidUrl,
  isValidPhoneNumber,
  isValidTwilioSid,
  isValidOpenAIKey,
  isValidAnthropicKey,
};
