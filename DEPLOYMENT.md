# LegacyAI Voice Agent System - Deployment Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-01
**Status:** Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Local Development Deployment](#local-development-deployment)
5. [Production Deployment](#production-deployment)
6. [Docker Deployment](#docker-deployment)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Health Checks & Monitoring](#health-checks--monitoring)
9. [Rollback Procedures](#rollback-procedures)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The LegacyAI Voice Agent System is a production-ready, containerized AI voice telephony platform. This guide covers deployment procedures for development, staging, and production environments.

### Architecture Components

- **Express HTTP Server** (Port 3000) - REST API and webhook endpoints
- **WebSocket Server** (Port 3001) - Real-time communication
- **Nginx Reverse Proxy** (Ports 80/443) - Load balancing and SSL termination
- **Docker Containers** - Isolated, reproducible deployments
- **GitHub Actions CI/CD** - Automated testing and deployment pipeline

---

## Prerequisites

### Required Software

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** >= 20.10.0
- **docker-compose** >= 2.0.0
- **Git** >= 2.30.0

### Required Services

- **Supabase** - PostgreSQL database
- **Upstash Redis** - Queue management
- **Twilio** - Voice telephony
- **OpenAI** - AI processing
- **Anthropic Claude** - AI processing
- **Clerk** - Authentication (optional)
- **Mailgun** - Email notifications (optional)

### Installation Verification

```bash
# Verify Node.js version
node --version  # Should be >= 18.0.0

# Verify npm version
npm --version   # Should be >= 9.0.0

# Verify Docker installation
docker --version
docker-compose --version

# Verify Docker daemon is running
docker info
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd SalesAI\ Clone
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

### Required Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
WEBSOCKET_PORT=3001
APP_URL=https://yourdomain.com
WS_URL=wss://yourdomain.com

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# AI Services
OPENAI_API_KEY=sk-your_openai_key
ANTHROPIC_API_KEY=sk-ant-your_anthropic_key

# Supabase Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Upstash Redis
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your_token

# Clerk Authentication (Optional)
CLERK_PUBLISHABLE_KEY=pk_your_clerk_key
CLERK_SECRET_KEY=sk_your_clerk_secret

# Mailgun (Optional)
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_domain
```

---

## Local Development Deployment

### Start Development Server

```bash
# Start with auto-reload
npm run dev

# Or start without auto-reload
npm start
```

### Verify Server

```bash
# Check health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"healthy","timestamp":"...","environment":"development",...}
```

### Run Tests

```bash
# Run all tests
npm test

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint
```

---

## Production Deployment

### Manual Production Deployment

#### 1. Build Application

```bash
# Install production dependencies only
npm ci --only=production

# Run tests
npm test

# Run linting
npm run lint
```

#### 2. Start Production Server

```bash
# Set environment to production
export NODE_ENV=production

# Start server
npm start
```

#### 3. Use Process Manager (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start application with PM2
pm2 start src/index.js --name legacyai-voice

# Configure auto-restart on system reboot
pm2 startup
pm2 save

# Monitor logs
pm2 logs legacyai-voice

# Monitor status
pm2 status
```

---

## Docker Deployment

### Quick Start

```bash
# Run automated deployment script
chmod +x deploy.sh
./deploy.sh
```

### Manual Docker Deployment

#### 1. Build Docker Image

```bash
# Build with timestamp tag
TAG=$(date +%Y%m%d-%H%M%S)
docker build -t legacyai-voice:$TAG -t legacyai-voice:latest .

# Verify image
docker images | grep legacyai-voice
```

#### 2. Run Container

```bash
# Run single container
docker run -d \
  --name legacyai-voice \
  -p 3000:3000 \
  -p 3001:3001 \
  --env-file .env \
  legacyai-voice:latest

# Verify container
docker ps
docker logs legacyai-voice
```

#### 3. Using Docker Compose (Recommended)

```bash
# Start all services (app + nginx)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

### Docker Compose Services

The `docker-compose.yml` includes:

- **voice-app** - Main Node.js application
  - Ports: 3000 (HTTP), 3001 (WebSocket)
  - Volumes: logs, recordings
  - Auto-restart policy

- **nginx** - Reverse proxy
  - Ports: 80 (HTTP), 443 (HTTPS)
  - SSL/TLS termination ready
  - Load balancing
  - Rate limiting

---

## CI/CD Pipeline

### GitHub Actions Workflow

The system includes automated CI/CD via GitHub Actions (`.github/workflows/ci.yml`).

#### Workflow Triggers

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

#### Pipeline Stages

1. **Lint** - ESLint code quality checks
2. **Test** - Run full test suite on Node.js 18.x and 20.x
3. **Integration Tests** - End-to-end system tests
4. **Docker Build** - Verify Docker image builds
5. **Security Audit** - npm audit for vulnerabilities
6. **Summary** - Overall pipeline status

#### Manual Trigger

```bash
# Push to main to trigger pipeline
git push origin main

# View workflow status
# Go to: https://github.com/your-repo/actions
```

---

## Health Checks & Monitoring

### Health Endpoint

```bash
# Check system health
curl http://localhost:3000/health

# Response includes:
# - Overall status
# - Agent initialization status
# - Service connectivity (database, queue)
# - Uptime
# - Environment
```

### Docker Health Checks

Docker automatically monitors container health:

```bash
# Check container health status
docker inspect --format='{{.State.Health.Status}}' legacyai-voice

# View health check logs
docker inspect legacyai-voice | jq '.[0].State.Health'
```

### Monitoring Recommendations

1. **Application Monitoring**
   - Use PM2 for process monitoring
   - Configure log rotation
   - Set up error alerting

2. **Infrastructure Monitoring**
   - Docker container stats: `docker stats`
   - Nginx access/error logs
   - System resource monitoring

3. **External Monitoring**
   - Uptime monitoring (UptimeRobot, Pingdom)
   - APM tools (New Relic, DataDog)
   - Log aggregation (Loggly, Papertrail)

---

## Rollback Procedures

### Automatic Rollback

The `deploy.sh` script includes automatic rollback on failure:

```bash
# Deploy with automatic rollback
./deploy.sh

# If health checks fail, previous version is restored automatically
```

### Manual Rollback

#### Docker Rollback

```bash
# List available images
docker images legacyai-voice

# Stop current containers
docker-compose down

# Tag previous image as latest
docker tag legacyai-voice:YYYYMMDD-HHMMSS legacyai-voice:latest

# Start containers with previous version
docker-compose up -d
```

#### PM2 Rollback

```bash
# Stop current process
pm2 stop legacyai-voice

# Checkout previous git commit
git checkout <previous-commit-hash>

# Install dependencies
npm ci --only=production

# Restart
pm2 restart legacyai-voice
```

---

## Troubleshooting

### Common Issues

#### 1. Docker Build Fails

```bash
# Problem: Docker daemon not running
# Solution:
sudo systemctl start docker  # Linux
# or start Docker Desktop (macOS/Windows)

# Problem: Permission denied
# Solution:
sudo usermod -aG docker $USER
# Logout and login again
```

#### 2. Container Won't Start

```bash
# Check logs
docker logs legacyai-voice

# Common causes:
# - Missing .env file
# - Invalid environment variables
# - Port already in use

# Check port usage
sudo lsof -i :3000
sudo lsof -i :3001
```

#### 3. Health Check Failing

```bash
# Check application logs
docker-compose logs voice-app

# Check connectivity to external services
# - Supabase database
# - Upstash Redis
# - Twilio API

# Verify environment variables
docker exec legacyai-voice env | grep -E "SUPABASE|UPSTASH|TWILIO"
```

#### 4. High Memory Usage

```bash
# Check container resource usage
docker stats legacyai-voice

# Adjust memory limits in docker-compose.yml
# Under deploy.resources.limits.memory
```

#### 5. WebSocket Connection Issues

```bash
# Verify WebSocket port is accessible
nc -zv localhost 3001

# Check nginx WebSocket proxy configuration
# Ensure proper upgrade headers in nginx.conf

# Test WebSocket connection
wscat -c ws://localhost:3001
```

---

## Production Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] Linting checks pass (`npm run lint`)
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates installed (for HTTPS)
- [ ] Backup current database
- [ ] Tag release in git

### Deployment

- [ ] Build Docker image
- [ ] Test Docker image locally
- [ ] Push to container registry (optional)
- [ ] Stop old containers
- [ ] Start new containers
- [ ] Verify health checks pass
- [ ] Test critical endpoints

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Test webhook endpoints
- [ ] Verify Twilio integration
- [ ] Check analytics generation
- [ ] Monitor system resources
- [ ] Update documentation
- [ ] Notify team of deployment

### Rollback Plan

- [ ] Previous Docker image tagged
- [ ] Database rollback script ready
- [ ] Monitoring alerts configured
- [ ] On-call team notified

---

## Additional Resources

### Documentation

- [README.md](README.md) - Project overview
- [# LegacyAI Voice Agent System.md](# LegacyAI Voice Agent System.md) - Full system specification
- [.agent-docs/AGENT_COORDINATION.md](.agent-docs/AGENT_COORDINATION.md) - Development standards

### Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Refer to inline code comments
- **Logs**: Check application logs for detailed error information

---

## Security Considerations

### Production Security

1. **Never commit .env files** to version control
2. **Use environment variables** for all secrets
3. **Enable HTTPS/TLS** in production (configure nginx.conf)
4. **Implement rate limiting** (configured in nginx.conf)
5. **Regular security audits**: `npm audit`
6. **Keep dependencies updated**: `npm update`
7. **Use non-root user** in Docker (already configured)

### SSL/TLS Configuration

```bash
# Install Let's Encrypt certificates
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx.conf with certificate paths
# Uncomment SSL configuration sections in nginx.conf
```

---

**Deployment Guide Version:** 1.0.0
**Last Updated:** 2025-10-01
**Maintained By:** LegacyAI Development Team
