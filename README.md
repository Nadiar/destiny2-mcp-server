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
- **Scope**: Check `Read your Destiny 2 information (Vault, Inventory, and Vendors), as well as Destiny 1 Vault and Inventory data`
- **Origin Header**: `*` (or your specific origin)

After creating, copy your **API Key** (32-character hex string).

#### 2. Create .env file

```env
BUNGIE_API_KEY=your-32-character-hex-key
```

### Running

```bash
# Global install
destiny2-mcp

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
      "command": "destiny2-mcp",
      "env": {
        "BUNGIE_API_KEY": "your-api-key"
      }
    }
  }
}
```

## License

MIT - See LICENSE file for details.
