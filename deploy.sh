#!/bin/bash

###############################################################################
# @fileoverview Automated deployment script for LegacyAI Voice Agent System
# @author LegacyAI Subagent Fleet - Deployment Agent
# @created 2025-10-01T19:00:00Z
# @lastModified 2025-10-01T19:00:00Z
#
# This script automates the deployment process:
# - Builds Docker image with timestamp tag
# - Stops existing containers gracefully
# - Starts new containers with docker-compose
# - Runs health checks to verify deployment
# - Provides rollback capability on failure
# - Comprehensive logging of all steps
#
# Usage:
#   ./deploy.sh [--skip-build] [--skip-tests]
#
# Options:
#   --skip-build  Skip Docker image build (use existing image)
#   --skip-tests  Skip pre-deployment tests
###############################################################################

set -e  # Exit immediately on any error
set -u  # Exit on undefined variables
set -o pipefail  # Exit on pipe failures

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="legacyai-voice"
CONTAINER_NAME="legacyai-voice-app"
HTTP_PORT=3000
WS_PORT=3001
HEALTH_ENDPOINT="http://localhost:${HTTP_PORT}/health"
MAX_HEALTH_RETRIES=12  # 12 retries * 5 seconds = 60 seconds total
BACKUP_IMAGE=""

# Parse command line arguments
SKIP_BUILD=false
SKIP_TESTS=false

for arg in "$@"; do
  case $arg in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --skip-tests)
      SKIP_TESTS=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

###############################################################################
# Logging functions
###############################################################################

log_info() {
  echo -e "${BLUE}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} [INFO] $1"
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} [SUCCESS] $1"
}

log_warn() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} [WARN] $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} [ERROR] $1"
}

###############################################################################
# Pre-deployment checks
###############################################################################

check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check if Docker is installed and running
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
  fi

  if ! docker info &> /dev/null; then
    log_error "Docker daemon is not running. Please start Docker."
    exit 1
  fi

  log_success "Docker is available and running"

  # Check if docker-compose is installed
  if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose is not installed. Please install docker-compose first."
    exit 1
  fi

  log_success "docker-compose is available"

  # Check if .env file exists
  if [ ! -f .env ]; then
    log_error ".env file not found. Please create .env file from .env.example"
    exit 1
  fi

  log_success ".env file exists"

  # Check if Dockerfile exists
  if [ ! -f Dockerfile ]; then
    log_error "Dockerfile not found. Cannot build image."
    exit 1
  fi

  log_success "All prerequisites satisfied"
}

###############################################################################
# Run tests
###############################################################################

run_tests() {
  if [ "$SKIP_TESTS" = true ]; then
    log_warn "Skipping tests (--skip-tests flag)"
    return 0
  fi

  log_info "Running test suite..."

  if ! npm test; then
    log_error "Tests failed. Aborting deployment."
    log_info "Fix the failing tests or use --skip-tests to bypass (not recommended)"
    exit 1
  fi

  log_success "All tests passed"
}

###############################################################################
# Build Docker image
###############################################################################

build_image() {
  if [ "$SKIP_BUILD" = true ]; then
    log_warn "Skipping Docker build (--skip-build flag)"
    return 0
  fi

  log_info "Building Docker image..."

  # Generate timestamp tag
  TAG=$(date +%Y%m%d-%H%M%S)

  log_info "Image tag: ${IMAGE_NAME}:${TAG}"

  # Build Docker image with both timestamp tag and latest tag
  if docker build -t "${IMAGE_NAME}:${TAG}" -t "${IMAGE_NAME}:latest" .; then
    log_success "Docker image built successfully: ${IMAGE_NAME}:${TAG}"
    log_success "Tagged as: ${IMAGE_NAME}:latest"
  else
    log_error "Docker build failed"
    exit 1
  fi

  # Store the current image as backup
  BACKUP_IMAGE="${IMAGE_NAME}:backup-$(date +%Y%m%d-%H%M%S)"
  if docker images "${IMAGE_NAME}:latest" -q 2>/dev/null; then
    docker tag "${IMAGE_NAME}:latest" "${BACKUP_IMAGE}" 2>/dev/null || true
    log_info "Created backup image: ${BACKUP_IMAGE}"
  fi
}

###############################################################################
# Stop existing containers
###############################################################################

