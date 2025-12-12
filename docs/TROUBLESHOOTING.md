# Troubleshooting Guide

This guide helps diagnose and resolve common issues with the Destiny 2 MCP Server.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [Runtime Issues](#runtime-issues)
- [API Issues](#api-issues)
- [Docker Issues](#docker-issues)
- [Performance Issues](#performance-issues)
- [Debugging](#debugging)

## Installation Issues

### npm install fails

**Problem**: Installation fails with dependency errors

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### TypeScript compilation errors

**Problem**: Build fails with TypeScript errors

**Solution**:
```bash
# Ensure you have the correct Node.js version
node --version  # Should be >= 18.0.0

# Check TypeScript version
npx tsc --version

# Clean build and rebuild
rm -rf dist/
npm run build
```

## Configuration Issues

### Missing BUNGIE_API_KEY error

**Problem**: `Configuration validation failed: BUNGIE_API_KEY is required`

**Solution**:
1. Verify `.env` file exists in the project root
2. Check the file contains: `BUNGIE_API_KEY=your-key-here`
3. Ensure no extra spaces or quotes around the key
4. Verify the key is 32 hexadecimal characters

Get a key at: https://www.bungie.net/en/Application

### Invalid API key format warning

**Problem**: `API key format appears invalid (expected 32 hex characters)`

**Solution**:
- Your key should be exactly 32 characters of 0-9 and a-f
- Example valid format: `5c8956f860ff49cb923d50240d4df534`
- If you're sure your key is valid, you can ignore this warning
- The server will still attempt to use the key

### Configuration validation errors

**Problem**: Other configuration validation errors

**Solution**:
Run the config help command:
```bash
npm run dev 2>&1 | grep "Configuration help" -A 20
```

Check all environment variables match the expected format:
```bash
# View all config requirements
cat src/config.ts | grep -A 3 "describe"
```

## Runtime Issues

### Server starts but doesn't respond

**Problem**: Server appears to start but doesn't process requests

**Solution**:
1. Ensure you're using stdio transport correctly
2. Check MCP client configuration:
   ```json
   {
     "mcpServers": {
       "destiny2": {
         "command": "destiny2-mcp-server",
         "env": {
           "BUNGIE_API_KEY": "your-key"
         }
       }
     }
   }
   ```
3. Test the server directly:
   ```bash
   LOG_LEVEL=debug npm run dev
   ```

### Manifest cache initialization fails

**Problem**: `Failed to download manifest` or cache errors

**Solution**:
1. Check network connectivity:
   ```bash
   curl -I https://www.bungie.net/Platform/Destiny2/Manifest/
   ```

2. Verify API key is valid:
   ```bash
   curl -H "X-API-Key: YOUR_KEY" \
     https://www.bungie.net/Platform/Destiny2/Manifest/
   ```

3. Clear cache and retry:
   ```bash
   rm -rf ~/.destiny2-mcp/cache/
   npm run dev
   ```

4. Check cache permissions:
   ```bash
   ls -la ~/.destiny2-mcp/
   chmod -R 755 ~/.destiny2-mcp/
   ```

### Cache size issues

**Problem**: Cache grows too large or fills disk

**Solution**:
1. Set cache size limit in `.env`:
   ```env
   CACHE_MAX_SIZE_MB=50
   ```

2. Clear cache manually:
   ```bash
   rm -rf ~/.destiny2-mcp/cache/
   ```

3. Reduce cache TTL to refresh more often:
   ```env
   CACHE_TTL_HOURS=12
   ```

## API Issues

### Rate limiting errors

**Problem**: `429 Too Many Requests` or rate limit messages

**Solution**:
1. Increase rate limit delay in `.env`:
   ```env
   API_RATE_LIMIT_MS=200
   ```

2. Reduce concurrent requests in your MCP client

3. Check if multiple instances are running:
   ```bash
   ps aux | grep destiny2-mcp-server
   ```

### API timeout errors

**Problem**: Requests timeout or take too long

**Solution**:
1. Increase timeout in `.env`:
   ```env
   API_TIMEOUT_MS=45000
   ```

2. Check network latency to Bungie servers:
   ```bash
   ping bungie.net
   ```

3. Enable retry logic (already enabled by default):
   ```env
   API_MAX_RETRIES=5
   ```

### Authentication errors

**Problem**: `401 Unauthorized` or `403 Forbidden`

**Solution**:
1. Verify API key is still valid at https://www.bungie.net/en/Application
2. Check if your Bungie app status is "Approved"
3. Ensure Origin Header is set to `*` in your Bungie app settings
4. Regenerate API key if needed

### Specific player not found

**Problem**: `Player not found` for valid Bungie names

**Solution**:
1. Ensure Bungie name includes the discriminator:
   ```
   ✅ Guardian#1234
   ❌ Guardian
   ```

2. Try fuzzy search instead:
   ```typescript
   // Use find_players instead of search_player
   find_players({ partialName: "Guardian" })
   ```

3. Check if player's profile is set to private

## Docker Issues

### Container exits immediately

**Problem**: Docker container stops right after starting

**Solution**:
The MCP server requires stdin to be connected:
```bash
# Use -it flag for interactive mode
docker run -it --rm -e BUNGIE_API_KEY=your-key destiny2-mcp-server

# Or just keep stdin open
docker run -i --rm -e BUNGIE_API_KEY=your-key destiny2-mcp-server
```

### Permission denied on volumes

**Problem**: Cannot write to cache volume

**Solution**:
```bash
# Create cache directory with correct permissions
mkdir -p .cache
chmod 777 .cache

# Run with correct volume mount
docker run -it --rm \
  -e BUNGIE_API_KEY=your-key \
  -v $(pwd)/.cache:/home/destiny/.destiny2-mcp/cache \
  destiny2-mcp-server
```

### Docker build fails

**Problem**: Docker build fails during npm ci or build

**Solution**:
1. Clear Docker build cache:
   ```bash
   docker builder prune -a
   ```

2. Rebuild without cache:
   ```bash
   docker build --no-cache -t destiny2-mcp-server .
   ```

3. Check Docker has enough resources:
   - Memory: At least 2GB
   - Disk: At least 5GB free

### Health check fails

**Problem**: Container health status is "unhealthy"

**Solution**:
1. Check container logs:
   ```bash
   docker logs <container-id>
   ```

2. The health check is basic - if the process runs, it's healthy
3. If you're using the MCP server correctly, health check issues usually indicate the process crashed

## Performance Issues

### Slow tool responses

**Problem**: Tools take a long time to respond

**Solution**:
1. Check if manifest cache is initialized:
   ```bash
   ls -lh ~/.destiny2-mcp/cache/
   ```

2. Manifest should be ~30MB. If missing or corrupted:
   ```bash
   rm -rf ~/.destiny2-mcp/cache/
   # Restart server to re-download
   ```

3. Reduce cache TTL if stale data is acceptable:
   ```env
   CACHE_TTL_HOURS=48
   ```

### High memory usage

**Problem**: Server uses excessive memory

**Solution**:
1. Reduce cache size:
   ```env
   CACHE_MAX_SIZE_MB=50
   ```

2. Monitor memory usage:
   ```bash
   # Docker
   docker stats <container-id>
   
   # Native
   ps aux | grep destiny2-mcp-server
   ```

3. Set memory limits (Docker):
   ```bash
   docker run --memory=256m ...
   ```

## Debugging

### Enable debug logging

Set log level to debug:
```bash
# Environment variable
LOG_LEVEL=debug npm run dev

# In .env file
LOG_LEVEL=debug
```

### Test individual tools

Create a test script:
```typescript
import { BungieApiClient } from './src/api/index.js';

const client = new BungieApiClient('your-api-key');
const result = await client.searchPlayer('Guardian#1234');
console.log(result);
```

Run with:
```bash
npx tsx test-script.ts
```

### Inspect API requests

Use debug mode to see all API calls:
```bash
LOG_LEVEL=debug npm run dev 2>&1 | grep "API request"
```

### Check manifest cache contents

```bash
# List cache files
ls -lh ~/.destiny2-mcp/cache/

# Check manifest version
cat ~/.destiny2-mcp/cache/manifest-version.json

# Validate cache size
du -sh ~/.destiny2-mcp/cache/
```

### Test with minimal config

Create a minimal `.env`:
```env
BUNGIE_API_KEY=your-key-here
LOG_LEVEL=debug
```

Remove all optional config and test.

## Getting Help

If you're still experiencing issues:

1. **Check existing issues**: Search [GitHub Issues](https://github.com/Nadiar/destiny2-mcp-server/issues)

2. **Create a new issue** with:
   - Node.js version: `node --version`
   - npm version: `npm --version`
   - Server version: Check `package.json`
   - Operating system
   - Full error message (sanitize your API key!)
   - Steps to reproduce

3. **Enable debug logs** and include relevant output (sanitize sensitive data):
   ```bash
   LOG_LEVEL=debug npm run dev 2>&1 | head -100
   ```

4. **Test with integration tests** to isolate the issue:
   ```bash
   INTEGRATION_TEST=true npm run test:integration
   ```

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED` | Cannot connect to Bungie API | Check network, firewall, or proxy |
| `ENOTFOUND` | DNS resolution failed | Check DNS settings or internet connection |
| `EACCES` | Permission denied | Check file permissions on cache directory |
| `ENOSPC` | No space left on device | Free up disk space |
| `ERR_REQUIRE_ESM` | CommonJS/ESM mismatch | Ensure `"type": "module"` in package.json |
| `Cannot find module` | Missing dependency | Run `npm install` |
| `Manifest API returned 401` | Invalid API key | Verify API key at Bungie Developer Portal |

## Preventive Measures

### Regular maintenance

```bash
# Update dependencies monthly
npm update

# Check for security vulnerabilities
npm audit

# Clear old cache periodically
rm -rf ~/.destiny2-mcp/cache/manifest-version.json
```

### Monitor disk space

```bash
# Check cache size
du -sh ~/.destiny2-mcp/cache/

# Set up size limits in .env
CACHE_MAX_SIZE_MB=100
```

### Keep logs

```bash
# Log to file for debugging
npm run dev 2>&1 | tee destiny2-mcp.log
```
