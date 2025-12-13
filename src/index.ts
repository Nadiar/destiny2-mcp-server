#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { BungieApiClient } from './api/index.js';
import { ManifestCache } from './services/index.js';
import { registerTools } from './tools/index.js';
import { loadConfig, getConfigHelp, isValidApiKeyFormat, type Config } from './config.js';
import dotenv from 'dotenv';
import logger from './services/logger.js';

// Package version - keep in sync with package.json
const VERSION = '1.2.5';

// Load environment variables from .env if present
dotenv.config();

// Load and validate configuration
let config: Config;
try {
  config = loadConfig();
} catch (error) {
  logger.error('Configuration error');
  if (error instanceof Error) {
    logger.error(error.message);
  }
  logger.info('Configuration help:');
  console.error(getConfigHelp());
  process.exit(1);
}

// Additional format check with warning (non-blocking)
if (!isValidApiKeyFormat(config.BUNGIE_API_KEY)) {
  logger.warn('API key format appears invalid (expected 32 hex characters)');
  logger.warn(
    'Key may still work if Bungie changed format, but verify at: https://www.bungie.net/en/Application'
  );
}

// Create the MCP server
const server = new McpServer({
  name: 'destiny2-mcp-server',
  version: VERSION,
});

// Create the Bungie API client with config
const bungieClient = new BungieApiClient(config.BUNGIE_API_KEY, {
  rateLimitMs: config.API_RATE_LIMIT_MS,
  maxRetries: config.API_MAX_RETRIES,
  timeoutMs: config.API_TIMEOUT_MS,
});

// Create the manifest cache for local item search with config
const manifestCache = new ManifestCache(config.BUNGIE_API_KEY, {
  ttlHours: config.CACHE_TTL_HOURS,
  maxSizeMb: config.CACHE_MAX_SIZE_MB,
});

// Register all Destiny 2 tools
registerTools(server, bungieClient, manifestCache);

// Register prompts for common query patterns
server.prompt(
  'weapon_perk_lookup',
  'How to find what perks can roll on a weapon',
  { weaponName: z.string().optional().describe('Weapon name to look up') },
  ({ weaponName }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `To find perks for ${weaponName || 'a weapon'}:

1. Find the weapon's hash on light.gg or d2gunsmith.com (the number in the URL)
2. Use get_item_details with that hash to see all possible perks with names

Note: The Bungie Armory Search API is deprecated, so you cannot search by name directly.

Common weapon hashes:
- Fatebringer: 2171478765
- The Navigator: 1536541570  
- Conditional Finality: 1716319596
- Cloudstrike: 1193238894`,
        },
      },
    ],
  })
);

server.prompt(
  'activity_count_lookup',
  'How to count activity completions for a player',
  {
    activityName: z.string().optional().describe('Activity name'),
    bungieName: z.string().optional().describe('Player Bungie Name'),
  },
  ({ activityName, bungieName }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `To count how many times ${bungieName || 'a player'} has run ${activityName || 'an activity'}:

1. Use search_player with their Bungie Name (format: "Name#1234") to get membershipType and membershipId
2. Use get_profile to get their character IDs
3. Use get_activity_history for each character with:
   - mode: 4 for Raids, 82 for Dungeons, 46 for Nightfalls, 0 for all
   - count: 250 (max per request)
   - Paginate through results until you reach the desired start date
4. Match activities by looking up directorActivityHash with get_item_definition
5. Count completions (where values.completed.basic.value === 1)
6. Deduplicate across characters using instanceId`,
        },
      },
    ],
  })
);

server.prompt(
  'player_lookup',
  'How to look up a Destiny 2 player',
  { bungieName: z.string().optional().describe('Player Bungie Name') },
  ({ bungieName }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `To look up ${bungieName || 'a player'}:

1. Use search_player with Bungie Name (format: "DisplayName#1234")
2. This returns membershipType (platform) and membershipId
3. Use get_profile with those to see characters, power levels, and play time
4. Use get_character for detailed stats on a specific character

Common membershipType values:
- 1: Xbox
- 2: PlayStation  
- 3: Steam
- 6: Epic Games`,
        },
      },
    ],
  })
);

server.prompt(
  'weapon_image_lookup',
  'How to get an image/icon for a weapon',
  { weaponName: z.string().optional().describe('Weapon name') },
  ({ weaponName }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `To get an image for ${weaponName || 'a weapon'}:

1. Use search_items with the weapon name to find its hash
2. Use get_item_image with that hash to get the actual image

The image returned will be the weapon's screenshot if available, otherwise the icon.`,
        },
      },
    ],
  })
);

server.prompt(
  'destiny_hash_system',
  'Understanding Destiny 2 hash identifiers and how to resolve them to names',
  {},
  () => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `# Destiny 2 Hash System

The Bungie API uses numeric hash identifiers for all game entities. Most tools in this MCP automatically resolve hashes to human-readable names.

## Hash Types and Resolution Tools

| Hash Type | Found In | Resolution Tool |
|-----------|----------|-----------------|
| Item Hash | Equipment, rewards, perks | get_item_definition or search_items |
| Activity Hash | Activity history, PGCR | get_activity_definition |
| Plug Set Hash | Item socket definitions | get_plug_set |

## Tools That Auto-Resolve Names

These tools automatically look up names from hashes:
- **get_activity_history**: Resolves activity names from directorActivityHash
- **get_pgcr**: Resolves activity name from referenceId
- **get_item_details**: Resolves item name and all perk names in sockets
- **get_plug_set**: Resolves all perk names in the plug set
- **get_activity_definition**: Returns formatted activity details with name

## Manual Hash Resolution

If you encounter a raw hash, use:
- **Items/Perks**: get_item_definition with itemHash
- **Activities**: get_activity_definition with activityHash
- **Perk sets**: get_plug_set with plugSetHash

## Common Activity Mode Types

- 0: None/All
- 4: Raid
- 5: AllPvP
- 6: Patrol
- 7: AllPvE
- 16: Nightfall
- 18: AllStrikes
- 46: Scored Nightfall
- 82: Dungeon
- 84: Trials of Osiris`,
        },
      },
    ],
  })
);

// Start the server with stdio transport
async function main() {
  // Initialize manifest cache lazily in background (won't block server startup)
  logger.info('Server starting, manifest cache will initialize on first use...');
  
  // Start background initialization (non-blocking)
  manifestCache.initialize().then(() => {
    logger.info(`Manifest cache ready with ${manifestCache.itemCount} items`);
  }).catch((error) => {
    logger.warn('Manifest cache initialization failed, will retry on first tool use', { 
      error: String(error?.message || error) 
    });
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Server running on stdio, tools available');
}

// Graceful shutdown
function setupShutdown() {
  const shutdown = async (signal: string) => {
    try {
      logger.warn(`Received ${signal}, shutting down...`);
      // If MCP SDK adds explicit close in future, call here
      // await server.close?.();
      // manifestCache cleanup hook if available
    } catch (e) {
      logger.error('Error during shutdown', { error: String((e as any)?.stack || e) });
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

setupShutdown();

main().catch((error) => {
  logger.error('Fatal error', { error: String(error?.stack || error) });
  process.exit(1);
});