stop_containers() {
  log_info "Stopping existing containers..."

  # Check if containers are running
  if docker-compose ps -q 2>/dev/null | grep -q .; then
    log_info "Found running containers, stopping gracefully..."

    # Graceful shutdown with 30 second timeout
    if docker-compose down --timeout 30; then
      log_success "Containers stopped successfully"
    else
      log_warn "Some containers may not have stopped gracefully"
    fi
  else
    log_info "No running containers found"
  fi
}

###############################################################################
# Start containers
###############################################################################

start_containers() {
  log_info "Starting containers with docker-compose..."

  # Start containers in detached mode
  if docker-compose up -d; then
    log_success "Containers started successfully"
  else
    log_error "Failed to start containers"
    return 1
  fi

  # Wait for containers to initialize
  log_info "Waiting for containers to initialize..."
  sleep 10

  # Show container status
  log_info "Container status:"
  docker-compose ps
}

###############################################################################
# Health checks
###############################################################################

wait_for_health() {
  log_info "Performing health checks..."

  local retry_count=0

  while [ $retry_count -lt $MAX_HEALTH_RETRIES ]; do
    log_info "Health check attempt $((retry_count + 1))/${MAX_HEALTH_RETRIES}..."

    # Perform health check
    if curl -f -s "${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
      log_success "Health check passed!"

      # Get health response for logging
      HEALTH_RESPONSE=$(curl -s "${HEALTH_ENDPOINT}")
      log_info "Health response: ${HEALTH_RESPONSE}"

      return 0
    fi

    retry_count=$((retry_count + 1))

    if [ $retry_count -lt $MAX_HEALTH_RETRIES ]; then
      log_warn "Health check failed, retrying in 5 seconds..."
      sleep 5
    fi
  done

  log_error "Health check failed after ${MAX_HEALTH_RETRIES} attempts"
  return 1
}

###############################################################################
# Rollback on failure
###############################################################################

rollback() {
  log_error "Deployment failed. Initiating rollback..."

  # Stop the failed containers
  log_info "Stopping failed containers..."
  docker-compose down --timeout 30 || true

  # If we have a backup image, restore it
  if [ -n "$BACKUP_IMAGE" ] && docker images -q "$BACKUP_IMAGE" 2>/dev/null; then
    log_info "Restoring backup image: ${BACKUP_IMAGE}"
    docker tag "${BACKUP_IMAGE}" "${IMAGE_NAME}:latest"

    log_info "Starting containers with backup image..."
    docker-compose up -d || true

    log_warn "Rollback complete. System restored to previous version."
  else
    log_warn "No backup image available. Manual intervention required."
  fi

  exit 1
}

###############################################################################
# Show deployment information
###############################################################################

show_deployment_info() {
  log_success "═══════════════════════════════════════════════════════"
  log_success "   LegacyAI Voice System Deployment Complete!"
  log_success "═══════════════════════════════════════════════════════"
  echo ""
  log_info "Service URLs:"
  log_info "  HTTP Server:     http://localhost:${HTTP_PORT}"
  log_info "  WebSocket:       ws://localhost:${WS_PORT}"
  log_info "  Health Check:    ${HEALTH_ENDPOINT}"
  echo ""
  log_info "Useful Commands:"
  log_info "  View logs:       docker-compose logs -f"
  log_info "  Stop services:   docker-compose down"
  log_info "  Restart:         docker-compose restart"
  log_info "  View status:     docker-compose ps"
  echo ""
  log_success "═══════════════════════════════════════════════════════"
}

###############################################################################
# Main deployment flow
###############################################################################

main() {
  log_info "═══════════════════════════════════════════════════════"
  log_info "   LegacyAI Voice System Deployment"
  log_info "═══════════════════════════════════════════════════════"
  echo ""

  # Trap errors and rollback
  trap 'rollback' ERR

  # Step 1: Check prerequisites
  check_prerequisites

  # Step 2: Run tests
  run_tests

  # Step 3: Build Docker image
  build_image

  # Step 4: Stop existing containers
  stop_containers

  # Step 5: Start new containers
  start_containers

  # Step 6: Health checks
  if ! wait_for_health; then
    log_error "Deployment health check failed"
    rollback
  fi

  # Step 7: Show deployment information
  show_deployment_info

  log_success "Deployment completed successfully at $(date +'%Y-%m-%d %H:%M:%S')"
}

# Execute main function
main "$@"
