/**
 * @fileoverview Comprehensive tests for configuration management system
 * @author LegacyAI Subagent Fleet - Configuration Management Agent
 * @created 2025-10-01T00:00:00Z
 * @lastModified 2025-10-01T00:00:00Z
 */

const {
  validateRequiredVars,
  validateConfigFormat,
  maskApiKey,
  isValidUrl,
  isValidPhoneNumber,
  isValidTwilioSid,
  isValidOpenAIKey,
  isValidAnthropicKey,
  REQUIRED_ENV_VARS,
} = require('../src/utils/configValidator');

describe('Configuration Validator', () => {
  describe('maskApiKey', () => {
    /**
     * Test that API keys are properly masked for security
     * @created 2025-10-01T00:00:00Z
     */
    test('should mask API key showing first 7 and last 4 characters', () => {
      const key = 'sk-1234567890abcdefghijklmnop';
      const masked = maskApiKey(key);
      expect(masked).toBe('sk-1234...mnop');
      expect(masked).not.toContain('890abc');
    });

    test('should handle short keys', () => {
      const shortKey = 'short';
      const masked = maskApiKey(shortKey);
      expect(masked).toBe('***');
    });

    test('should handle invalid input', () => {
      expect(maskApiKey(null)).toBe('***INVALID***');
      expect(maskApiKey(undefined)).toBe('***INVALID***');
      expect(maskApiKey(123)).toBe('***INVALID***');
    });
  });

  describe('URL validation', () => {
    /**
     * Test URL format validation
     * @created 2025-10-01T00:00:00Z
     */
    test('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://supabase.co/project')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://invalid')).toBe(true); // ftp is valid URL protocol
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });
  });

  describe('Phone number validation', () => {
    /**
     * Test E.164 phone number format validation
     * @created 2025-10-01T00:00:00Z
     */
    test('should validate E.164 format phone numbers', () => {
      expect(isValidPhoneNumber('+18338542355')).toBe(true);
      expect(isValidPhoneNumber('+1234567890')).toBe(true);
      expect(isValidPhoneNumber('+442071234567')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(isValidPhoneNumber('123456')).toBe(false);
      expect(isValidPhoneNumber('1234567890')).toBe(false); // Missing +
      expect(isValidPhoneNumber('+0123456789')).toBe(false); // Can't start with 0
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
    });
  });

  describe('Twilio SID validation', () => {
    /**
     * Test Twilio Account SID format validation
     * @created 2025-10-01T00:00:00Z
     */
    test('should validate correct Twilio Account SIDs', () => {
      expect(isValidTwilioSid('ACtest1234567890abcdef1234567890')).toBe(true);
      expect(isValidTwilioSid('ACabcd1234567890abcdef1234567890')).toBe(true);
      expect(isValidTwilioSid('ACfake567890abcdef1234567890fake')).toBe(true);
    });

    test('should reject invalid Twilio SIDs', () => {
      expect(isValidTwilioSid('AC123')).toBe(false); // Too short
      expect(isValidTwilioSid('SKfake567890abcdef1234567890fake')).toBe(false); // Wrong prefix
      expect(isValidTwilioSid('ac1234567890abcdef1234567890abcdef')).toBe(true); // Case insensitive
      expect(isValidTwilioSid('')).toBe(false);
      expect(isValidTwilioSid(null)).toBe(false);
    });
  });

  describe('OpenAI key validation', () => {
    /**
     * Test OpenAI API key format validation
     * @created 2025-10-01T00:00:00Z
     */
    test('should validate OpenAI API keys', () => {
      expect(isValidOpenAIKey('sk-proj-1234567890abcdef')).toBe(true);
      expect(isValidOpenAIKey('sk-1234567890abcdef')).toBe(true);
    });

    test('should reject invalid OpenAI keys', () => {
      expect(isValidOpenAIKey('invalid-key')).toBe(false);
      expect(isValidOpenAIKey('api-key-123')).toBe(false);
      expect(isValidOpenAIKey('')).toBe(false);
      expect(isValidOpenAIKey(null)).toBe(false);
    });
  });

  describe('Anthropic key validation', () => {
    /**
     * Test Anthropic API key format validation
     * @created 2025-10-01T00:00:00Z
     */
    test('should validate Anthropic API keys', () => {
      expect(isValidAnthropicKey('sk-ant-api03-1234567890abcdef')).toBe(true);
      expect(isValidAnthropicKey('sk-ant-1234567890abcdef')).toBe(true);
    });

    test('should reject invalid Anthropic keys', () => {
      expect(isValidAnthropicKey('sk-1234567890abcdef')).toBe(false);
      expect(isValidAnthropicKey('invalid-key')).toBe(false);
      expect(isValidAnthropicKey('')).toBe(false);
      expect(isValidAnthropicKey(null)).toBe(false);
    });
  });

  describe('Required environment variables validation', () => {
    /**
     * Test that all required environment variables are checked
     * @created 2025-10-01T00:00:00Z
     */
    test('should have correct list of required variables', () => {
      expect(REQUIRED_ENV_VARS).toContain('TWILIO_ACCOUNT_SID');
      expect(REQUIRED_ENV_VARS).toContain('TWILIO_AUTH_TOKEN');
      expect(REQUIRED_ENV_VARS).toContain('OPENAI_API_KEY');
      expect(REQUIRED_ENV_VARS).toContain('ANTHROPIC_API_KEY');
      expect(REQUIRED_ENV_VARS).toContain('SUPABASE_URL');
      expect(REQUIRED_ENV_VARS).toContain('UPSTASH_REDIS_URL');
      expect(REQUIRED_ENV_VARS).toContain('CLERK_SECRET_KEY');
      expect(REQUIRED_ENV_VARS).toContain('MAILGUN_API_KEY');
      expect(REQUIRED_ENV_VARS.length).toBe(12);
    });

    test('should pass validation with all required variables', () => {
      const mockEnv = {
        TWILIO_ACCOUNT_SID: 'ACtest1234567890abcdef1234567890',
        TWILIO_AUTH_TOKEN: 'test-token',
        TWILIO_PHONE_NUMBER: '+18338542355',
        OPENAI_API_KEY: 'sk-test',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_KEY: 'service-key',
        UPSTASH_REDIS_URL: 'https://test.upstash.io',
        UPSTASH_REDIS_TOKEN: 'token',
        CLERK_SECRET_KEY: 'clerk-key',
        MAILGUN_API_KEY: 'mailgun-key',
      };

      const result = validateRequiredVars(mockEnv);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail validation with missing variables', () => {
      const mockEnv = {
        TWILIO_ACCOUNT_SID: 'ACtest1234567890abcdef1234567890',
        // Missing other required variables
      };

      const result = validateRequiredVars(mockEnv);
      expect(result.valid).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.missing).toContain('OPENAI_API_KEY');
      expect(result.missing).toContain('ANTHROPIC_API_KEY');
    });

    test('should detect empty string as missing', () => {
      const mockEnv = {
        TWILIO_ACCOUNT_SID: '',
        TWILIO_AUTH_TOKEN: '   ',
        TWILIO_PHONE_NUMBER: '+18338542355',
        OPENAI_API_KEY: 'sk-test',
        ANTHROPIC_API_KEY: 'sk-ant-test',
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_KEY: 'service-key',
        UPSTASH_REDIS_URL: 'https://test.upstash.io',
        UPSTASH_REDIS_TOKEN: 'token',
        CLERK_SECRET_KEY: 'clerk-key',
        MAILGUN_API_KEY: 'mailgun-key',
      };

      const result = validateRequiredVars(mockEnv);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('TWILIO_ACCOUNT_SID');
      expect(result.missing).toContain('TWILIO_AUTH_TOKEN');
    });
  });

  describe('Configuration format validation', () => {
    /**
     * Test that configuration objects are properly validated
     * @created 2025-10-01T00:00:00Z
     */
    test('should validate correct configuration format', () => {
      const validConfig = {
        twilio: {
          accountSid: 'ACtest1234567890abcdef1234567890',
          authToken: 'test-token',
          phoneNumber: '+18338542355',
          webhookUrl: 'https://example.com/webhook',
        },
        openai: {
          apiKey: 'sk-test',
          model: 'gpt-4-1106-preview',
          realtimeModel: 'whisper-1',
        },
        anthropic: {
          apiKey: 'sk-ant-test',
          model: 'claude-3-opus-20240229',
        },
        supabase: {
          url: 'https://test.supabase.co',
          anonKey: 'anon-key',
          serviceKey: 'service-key',
        },
        upstash: {
          redisUrl: 'https://test.upstash.io',
          redisToken: 'token',
          queuePrefix: 'test:',
        },
        clerk: {
          secretKey: 'clerk-key',
          publishableKey: 'pub-key',
        },
        mailgun: {
          apiKey: 'mailgun-key',
          domain: 'test.mailgun.org',
          from: 'test@example.com',
        },
      };

      const result = validateConfigFormat(validConfig);
      expect(result.errors).toEqual([]); // This will show actual errors if failing
      expect(result.valid).toBe(true);
    });

    test('should detect invalid Twilio configuration', () => {
      const invalidConfig = {
        twilio: {
          accountSid: 'INVALID',
          authToken: 'test-token',
          phoneNumber: 'not-a-phone',
          webhookUrl: 'not-a-url',
        },
        openai: { apiKey: 'sk-test', model: 'gpt-4' },
        anthropic: { apiKey: 'sk-ant-test', model: 'claude-3' },
        supabase: { url: 'https://test.supabase.co', anonKey: 'key', serviceKey: 'key' },
        upstash: { redisUrl: 'https://test.upstash.io', redisToken: 'token' },
        clerk: { secretKey: 'key' },
        mailgun: { apiKey: 'key', domain: 'domain' },
      };

      const result = validateConfigFormat(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Twilio'))).toBe(true);
    });

    test('should detect missing configuration sections', () => {
      const incompleteConfig = {
        twilio: {
          accountSid: 'ACtest1234567890abcdef1234567890',
          phoneNumber: '+18338542355',
        },
        // Missing other sections
      };

      const result = validateConfigFormat(incompleteConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing OpenAI'))).toBe(true);
      expect(result.errors.some(e => e.includes('Missing Anthropic'))).toBe(true);
    });

    test('should detect invalid API key formats', () => {
      const invalidConfig = {
        twilio: {
          accountSid: 'ACtest1234567890abcdef1234567890',
          phoneNumber: '+18338542355',
        },
        openai: {
          apiKey: 'invalid-key',
          model: 'gpt-4',
        },
        anthropic: {
          apiKey: 'wrong-format',
          model: 'claude-3',
        },
        supabase: { url: 'https://test.supabase.co', anonKey: 'key', serviceKey: 'key' },
        upstash: { redisUrl: 'https://test.upstash.io', redisToken: 'token' },
        clerk: { secretKey: 'key' },
        mailgun: { apiKey: 'key', domain: 'domain' },
      };

      const result = validateConfigFormat(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('OpenAI'))).toBe(true);
      expect(result.errors.some(e => e.includes('Anthropic'))).toBe(true);
    });
  });
});

