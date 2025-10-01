# Shared Interfaces & Type Definitions
**Created**: 2025-10-01
**Purpose**: Ensure type consistency across all agent implementations

---

## Base Classes

### BaseAgent
All agents MUST extend this base class:

```javascript
/**
 * @fileoverview Base agent class providing common functionality
 * @created 2025-10-01T10:00:00Z
 */

class BaseAgent {
  /**
   * Initialize base agent
   * @param {AgentConfig} config - Agent configuration object
   * @created 2025-10-01T10:00:00Z
   */
  constructor(config) {
    this.config = config;
    this.logger = this.initLogger();
    this.startTime = new Date().toISOString();

    this.logger.info(`${this.constructor.name} initialized`);
  }

  /**
   * Initialize logger with timestamps
   * @returns {Logger} Logger instance
   * @created 2025-10-01T10:00:00Z
   */
  initLogger() {
    const name = this.constructor.name;
    return {
      info: (msg) => console.log(`[${new Date().toISOString()}] [INFO] [${name}] ${msg}`),
      warn: (msg) => console.warn(`[${new Date().toISOString()}] [WARN] [${name}] ${msg}`),
      error: (msg, err) => console.error(`[${new Date().toISOString()}] [ERROR] [${name}] ${msg}`, err),
      debug: (msg) => console.debug(`[${new Date().toISOString()}] [DEBUG] [${name}] ${msg}`)
    };
  }

  /**
   * Generate unique request ID
   * @returns {string} UUID v4
   * @created 2025-10-01T10:00:00Z
   */
  generateRequestId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

module.exports = { BaseAgent };
```

---

## Type Definitions

### AgentConfig
```javascript
/**
 * @typedef {Object} AgentConfig
 * @property {TwilioConfig} twilio - Twilio configuration
 * @property {OpenAIConfig} openai - OpenAI configuration
 * @property {AnthropicConfig} anthropic - Claude configuration
 * @property {SupabaseConfig} supabase - Supabase configuration
 * @property {UpstashConfig} upstash - Upstash Redis configuration
 * @property {ClerkConfig} clerk - Clerk auth configuration
 * @property {MailgunConfig} mailgun - Mailgun email configuration
 */

/**
 * @typedef {Object} TwilioConfig
 * @property {string} accountSid - Twilio account SID
 * @property {string} authToken - Twilio auth token
 * @property {string} phoneNumber - Twilio phone number
 * @property {string} webhookUrl - Webhook base URL
 */

/**
 * @typedef {Object} OpenAIConfig
 * @property {string} apiKey - OpenAI API key
 * @property {string} model - Model name (e.g., gpt-4-1106-preview)
 * @property {string} realtimeModel - Realtime model (e.g., whisper-1)
 */

/**
 * @typedef {Object} AnthropicConfig
 * @property {string} apiKey - Anthropic API key
 * @property {string} model - Model name (e.g., claude-3-opus-20240229)
 */

/**
 * @typedef {Object} SupabaseConfig
 * @property {string} url - Supabase project URL
 * @property {string} anonKey - Anon/public key
 * @property {string} serviceKey - Service role key
 */

/**
 * @typedef {Object} UpstashConfig
 * @property {string} redisUrl - Upstash Redis URL
 * @property {string} redisToken - Upstash Redis token
 * @property {string} queuePrefix - Queue name prefix
 */
```

### Conversation Types
```javascript
/**
 * @typedef {Object} ConversationContext
 * @property {string} conversationId - Unique conversation ID
 * @property {string} callSid - Twilio call SID
 * @property {string} phoneNumber - Customer phone number
 * @property {Array<Message>} messages - Conversation history
 * @property {Object} metadata - Additional context
 * @property {string} startedAt - ISO-8601 timestamp
 * @property {string} lastActivity - ISO-8601 timestamp
 */

/**
 * @typedef {Object} Message
 * @property {string} id - Message ID
 * @property {string} role - 'user' | 'assistant' | 'system'
 * @property {string} content - Message content
 * @property {string} timestamp - ISO-8601 timestamp
 * @property {number} confidence - Speech recognition confidence (0-1)
 */

/**
 * @typedef {Object} CallData
 * @property {string} CallSid - Twilio call SID
 * @property {string} From - Caller phone number
 * @property {string} To - Called phone number
 * @property {string} CallStatus - Call status
 * @property {string} Direction - 'inbound' | 'outbound'
 * @property {Object} metadata - Additional call data
 */
```

### Response Types
```javascript
/**
 * @typedef {Object} APIResponse
 * @property {boolean} success - Operation success status
 * @property {*} data - Response data
 * @property {string|null} error - Error message if failed
 * @property {string} timestamp - ISO-8601 timestamp
 * @property {string} requestId - Unique request ID
 */

/**
 * @typedef {Object} AIResponse
 * @property {string} text - Generated response text
 * @property {number} confidence - Confidence score (0-1)
 * @property {string} model - Model used
 * @property {number} tokensUsed - Tokens consumed
 * @property {number} latencyMs - Response time in milliseconds
 * @property {string} timestamp - ISO-8601 timestamp
 */
```

