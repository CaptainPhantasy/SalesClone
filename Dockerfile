/**
 * @fileoverview Docker container configuration for LegacyAI Voice Agent System
 * @author LegacyAI Subagent Fleet - Deployment Agent
 * @created 2025-10-01T19:00:00Z
 * @lastModified 2025-10-01T19:00:00Z
 *
 * Multi-stage Dockerfile for production deployment:
 * - Base: Node.js 18 Alpine (minimal footprint)
 * - Dependencies: Production-only packages
 * - Security: Non-root user execution
 * - Health checks: Automated container health monitoring
 * - Ports: 3000 (HTTP), 3001 (WebSocket)
 */

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies

# Add metadata labels
LABEL maintainer="LegacyAI Team <dev@legacyai.info>"
LABEL version="1.0.0"
LABEL description="LegacyAI Voice Agent System - AI-powered voice telephony platform"

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
# Using npm ci for faster, deterministic builds
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Stage 2: Production image
FROM node:18-alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create directories for logs and recordings with proper permissions
RUN mkdir -p /app/logs /app/recordings

# Create non-root user for security
# UID/GID 1001 ensures consistency across environments
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of application files to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment to production
ENV NODE_ENV=production

# Expose ports
# 3000: HTTP/API server
# 3001: WebSocket server for real-time updates
EXPOSE 3000 3001

# Health check configuration
# Checks HTTP server health endpoint every 30 seconds
# Waits 30 seconds before starting checks
# Times out after 10 seconds
# Fails after 3 consecutive failures
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
# Using exec form to properly handle signals (SIGTERM, SIGINT)
CMD ["node", "src/index.js"]
