# Docker Deployment Guide

This guide covers how to deploy the Destiny 2 MCP Server using Docker.

## Prerequisites

- Docker 20.10 or later
- A valid Bungie API key (get one at https://www.bungie.net/en/Application)

## Quick Start

### Option 1: Build from Source

```bash
# Clone the repository
git clone https://github.com/Nadiar/destiny2-mcp-server.git
cd destiny2-mcp-server

# Build the Docker image
docker build -t destiny2-mcp-server .

# Run the container
docker run -it --rm \
  -e BUNGIE_API_KEY=your-api-key-here \
  destiny2-mcp-server
```

### Option 2: Pull from GitHub Container Registry

```bash
# Pull the latest image
docker pull ghcr.io/nadiar/destiny2-mcp-server:latest

# Run the container
docker run -it --rm \
  -e BUNGIE_API_KEY=your-api-key-here \
  ghcr.io/nadiar/destiny2-mcp-server:latest
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BUNGIE_API_KEY` | Yes | - | Your Bungie API key (32 hex characters) |
| `LOG_LEVEL` | No | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `CACHE_TTL_HOURS` | No | `24` | Manifest cache TTL in hours (1-168) |
| `CACHE_MAX_SIZE_MB` | No | `100` | Maximum cache size in MB (50-500) |
| `API_RATE_LIMIT_MS` | No | `150` | Min ms between API requests (50-1000) |
| `API_MAX_RETRIES` | No | `3` | Max API retry attempts (0-5) |
| `API_TIMEOUT_MS` | No | `30000` | API request timeout in ms (5000-60000) |

### Using an Environment File

Create a `.env` file:

```env
BUNGIE_API_KEY=your32characterhexkeyhere12345678
LOG_LEVEL=info
CACHE_TTL_HOURS=24
```

Run with the env file:

```bash
docker run -it --rm \
  --env-file .env \
  destiny2-mcp-server
```

## Persistent Cache

The manifest cache is stored at `/home/destiny/.destiny2-mcp/cache`. To persist the cache between container restarts:

```bash
docker run -it --rm \
  -e BUNGIE_API_KEY=your-api-key-here \
  -v destiny2-cache:/home/destiny/.destiny2-mcp/cache \
  destiny2-mcp-server
```

Or use a host directory:

```bash
docker run -it --rm \
  -e BUNGIE_API_KEY=your-api-key-here \
  -v $(pwd)/.cache:/home/destiny/.destiny2-mcp/cache \
  destiny2-mcp-server
```

## Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  destiny2-mcp:
    image: ghcr.io/nadiar/destiny2-mcp-server:latest
    # Or build from source:
    # build: .
    environment:
      - BUNGIE_API_KEY=${BUNGIE_API_KEY}
      - LOG_LEVEL=info
      - CACHE_TTL_HOURS=24
    volumes:
      - destiny2-cache:/home/destiny/.destiny2-mcp/cache
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  destiny2-cache:
```

Run with:

```bash
BUNGIE_API_KEY=your-api-key docker-compose up
```

## Integration with Claude Desktop

To use with Claude Desktop (or other MCP clients), add to your configuration:

### macOS/Linux

```json
{
  "mcpServers": {
    "destiny2": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "BUNGIE_API_KEY=your-api-key-here",
        "ghcr.io/nadiar/destiny2-mcp-server:latest"
      ]
    }
  }
}
```

### Windows

```json
{
  "mcpServers": {
    "destiny2": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "BUNGIE_API_KEY=your-api-key-here",
        "ghcr.io/nadiar/destiny2-mcp-server:latest"
      ]
    }
  }
}
```

## Health Checks

The container includes a basic health check. Check container health:

```bash
docker inspect --format='{{.State.Health.Status}}' <container-id>
```

## Resource Limits

For production deployments, consider setting resource limits:

```bash
docker run -it --rm \
  -e BUNGIE_API_KEY=your-api-key-here \
  --memory=256m \
  --cpus=0.5 \
  destiny2-mcp-server
```

## Troubleshooting

### Container exits immediately

The MCP server uses stdio transport and requires stdin to be connected:

```bash
# Use -it flag for interactive mode
docker run -it --rm ...

# Or keep stdin open
docker run -i --rm ...
```

### Cache download fails

If the manifest cache fails to download:

1. Check your API key is valid
2. Check network connectivity to bungie.net
3. The server will fall back to stale cache if available
4. Check logs with `LOG_LEVEL=debug`

### Permission denied on cache volume

If using a bind mount, ensure the directory is writable:

```bash
mkdir -p .cache
chmod 777 .cache
docker run -v $(pwd)/.cache:/home/destiny/.destiny2-mcp/cache ...
```

## Building Multi-Architecture Images

To build for multiple architectures:

```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t destiny2-mcp-server:latest .
```

## Security Notes

- Never include your API key in the Docker image
- Use environment variables or secrets management
- The container runs as a non-root user (`destiny`)
- API keys are sanitized from logs