### Database Types
```javascript
/**
 * @typedef {Object} ConversationRecord
 * @property {string} id - UUID
 * @property {string} call_sid - Twilio call SID
 * @property {string} phone_number - Customer phone
 * @property {string} customer_id - Customer UUID (nullable)
 * @property {string} agent_type - Agent type (default: 'voice')
 * @property {string} status - 'active' | 'ended' | 'escalated'
 * @property {string} started_at - ISO-8601 timestamp
 * @property {string} ended_at - ISO-8601 timestamp (nullable)
 * @property {number} duration_seconds - Call duration
 * @property {Object} transcript - JSONB transcript
 * @property {number} sentiment_score - Sentiment (-1 to 1)
 * @property {boolean} escalated - Escalation flag
 * @property {Object} metadata - JSONB metadata
 */

/**
 * @typedef {Object} CustomerRecord
 * @property {string} id - UUID
 * @property {string} phone_number - Phone number (unique)
 * @property {string} email - Email address
 * @property {string} name - Customer name
 * @property {string} company - Company name
 * @property {Array<string>} tags - Customer tags
 * @property {number} lead_score - Lead score (0-100)
 * @property {number} lifetime_value - LTV in dollars
 * @property {Object} preferences - JSONB preferences
 * @property {string} notes - Text notes
 */
```

### Queue Types
```javascript
/**
 * @typedef {Object} QueueJob
 * @property {string} id - Job ID
 * @property {string} type - Job type
 * @property {Object} data - Job payload
 * @property {number} priority - Priority (0-10)
 * @property {number} attempts - Retry attempts
 * @property {string} createdAt - ISO-8601 timestamp
 */

/**
 * @typedef {Object} JobResult
 * @property {boolean} success - Job success status
 * @property {*} result - Job result data
 * @property {string|null} error - Error message
 * @property {number} processingTimeMs - Processing time
 * @property {string} completedAt - ISO-8601 timestamp
 */
```

---

## Standard Methods

### All Agents Must Implement

```javascript
/**
 * Initialize agent and dependencies
 * @returns {Promise<void>}
 */
async initialize() {
  this.logger.info('Initializing...');
  // Implementation
  this.logger.info('Initialization complete');
}

/**
 * Health check
 * @returns {Promise<{healthy: boolean, details: Object}>}
 */
async healthCheck() {
  this.logger.info('Running health check');
  // Implementation
  return {
    healthy: true,
    details: {},
    timestamp: new Date().toISOString()
  };
}

/**
 * Graceful shutdown
 * @returns {Promise<void>}
 */
async shutdown() {
  this.logger.info('Shutting down...');
  // Cleanup implementation
  this.logger.info('Shutdown complete');
}
```

---

## Error Handling Standards

### Standard Error Response
```javascript
/**
 * @typedef {Object} ErrorResponse
 * @property {string} code - Error code (e.g., 'VALIDATION_ERROR')
 * @property {string} message - Human-readable message
 * @property {Object} details - Additional error details
 * @property {string} timestamp - ISO-8601 timestamp
 * @property {string} requestId - Request ID for tracking
 */

/**
 * Create standard error response
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {ErrorResponse}
 */
function createErrorResponse(code, message, details = {}) {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId: this.generateRequestId()
  };
}
```

### Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTH_ERROR` - Authentication/authorization failed
- `API_ERROR` - External API call failed
- `DATABASE_ERROR` - Database operation failed
- `QUEUE_ERROR` - Queue operation failed
- `INTERNAL_ERROR` - Unexpected internal error

---

## Logging Standards

### Log Entry Format
```javascript
{
  timestamp: "2025-10-01T10:30:45.123Z",
  level: "INFO|WARN|ERROR|DEBUG",
  module: "ModuleName",
  message: "Log message",
  context: { /* additional data */ }
}
```

### Example Usage
```javascript
this.logger.info('Processing call', {
  callSid: 'CA12345',
  phoneNumber: '+1234567890',
  duration: 45
});
```

---

## Configuration Validation

### Required Environment Variables
```javascript
const REQUIRED_ENV_VARS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'UPSTASH_REDIS_URL',
  'UPSTASH_REDIS_TOKEN',
  'CLERK_SECRET_KEY',
  'MAILGUN_API_KEY'
];

/**
 * Validate all required environment variables
 * @throws {Error} If any required var is missing
 */
function validateEnvironment() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

---

**IMPORTANT**: All subagents MUST use these shared interfaces to ensure compatibility.
