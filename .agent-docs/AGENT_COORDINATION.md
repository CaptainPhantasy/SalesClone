# Agent Fleet Coordination Document
## Project: LegacyAI Voice Agent System
**Build Started**: 2025-10-01
**Coordinator**: Claude Code Orchestrator

---

## MANDATORY CODE STANDARDS - ALL SUBAGENTS MUST FOLLOW

### 1. Logging Requirements (CRITICAL)
Every file MUST include:
```javascript
/**
 * @fileoverview [Description of what this file does]
 * @author LegacyAI Subagent Fleet
 * @created [ISO-8601 timestamp]
 * @lastModified [ISO-8601 timestamp]
 */

// Example timestamp format: 2025-10-01T10:30:00Z
```

Every function MUST have:
```javascript
/**
 * [Function description]
 * @param {Type} paramName - Description
 * @returns {Type} Description
 * @created [ISO-8601 timestamp]
 * @lastModified [ISO-8601 timestamp]
 * @example
 * // Example usage
 */
```

Every significant code block MUST have inline comments explaining WHY, not just what.

### 2. Runtime Logging Requirements
All code MUST include console.log statements with timestamps:
```javascript
console.log(`[${new Date().toISOString()}] [ModuleName] Action description`);
```

Log levels:
- `[INFO]` - Normal operations
- `[WARN]` - Recoverable issues
- `[ERROR]` - Errors with context
- `[DEBUG]` - Detailed debugging info

### 3. Error Handling with Logging
```javascript
try {
  console.log(`[${new Date().toISOString()}] [INFO] Starting operation: ${operationName}`);
  // operation
  console.log(`[${new Date().toISOString()}] [INFO] Completed operation: ${operationName}`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] [ERROR] Operation failed: ${operationName}`, error);
  throw error; // or handle gracefully
}
```

---

## Subagent Fleet Assignments & Phases

### PHASE 1: Foundation (Parallel Execution)
**Git Commit After**: "Phase 1: Infrastructure and environment setup"

#### Fleet 1A: Infrastructure Setup
**Agent**: infrastructure-agent
**Deliverables**:
- package.json with ALL dependencies
- .gitignore
- .env.example
- README.md
- Directory structure creation
- ESLint/Prettier config

**Files to Create**:
- `/package.json`
- `/.gitignore`
- `/.env.example`
- `/README.md`
- `/.eslintrc.js`
- `/src/` (directory)
- `/src/agents/` (directory)
- `/src/services/` (directory)
- `/src/utils/` (directory)
- `/src/config/` (directory)
- `/__tests__/` (directory)

**Acceptance Criteria**:
- package.json valid JSON
- All directories created
- .gitignore includes node_modules, .env
- README has setup instructions

---

### PHASE 2: Configuration & Data Layer (Parallel Execution)
**Git Commit After**: "Phase 2: Database schema and configuration"
**Depends On**: Phase 1 completion

#### Fleet 2A: Configuration Management
**Agent**: config-agent
**Deliverables**:
- Environment configuration loader
- API credentials manager
- Config validation

**Files to Create**:
- `/src/config/environment.js`
- `/src/config/index.js`
- `/src/utils/configValidator.js`

#### Fleet 2B: Database Layer
**Agent**: database-agent
**Deliverables**:
- Supabase schema SQL
- Migration scripts
- Database client wrapper
- Data access layer

**Files to Create**:
- `/database/schema.sql`
- `/database/migrations/001_initial_schema.sql`
- `/src/services/SupabaseClient.js`
- `/src/services/DatabaseService.js`

**Acceptance Criteria**:
- Config loads all environment variables
- Schema SQL is valid PostgreSQL
- Database client initializes successfully

---

### PHASE 3: Core Agents (Parallel Execution)
**Git Commit After**: "Phase 3: Core AI agent implementations"
**Depends On**: Phase 2 completion

#### Fleet 3A: Voice Gateway Agent
**Agent**: voice-gateway-agent
**Deliverables**:
- VoiceGatewayAgent class
- Twilio integration
- Call lifecycle management

**Files to Create**:
- `/src/agents/VoiceGatewayAgent.js`
- `/src/services/TwilioService.js`
- `/__tests__/VoiceGatewayAgent.test.js`

#### Fleet 3B: Conversation Agent
**Agent**: conversation-agent
**Deliverables**:
- ConversationAgent class
- AI integration (OpenAI + Claude)
- Context management

**Files to Create**:
- `/src/agents/ConversationAgent.js`
- `/src/services/OpenAIService.js`
- `/src/services/AnthropicService.js`
- `/__tests__/ConversationAgent.test.js`

#### Fleet 3C: Analytics Agent
**Agent**: analytics-agent
**Deliverables**:
- AnalyticsAgent class
- Metrics collection
- Reporting functionality

**Files to Create**:
- `/src/agents/AnalyticsAgent.js`
- `/src/services/MetricsService.js`
- `/__tests__/AnalyticsAgent.test.js`

#### Fleet 3D: Integration Agent
**Agent**: integration-agent
**Deliverables**:
- IntegrationAgent class
- External system connectors
- Webhook handlers

**Files to Create**:
- `/src/agents/IntegrationAgent.js`
- `/src/services/WebhookService.js`
- `/__tests__/IntegrationAgent.test.js`

**Acceptance Criteria**:
- All agents instantiate without errors
- All tests pass
- All functions documented

---

### PHASE 4: Queue System & Workers (Parallel Execution)
**Git Commit After**: "Phase 4: Queue system and background workers"
**Depends On**: Phase 3 completion

#### Fleet 4A: Queue Manager
**Agent**: queue-agent
**Deliverables**:
- QueueManager class
- Redis integration
- Job definitions

**Files to Create**:
- `/src/services/QueueManager.js`
- `/src/workers/CallWorker.js`
- `/src/workers/AnalyticsWorker.js`
- `/__tests__/QueueManager.test.js`

**Acceptance Criteria**:
- Queue connects to Redis
- Workers process jobs
- Retry logic works

---

### PHASE 5: API Server & WebSockets (Parallel Execution)
**Git Commit After**: "Phase 5: API server and WebSocket implementation"
**Depends On**: Phase 4 completion

#### Fleet 5A: Main Application
**Agent**: server-agent
**Deliverables**:
- Express server
- Route handlers
- Middleware
- WebSocket server

**Files to Create**:
- `/src/index.js`
- `/src/routes/webhooks.js`
- `/src/routes/api.js`
- `/src/middleware/errorHandler.js`
- `/src/middleware/requestLogger.js`
- `/src/websocket/server.js`

**Acceptance Criteria**:
- Server starts on port 3000
- WebSocket on port 3001
- Health endpoint returns 200
- Twilio webhook responds with TwiML

---

### PHASE 6: Testing & Deployment (Parallel Execution)
**Git Commit After**: "Phase 6: Testing suite and deployment configuration"
**Depends On**: Phase 5 completion

#### Fleet 6A: Testing Infrastructure
**Agent**: testing-agent
**Deliverables**:
- Jest configuration
- Integration tests
- E2E tests
- Test utilities

**Files to Create**:
- `/jest.config.js`
- `/__tests__/integration/system.test.js`
- `/__tests__/integration/voice.test.js`
- `/__tests__/utils/testHelpers.js`

#### Fleet 6B: Deployment Configuration
**Agent**: deployment-agent
**Deliverables**:
- Dockerfile
- docker-compose.yml
- Deployment scripts
- CI/CD configuration

**Files to Create**:
- `/Dockerfile`
- `/docker-compose.yml`
- `/deploy.sh`
- `/.dockerignore`
- `/nginx.conf`

**Acceptance Criteria**:
- All tests pass
- Test coverage >80%
- Docker builds successfully
- Deployment script executes

---

## Git Commit Strategy

### Commit Message Format
```
Phase [N]: [Description]

