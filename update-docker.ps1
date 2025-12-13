# Update Docker MCP Image
# This script rebuilds and updates the destiny2-mcp Docker image

$ErrorActionPreference = "Stop"

Write-Host "=== Updating Destiny 2 MCP Docker Image ===" -ForegroundColor Cyan

# Step 1: Build TypeScript
Write-Host "`n[1/4] Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Copy to Docker build context
Write-Host "`n[2/4] Copying files to Docker build context..." -ForegroundColor Yellow
$dockerBuildPath = "C:\Users\nadiar\mcp-docker-gateway\servers\destiny2-mcp"

Copy-Item -Path "dist" -Destination $dockerBuildPath -Recurse -Force
Copy-Item -Path "package*.json" -Destination $dockerBuildPath -Force

# Step 3: Build Docker image
Write-Host "`n[3/4] Building Docker image..." -ForegroundColor Yellow
docker build -t destiny2-mcp:latest $dockerBuildPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Verify
Write-Host "`n[4/4] Verifying image..." -ForegroundColor Yellow
docker images destiny2-mcp:latest

Write-Host "`n✓ Docker image updated successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Restart Claude Desktop (or your MCP client)"
Write-Host "  2. Or restart Docker Desktop if changes aren't detected"
Write-Host "`nTo test the image directly:" -ForegroundColor Cyan
Write-Host '  docker run --rm -e BUNGIE_API_KEY=$env:BUNGIE_API_KEY destiny2-mcp:latest' -ForegroundColor Gray
