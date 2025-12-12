# Build stage - compile TypeScript
FROM node:25-alpine AS builder

WORKDIR /app

# Install dependencies first (cache optimization)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production


# Runtime stage - minimal image
FROM node:25-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S destiny -u 1001 -G nodejs

WORKDIR /app

# Copy only production dependencies and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Create cache directory with proper permissions
RUN mkdir -p /home/destiny/.destiny2-mcp/cache && \
    chown -R destiny:nodejs /home/destiny/.destiny2-mcp

# Switch to non-root user
USER destiny

# Environment variables (documented, not set - must be provided at runtime)
# BUNGIE_API_KEY - Required: Your Bungie API key
# LOG_LEVEL - Optional: debug, info, warn, error (default: info)
# CACHE_TTL_HOURS - Optional: Manifest cache TTL in hours (default: 24)

ENV NODE_ENV=production

# Health check (basic process check since this is stdio transport)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Run the MCP server
CMD ["node", "dist/index.js"]

# Labels for container metadata
LABEL org.opencontainers.image.title="Destiny 2 MCP Server" \
      org.opencontainers.image.description="MCP server for Destiny 2 API integration" \
      org.opencontainers.image.version="1.0.2" \
      org.opencontainers.image.vendor="Destiny 2 MCP Server Contributors" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/Nadiar/destiny2-mcp-server"