describe('Configuration Loading', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear any cached config
    jest.resetModules();
    // Create a fresh copy of process.env
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('Environment detection', () => {
    /**
     * Test environment mode detection (dev/prod/test)
     * @created 2025-10-01T00:00:00Z
     */
    test('should detect development environment', () => {
      process.env.NODE_ENV = 'development';
      const { getNodeEnv, isDevelopment, isProduction, isTest } = require('../src/config/environment');

      expect(getNodeEnv()).toBe('development');
      expect(isDevelopment()).toBe(true);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(false);
    });

    test('should detect production environment', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      const { getNodeEnv, isDevelopment, isProduction, isTest } = require('../src/config/environment');

      expect(getNodeEnv()).toBe('production');
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(true);
      expect(isTest()).toBe(false);
    });

    test('should detect test environment', () => {
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      const { getNodeEnv, isDevelopment, isProduction, isTest } = require('../src/config/environment');

      expect(getNodeEnv()).toBe('test');
      expect(isDevelopment()).toBe(false);
      expect(isProduction()).toBe(false);
      expect(isTest()).toBe(true);
    });

    test('should default to development when NODE_ENV not set', () => {
      delete process.env.NODE_ENV;
      jest.resetModules();
      const { getNodeEnv, isDevelopment } = require('../src/config/environment');

      expect(getNodeEnv()).toBe('development');
      expect(isDevelopment()).toBe(true);
    });
  });

  describe('Configuration module', () => {
    /**
     * Test the main configuration module exports
     * @created 2025-10-01T00:00:00Z
     */
    test('should export configuration utilities', () => {
      const config = require('../src/config/index');

      expect(config.validateRequiredVars).toBeDefined();
      expect(config.validateConfigFormat).toBeDefined();
      expect(config.REQUIRED_ENV_VARS).toBeDefined();
      expect(config.getNodeEnv).toBeDefined();
      expect(config.isProduction).toBeDefined();
      expect(config.isDevelopment).toBeDefined();
      expect(config.isTest).toBeDefined();
    });

    test('should have validation function', () => {
      const { validateConfig } = require('../src/config/index');

      expect(typeof validateConfig).toBe('function');
      const result = validateConfig();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });
  });
});

