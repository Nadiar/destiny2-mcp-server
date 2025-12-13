# Destiny 2 MCP Server

Production-ready Model Context Protocol (MCP) server for Destiny 2, providing player lookup, activity tracking, item/perk resolution via local manifest cache, clan roster access, and day-one triumph confidence scoring.

## Features

| Area | Capabilities |
|------|-------------|
| **Players** | Fuzzy/exact Bungie name search, profiles, characters, equipment |
| **Activities** | History with auto name resolution, PGCR, lifetime stats |
| **Items** | Full sockets/perks, plug sets, activity definitions, images (base64) |
| **Clans** | Direct roster lookup via cached groupId, elite rank scoring |
| **Triumphs** | Day-one/contest raid detection with weighted scoring |
| **Prompts** | Guided workflows for common queries |

## Quick Start

### Installation

**Option 1: npm (Node.js required)**
```bash
npm install -g destiny2-mcp-server
```

**Option 2: Docker (recommended for production)**
```bash
docker pull ghcr.io/nadiar/destiny2-mcp-server:latest
```

See [Docker Deployment Guide](docs/DOCKER.md) for detailed Docker setup.

### Configuration

#### 1. Create Bungie API Application

Go to [Bungie Developer Portal](https://www.bungie.net/en/Application) and create a new application:

**Required Settings:**

- **Application Name**: `MCP Server for LLM` (or your preferred name)
- **Application Status**: `Private`
- **OAuth Client Type**: `Not applicable`
- **Redirect URL**: Leave empty
- **Scope**: Not applicable (server uses API key only, no OAuth)
- **Origin Header**: `*`

After creating, copy your **API Key** (32-character hex string).

#### 2. Create .env file

```env
BUNGIE_API_KEY=your-32-character-hex-key
```

### Running

```bash
# Global install
destiny2-mcp-server

# Or from source
npm install
npm run build
npm start
```

## MCP Client Configuration

### Claude Desktop (npm installation)

Add to claude_desktop_config.json:

```json
{
  "mcpServers": {
    "destiny2": {
      "command": "destiny2-mcp-server",
      "env": {
        "BUNGIE_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Desktop (Docker)

For Docker deployment, use:

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

### Docker MCP Gateway (Recommended)

For [Docker MCP Gateway](https://github.com/docker/mcp-gateway) users, this server is available in the official Docker MCP catalog:

> **Note**: This requires [PR #883](https://github.com/docker/mcp-registry/pull/883) to be merged. Check the PR status before using these commands.

```bash
# Enable the server from the official catalog
docker mcp server enable destiny2-mcp-server

# Set your Bungie API key as a secret
docker mcp secret set destiny2-mcp-server.api_key=your-32-character-hex-key

# Verify installation
docker mcp server ls
```

That's it! The Docker MCP Gateway will automatically pull the image and configure the server.

**Updating:**

```bash
# Pull the latest image
docker pull ghcr.io/nadiar/destiny2-mcp-server:latest

# Restart your MCP client to use the new version
```

## Example Usage

Once configured, you can ask your AI assistant questions like:

### Player Lookup

> "Find a player named Guardian"

```text
Found 3 players matching "Guardian":

1. Guardian#1234 (Confidence: 92/100 - Very High)
   ⚡ PRIMARY ACCOUNT: Steam (type: 3, id: 4611686018XXXXXXXXX)
   All Platforms:
   - Steam: 4611686018XXXXXXXXX ⚡ PRIMARY
   - Xbox: 4611686018YYYYYYYYY (linked)
   - PlayStation: 4611686018ZZZZZZZZ (linked)
   
   - Playtime: 4,521 hours
   - Last Played: 12/12/2025 (0 days ago)
   - Triumph: 25,340 active / 489,230 lifetime
   - Clan: Math Class [MATH] ⭐ Elite
   - Day-One Clears: 8 🏆

2. Guardian#5678 (Confidence: 23/100 - Low)
   ⚡ PRIMARY ACCOUNT: PlayStation (type: 2, id: 4611686018XXXXXXXXX)
   - Playtime: 12 hours
   - Last Played: 03/15/2024 (633 days ago)
   - No clan
```

### Activity History & Statistics

> "How much time have they spent in Ghosts of the Deep?"

```text
# Activity Statistics Summary

Analyzed 500 activities, sorted by time played

## By Activity

### Ghosts of the Deep
- Activities: 145 (127 completed, 87% completion rate)
- Total Time: 47h 23m
- Total Kills: 18,940
- Efficiency: 2.34
- Date Range: 02/15/2025 - 12/11/2025

### Warlord's Ruin
- Activities: 98 (94 completed, 96% completion rate)
- Total Time: 38h 12m
- Date Range: 11/03/2024 - 12/10/2025

### Grasp of Avarice
- Activities: 62 (61 completed, 98% completion rate)
- Total Time: 19h 47m

---

## Overall Totals

- Activities: 500
- Total Time: 115h 32m
- Date Range: 11/20/2021 - 12/11/2025
```

### Post-Game Carnage Report (PGCR)

> "Get details on that Salvation's Edge run"

```text
Post-Game Carnage Report
Activity: Salvation's Edge (Master)
Date: 2025-11-28 19:32:15 UTC
Duration: 1h 23m 47s

Fireteam (6 players):
┌─────────────────┬───────┬────────┬─────────┬──────────┐
│ Player          │ Kills │ Deaths │ Assists │ K/D      │
├─────────────────┼───────┼────────┼─────────┼──────────┤
│ [REDACTED]#XXXX │   187 │      1 │      42 │   187.00 │
│ [REDACTED]#XXXX │   156 │      0 │      38 │      ∞   │
│ [REDACTED]#XXXX │   142 │      2 │      51 │    71.00 │
│ [REDACTED]#XXXX │   138 │      1 │      44 │   138.00 │
│ [REDACTED]#XXXX │   121 │      0 │      39 │      ∞   │
│ [REDACTED]#XXXX │   118 │      0 │      47 │      ∞   │
└─────────────────┴───────┴────────┴─────────┴──────────┘

Total Team Kills: 862
Total Team Deaths: 4
Completion: ✓ Success
```

### Item/Weapon Lookup

> "What perks can roll on Fatebringer?"

```text
Fatebringer (Adept)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: Hand Cannon (Kinetic)
Tier: Legendary
Source: Vault of Glass

Perk Columns:
├── Column 1: Explosive Payload, Firefly, Opening Shot, Frenzy
├── Column 2: Tunnel Vision, Rewind Rounds, Kill Clip
├── Barrel: Hammer-Forged, Smallbore, Corkscrew, Full Bore
└── Magazine: Accurized Rounds, Tactical Mag, Appended Mag

Curated Roll: Explosive Payload + Firefly
```

### Item Images

> "Show me the Fatebringer screenshot"

The `get_item_image` tool can return either:

- **Screenshot** (default): Large inspect image (~200KB) - great for detailed weapon views
- **Icon**: Small inventory icon (~3KB) - useful for quick references

```text
# Fatebringer
*Screenshot*

[High-resolution weapon image displayed inline]
```

Use `imageType: "icon"` parameter for the small inventory icon instead.

### Clan Roster

> "Show me the roster for my clan"

```text
Clan: Example Clan [EXMP]
Members: 87/100

Online Now (3):
  • Player#0001 - Titan (Last: Tower)
  • Player#0002 - Hunter (Last: Salvation's Edge)
  • Player#0003 - Warlock (Last: Crucible)

Top by Playtime:
  1. Player#0004 - 6,234 hours
  2. Player#0005 - 5,891 hours
  3. Player#0006 - 5,122 hours
```

## Available Tools

| Tool | Description |
|------|-------------|
| `search_player` | Exact Bungie name lookup (requires #code) |
| `find_players` | Fuzzy search by partial name with confidence scores + cross-save primary detection |
| `get_profile` | Full player profile with characters, clan, triumph scores |
| `get_character` | Detailed character info and equipped gear |
| `get_activity_history` | Recent activities with time played |
| `get_activity_stats` | Aggregated activity statistics with pagination (up to 1000), customizable fields, and activity filtering |
| `get_pgcr` | Post-game carnage report with time data |
| `get_historical_stats` | Lifetime PvE/PvP statistics by activity |
| `search_items` | Search weapons/armor by name |
| `get_item_details` | Full item info with perks, stats, and plug sets |
| `get_item_image` | Item screenshot or icon (supports imageType parameter) |
| `get_activity_definition` | Activity/encounter details from manifest |
| `get_clan_roster` | Full clan member list with online status |
| `get_plug_set` | Available perks for specific weapon/armor slots |

## Releases and Updates

### Latest Release

Docker images and npm packages are automatically published on each release:
- **Docker**: `ghcr.io/nadiar/destiny2-mcp-server:latest` or `:1.2.4`
- **npm**: `npm install -g destiny2-mcp-server@latest`

View all releases: [GitHub Releases](https://github.com/Nadiar/destiny2-mcp-server/releases)

### Updating

**npm installation:**
```bash
npm update -g destiny2-mcp-server
```

**Docker installation:**
```bash
# Pull latest version
docker pull ghcr.io/nadiar/destiny2-mcp-server:latest

# Or pull specific version
docker pull ghcr.io/nadiar/destiny2-mcp-server:1.2.4
```

After updating, restart your MCP client (Claude Desktop, etc.).

## Documentation

- **[API Reference](docs/API.md)** - Complete tool reference with examples
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project
- **[Docker Deployment](docs/DOCKER.md)** - Running with Docker
- **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** - Common issues and solutions

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, testing, and contribution guidelines.

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI**: Runs on every push and pull request
  - Tests on Node.js 18, 20, and 22
  - Linting and formatting checks
  - Security audits
  - Docker image builds
  - Code coverage reports

- **Release**: Automated releases on version tags
  - Publishes to npm registry
  - Builds and pushes Docker images to GitHub Container Registry
  - Creates GitHub releases with auto-generated notes

- **Dependabot**: Automated dependency updates
  - Weekly checks for npm, GitHub Actions, and Docker base images
  - Grouped minor/patch updates
  - Security vulnerability alerts

## Adding to MCP Toolkit Registry

To make this server discoverable in the [MCP Toolkit Registry](https://github.com/modelcontextprotocol/servers):

### 1. Fork the MCP Servers Repository

```bash
# Fork https://github.com/modelcontextprotocol/servers on GitHub
git clone https://github.com/YOUR_USERNAME/servers.git
cd servers
```

### 2. Add Server Entry

Create a new entry in `src/servers.json`:

```json
{
  "name": "destiny2-mcp-server",
  "description": "Destiny 2 API integration with player lookup, activity tracking, item/perk resolution, clan management, and day-one triumph scoring",
  "repository": "https://github.com/Nadiar/destiny2-mcp-server",
  "icon": "https://www.bungie.net/img/theme/destiny/icons/icon_d2.png",
  "categories": ["gaming", "api"],
  "installation": {
    "npm": "destiny2-mcp-server",
    "docker": "ghcr.io/nadiar/destiny2-mcp-server"
  },
  "configuration": {
    "required": {
      "BUNGIE_API_KEY": "Your Bungie API key from https://www.bungie.net/en/Application"
    },
    "optional": {
      "LOG_LEVEL": "Logging level (debug, info, warn, error)",
      "CACHE_TTL_HOURS": "Manifest cache TTL in hours (1-168)",
      "API_RATE_LIMIT_MS": "Minimum ms between API requests (50-1000)"
    }
  },
  "features": [
    "Fuzzy player search by Bungie name",
    "Activity history with automatic name resolution",
    "Post-game carnage reports (PGCR)",
    "Item/weapon perk lookups via local manifest cache",
    "Clan roster management",
    "Day-one raid completion detection",
    "Item images (screenshots and icons)",
    "Lifetime statistics tracking"
  ]
}
```

### 3. Submit Pull Request

```bash
git checkout -b add-destiny2-mcp-server
git add src/servers.json
git commit -m "Add destiny2-mcp-server to registry"
git push origin add-destiny2-mcp-server

# Create PR on GitHub: https://github.com/modelcontextprotocol/servers
```

### 4. PR Guidelines

- Ensure all tests pass
- Server must be publicly available (npm/Docker)
- Documentation should be complete
- Follow the [contribution guidelines](https://github.com/modelcontextprotocol/servers/blob/main/CONTRIBUTING.md)

### Alternative: Use MCP Config Generator

Users can also add this server manually using the MCP toolkit:

```bash
# Using npm
mcp install destiny2-mcp-server

# Or add to Claude Desktop config manually (see MCP Client Configuration above)
```

## License

MIT - See LICENSE file for details.

## Leaderboard Data

Pre-scraped World's First leaderboard data from raid.report and dungeon.report is included in `leaderboard-data/`:

- **leaderboards.json** - Machine-readable data with PGCR IDs
- **leaderboards.md** - Human-readable summary

Data includes top 100 contest mode completions for each raid and dungeon (or all completions if fewer than 100 teams finished during the contest window).
