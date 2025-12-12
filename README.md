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

```bash
npm install -g destiny2-mcp-server
```

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

### Claude Desktop

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

## Example Usage

Once configured, you can ask your AI assistant questions like:

### Player Lookup

> "Find a player named Guardian"

```text
Found 3 players matching "Guardian":

1. Guardian#1234 (Confidence: HIGH 92%)
   - Steam: 4611686018XXXXXXXXX
   - Playtime: 4,521 hours
   - Clan: [CLAN_NAME]
   - Day-One Raids: 8 (Vault of Glass, King's Fall, Wrath, Last Wish, 
     Garden, Deep Stone, Vow, Root of Nightmares)

2. Guardian#5678 (Confidence: LOW 23%)
   - PlayStation: 4611686018XXXXXXXXX
   - Playtime: 12 hours
   - No clan
```

### Activity History

> "Show me recent raids for this player"

```text
Recent Raid Activity:

1. Salvation's Edge (Master) - Completed
   - Date: 2025-11-28
   - Duration: 1h 23m
   - Deaths: 4

2. Crota's End - Completed  
   - Date: 2025-11-25
   - Duration: 32m
   - Deaths: 1

3. Root of Nightmares - Completed
   - Date: 2025-11-22
   - Duration: 28m
   - Deaths: 0
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
| `find_players` | Fuzzy search by partial name |
| `get_profile` | Full player profile with characters |
| `get_character` | Detailed character info and equipment |
| `get_activity_history` | Recent activities for a character |
| `get_pgcr` | Post-game carnage report details |
| `get_historical_stats` | Lifetime PvE/PvP statistics |
| `search_items` | Search weapons/armor by name |
| `get_item_details` | Full item info with perks/stats |
| `get_activity_definition` | Activity details from manifest |
| `get_clan_roster` | Full clan member list |
| `get_item_image` | Item screenshot or icon as base64 (supports imageType parameter) |

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

## License

MIT - See LICENSE file for details.
