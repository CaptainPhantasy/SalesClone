# LegacyAI Voice Agent System

> Multi-agent AI voice communication platform powered by Twilio, OpenAI, and Claude

## Overview

The LegacyAI Voice Agent System is a sophisticated, production-ready voice AI platform designed to handle customer interactions through intelligent phone conversations. Built with a multi-agent architecture, it combines the power of OpenAI's GPT-4, Anthropic's Claude, and Twilio's voice infrastructure to deliver seamless, natural voice interactions.

## Features

### Core Capabilities
- **Intelligent Voice Gateway**: Handles inbound/outbound calls via Twilio
- **AI-Powered Conversations**: Dual AI engine (OpenAI + Claude) for complex reasoning
- **Real-time Processing**: WebSocket-based live transcription and updates
- **Queue Management**: Asynchronous task processing with BullMQ and Redis
- **Analytics & Insights**: Comprehensive call analytics and sentiment analysis
- **Customer Data Management**: Full CRM integration with Supabase
- **Secure Authentication**: Clerk-based user authentication
- **Email Notifications**: Mailgun integration for alerts and reports

### Multi-Agent Architecture
- **VoiceGatewayAgent**: Telephony management and call routing
- **ConversationAgent**: Context management and AI response generation
- **AnalyticsAgent**: Metrics tracking and performance monitoring
- **IntegrationAgent**: External system connections and data sync

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Voice Interface Layer                     │
├──────────────────────┬──────────────────────────────────────┤
│  Twilio Voice Gateway │      WebSocket Server (Port 3001)   │
└──────────┬───────────┴──────────────┬──────────────────────┘
           │                          │
┌──────────▼──────────────────────────▼──────────────────────┐
│                   AI Processing Core                        │
├────────────────┬─────────────────┬──────────────────────────┤
│ OpenAI Realtime│   Claude API    │ Orchestration Engine    │
└────────┬───────┴─────────┬───────┴──────────┬──────────────┘
         │                 │                  │
┌────────▼─────────────────▼──────────────────▼──────────────┐
│                       Data Layer                            │
├───────────────────────┬─────────────────────────────────────┤
│  Supabase (PostgreSQL)│   Upstash Redis (Queue)            │
└───────────────────────┴─────────────────────────────────────┘
```

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Twilio Account** with phone number
- **OpenAI API Key**
- **Anthropic API Key**
- **Supabase Project** (PostgreSQL database)
- **Upstash Redis** instance
- **Clerk Account** (for authentication)
- **Mailgun Account** (for emails)

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd legacyai-voice-agent
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your API credentials:

```env
# Required: Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Required: AI Services
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# Required: Database
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Required: Queue System
UPSTASH_REDIS_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_TOKEN=AXD8AAIjcDE4N2VhZTZ...

# Required: Authentication
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Required: Notifications
MAILGUN_API_KEY=xxxxxxxx-xxxxxxxx-xxxxxxxx
MAILGUN_DOMAIN=sandboxxxxxxxxxx.mailgun.org
```

### 4. Set Up Database

Execute the database schema in your Supabase dashboard:

```bash
# Schema located in: database/schema.sql
# Run migrations:
npm run migrate
```

## Running Locally

### Development Mode

```bash
npm run dev
```

The server will start with hot-reloading enabled:
- **API Server**: http://localhost:3000
- **WebSocket Server**: ws://localhost:3001
- **Health Check**: http://localhost:3000/health

### Production Mode

```bash
npm start
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

## Environment Configuration Guide

### Development Environment
- Set `NODE_ENV=development`
- Use Twilio test credentials
- Enable verbose logging: `LOG_LEVEL=debug`

### Production Environment
- Set `NODE_ENV=production`
- Use production Twilio credentials
- Configure proper `APP_URL` and `WS_URL` with HTTPS/WSS
- Set `LOG_LEVEL=info` or `warn`

### Webhook Configuration

For local development, use ngrok to expose your local server:

```bash
ngrok http 3000
```

Then configure Twilio webhooks:
1. Go to Twilio Console > Phone Numbers
2. Select your phone number
3. Set "A Call Comes In" webhook to: `https://your-ngrok-url.ngrok.io/webhooks/voice`
4. Set HTTP method to: `POST`