Created by: [Agent Fleet Name]
Timestamp: [ISO-8601]
Files Added: [count]
Files Modified: [count]

Details:
- [Detail 1]
- [Detail 2]
- [Detail 3]

✅ All tests passing
✅ Lint checks passed
✅ No security vulnerabilities
```

### Commit Points
1. After Phase 1: Foundation
2. After Phase 2: Configuration & Database
3. After Phase 3: Core Agents
4. After Phase 4: Queue System
5. After Phase 5: API Server
6. After Phase 6: Testing & Deployment
7. Final: Production Ready

---

## Shared Interfaces & Standards

### Base Agent Interface
All agents MUST implement:
```javascript
class BaseAgent {
  constructor(config) {
    this.config = config;
    this.logger = this.initLogger();
  }

  initLogger() {
    return {
      info: (msg) => console.log(`[${new Date().toISOString()}] [INFO] [${this.constructor.name}] ${msg}`),
      warn: (msg) => console.warn(`[${new Date().toISOString()}] [WARN] [${this.constructor.name}] ${msg}`),
      error: (msg, err) => console.error(`[${new Date().toISOString()}] [ERROR] [${this.constructor.name}] ${msg}`, err)
    };
  }
}
```

### Standard Response Format
```javascript
{
  success: boolean,
  data: any,
  error: string | null,
  timestamp: ISO-8601 string,
  requestId: UUID
}
```

---

## Quality Checklist (Each Agent Must Verify)

### Code Quality
- [ ] Every file has fileoverview JSDoc
- [ ] Every function has JSDoc with params/returns
- [ ] All timestamps in ISO-8601 format
- [ ] Console.log statements include timestamps and module name
- [ ] Try/catch blocks have error logging
- [ ] No hardcoded values (use config)
- [ ] No exposed API keys

### Testing
- [ ] Unit tests for all functions
- [ ] Integration tests for workflows
- [ ] Test coverage >80%
- [ ] All tests pass

### Documentation
- [ ] README updated
- [ ] API endpoints documented
- [ ] Configuration options documented
- [ ] Example usage provided

---

## Status Tracking

Each agent creates: `.agent-docs/status/{agent-name}.json`

```json
{
  "agentName": "infrastructure-agent",
  "phase": 1,
  "status": "completed",
  "startTime": "2025-10-01T10:00:00Z",
  "endTime": "2025-10-01T10:15:00Z",
  "filesCreated": ["package.json", ".gitignore"],
  "filesModified": [],
  "testsAdded": 0,
  "testsPassing": 0,
  "lintErrors": 0,
  "blockers": [],
  "notes": "All infrastructure files created successfully"
}
```

---

## Success Criteria

### Phase Completion
- All assigned files created
- All tests passing
- No lint errors
- Status file updated
- Git commit created

### Final Build Success
- npm install succeeds
- npm test passes (>80% coverage)
- npm run lint passes (0 errors)
- Docker build succeeds
- Server starts and responds to health check
- All 6 phases committed to git
- Full system integration test passes

---

**CRITICAL**: All subagents must follow these standards religiously. No exceptions.