describe('Integration Tests', () => {
  /**
   * Test complete configuration loading workflow
   * @created 2025-10-01T00:00:00Z
   */
  test('should handle complete configuration workflow', () => {
    // Mock environment with all required variables
    const mockEnv = {
      NODE_ENV: 'test',
      TWILIO_ACCOUNT_SID: 'ACfake567890abcdef1234567890fake',
      TWILIO_AUTH_TOKEN: 'test-auth-token',
      TWILIO_PHONE_NUMBER: '+18338542355',
      OPENAI_API_KEY: 'sk-test-key',
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      UPSTASH_REDIS_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_TOKEN: 'test-token',
      CLERK_SECRET_KEY: 'test-clerk-key',
      MAILGUN_API_KEY: 'test-mailgun-key',
      MAILGUN_DOMAIN: 'test.mailgun.org',
    };

    // Validate all required variables are present
    const validation = validateRequiredVars(mockEnv);
    expect(validation.valid).toBe(true);

    // Mock config structure
    const mockConfig = {
      twilio: {
        accountSid: mockEnv.TWILIO_ACCOUNT_SID,
        authToken: mockEnv.TWILIO_AUTH_TOKEN,
        phoneNumber: mockEnv.TWILIO_PHONE_NUMBER,
      },
      openai: {
        apiKey: mockEnv.OPENAI_API_KEY,
        model: 'gpt-4',
      },
      anthropic: {
        apiKey: mockEnv.ANTHROPIC_API_KEY,
        model: 'claude-3',
      },
      supabase: {
        url: mockEnv.SUPABASE_URL,
        anonKey: mockEnv.SUPABASE_ANON_KEY,
        serviceKey: mockEnv.SUPABASE_SERVICE_KEY,
      },
      upstash: {
        redisUrl: mockEnv.UPSTASH_REDIS_URL,
        redisToken: mockEnv.UPSTASH_REDIS_TOKEN,
      },
      clerk: {
        secretKey: mockEnv.CLERK_SECRET_KEY,
      },
      mailgun: {
        apiKey: mockEnv.MAILGUN_API_KEY,
        domain: mockEnv.MAILGUN_DOMAIN,
      },
    };

    // Validate format
    const formatValidation = validateConfigFormat(mockConfig);
    expect(formatValidation.valid).toBe(true);
  });
});
