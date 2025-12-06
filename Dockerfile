# Multi-stage build for minimal image size
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /build

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev) for build
RUN npm ci

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

# Add labels for metadata
LABEL maintainer="frankwiersma@outlook.com"
LABEL description="Deepgram Transcriber with Nova-3 and EU endpoint support"
LABEL version="2.0"

# Install only runtime dependencies
RUN apk add --no-cache     wget     tini

# Create non-root user
RUN addgroup -g 1001 -S nodejs &&     adduser -S nodejs -u 1001

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production &&     npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /build/server.js ./
COPY --from=builder --chown=nodejs:nodejs /build/public ./public/

# Create uploads directory with correct permissions
RUN mkdir -p uploads &&     chown -R nodejs:nodejs /usr/src/app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3456

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3   CMD wget --quiet --tries=1 --spider http://localhost:3456/health || exit 1

# Use tini as init system (handles signals properly)
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "server.js"]