## API Documentation

### REST Endpoints

#### Health Check
```
GET /health
Response: { status: 'healthy', agents: [...], timestamp: '...' }
```

#### Twilio Webhooks
```
POST /webhooks/voice
Body: Twilio call parameters
Response: TwiML XML
```

```
POST /webhooks/process-speech
Body: { CallSid, SpeechResult, Confidence }
Response: TwiML XML
```

### WebSocket Events

Connect to: `ws://localhost:3001`

**Client → Server Messages:**
```json
{
  "type": "call_status",
  "callSid": "CA123456789"
}
```

**Server → Client Messages:**
```json
{
  "type": "status_update",
  "data": { "status": "active", ... }
}
```

## Testing

### Manual Testing Flow

1. **Start the server**: `npm run dev`
2. **Expose with ngrok**: `ngrok http 3000`
3. **Configure Twilio webhook** to your ngrok URL
4. **Call your Twilio number**
5. **Monitor logs** for real-time processing

### Automated Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## Deployment

### Docker Deployment

```bash
# Build Docker image
docker build -t legacyai-voice:latest .

# Run with docker-compose
docker-compose up -d
```

### Manual Deployment

1. **Set production environment variables**
2. **Run database migrations**: `npm run migrate`
3. **Build application** (if using TypeScript): `npm run build`
4. **Start server**: `npm start`
5. **Configure reverse proxy** (nginx) for HTTPS
6. **Set up SSL certificates** (Let's Encrypt)
7. **Configure Twilio webhooks** to production URL

### Environment Variables for Production

```env
NODE_ENV=production
APP_URL=https://voice.legacyai.info
WS_URL=wss://voice.legacyai.info
```

## System Monitoring

### Key Metrics to Monitor
- **Uptime**: Target >99.5%
- **Response Latency**: Target <500ms
- **Call Success Rate**: Target >98%
- **Queue Depth**: Alert if >5
- **Error Rate**: Alert if >2%

### Logging

All logs follow the format:
```
[2025-10-01T10:30:45.123Z] [INFO] [ModuleName] Message
```

Log levels:
- `INFO`: Normal operations
- `WARN`: Recoverable issues
- `ERROR`: Errors requiring attention
- `DEBUG`: Detailed debugging information

## Troubleshooting

### Common Issues

**Issue**: Calls not connecting
- Check Twilio webhook URL is publicly accessible
- Verify Twilio credentials in `.env`
- Check server logs for errors

**Issue**: AI responses slow/timing out
- Verify OpenAI/Anthropic API keys
- Check API rate limits
- Monitor network latency

**Issue**: Database connection errors
- Verify Supabase credentials
- Check database connection string
- Ensure database schema is deployed

**Issue**: Queue jobs not processing
- Verify Upstash Redis connection
- Check Redis credentials and URL
- Monitor Redis connection health

## Architecture Details

### File Structure
```
legacyai-voice-agent/
├── src/
│   ├── agents/          # AI agent implementations
│   ├── services/        # External service integrations
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration management
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   ├── websocket/       # WebSocket server
│   ├── workers/         # Background job workers
│   └── index.js         # Application entry point
├── __tests__/           # Test files
├── database/            # Database migrations
├── .agent-docs/         # Agent coordination docs
└── package.json
```

### Agent Responsibilities

**VoiceGatewayAgent**
- Handles Twilio webhooks
- Manages call lifecycle
- Generates TwiML responses

**ConversationAgent**
- Processes speech-to-text
- Manages conversation context
- Generates AI responses

**AnalyticsAgent**
- Tracks call metrics
- Calculates sentiment scores
- Generates reports

**IntegrationAgent**
- Syncs with external CRMs
- Handles webhook callbacks
- Manages data pipelines

## Contributing

This is an internal project for the LegacyAI team. For questions or issues:
1. Check existing documentation
2. Review logs and error messages
3. Contact the development team

## License

MIT License - Internal use only

## Support

For technical support:
- **Documentation**: See `/docs` folder
- **Issues**: Contact DevOps team
- **Emergency**: Check runbook in `.agent-docs/`

---

**Built with** ❤️ **by the LegacyAI Subagent Fleet**

*Last Updated: 2025-10-01*
