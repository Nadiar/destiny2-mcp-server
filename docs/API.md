# API Reference

Complete reference for all Destiny 2 MCP Server tools.

## Table of Contents

- [Player Tools](#player-tools)
- [Activity Tools](#activity-tools)
- [Item Tools](#item-tools)
- [Clan Tools](#clan-tools)
- [Definition Tools](#definition-tools)

## Player Tools

### search_player

Exact player search by full Bungie name.

**Parameters:**
- `bungieName` (string, required): Full Bungie name with discriminator (e.g., "Guardian#1234")

**Returns:**
- Player profile with membership information
- Multiple platforms if player is cross-save enabled
- Character IDs for further queries

**Example:**
```typescript
{
  bungieName: "Guardian#1234"
}
```

**Response:**
```json
{
  "displayName": "Guardian",
  "bungieGlobalDisplayNameCode": 1234,
  "memberships": [{
    "membershipType": 3,
    "membershipId": "4611686018467...",
    "displayName": "Guardian",
    "crossSaveOverride": 3
  }]
}
```

**Use Cases:**
- Get exact player profile
- Find membership IDs for API calls
- Verify player exists

---

### find_players

Fuzzy search for players by partial name.

**Parameters:**
- `partialName` (string, required): Partial player name (no discriminator needed)
- `maxResults` (number, optional): Maximum results to return (default: 10, max: 25)

**Returns:**
- List of matching players ranked by confidence score
- Play time and day-one raid completion stats
- Clan information

**Example:**
```typescript
{
  partialName: "Guardian",
  maxResults: 5
}
```

**Response:**
```json
{
  "players": [{
    "name": "Guardian#1234",
    "confidence": "HIGH",
    "confidenceScore": 92,
    "membershipType": 3,
    "membershipId": "4611686018467...",
    "playtimeHours": 4521,
    "clanName": "Example Clan",
    "dayOneRaids": 8
  }]
}
```

**Use Cases:**
- Search when exact name is unknown
- Find players with similar names
- Get ranked results by play time

---

### get_profile

Get full player profile with characters and stats.

**Parameters:**
- `membershipType` (number, required): Platform ID (1=Xbox, 2=PS, 3=Steam, 6=Epic)
- `membershipId` (string, required): Player's membership ID
- `components` (array, optional): Specific components to fetch (default: all)

**Returns:**
- All characters with power levels
- Clan information
- Total play time
- Last played date

**Example:**
```typescript
{
  membershipType: 3,
  membershipId: "4611686018467..."
}
```

**Use Cases:**
- Get all character information
- Check player's power levels
- View clan membership

---

### get_character

Get detailed character information and equipment.

**Parameters:**
- `membershipType` (number, required): Platform ID
- `membershipId` (string, required): Player's membership ID
- `characterId` (string, required): Character ID from profile

**Returns:**
- Character class (Hunter, Titan, Warlock)
- Current power level
- Equipped weapons and armor with perks
- Subclass configuration
- Stats (Mobility, Resilience, etc.)

**Example:**
```typescript
{
  membershipType: 3,
  membershipId: "4611686018467...",
  characterId: "2305843009..."
}
```

**Use Cases:**
- View character loadout
- Check equipped perks
- Analyze stat distribution

---

### get_historical_stats

Get lifetime statistics for a player.

**Parameters:**
- `membershipType` (number, required): Platform ID
- `membershipId` (string, required): Player's membership ID
- `characterId` (string, optional): Specific character (or all characters if omitted)

**Returns:**
- PvE and PvP stats
- Kill/Death ratios
- Time played per activity
- Completion counts

**Example:**
```typescript
{
  membershipType: 3,
  membershipId: "4611686018467..."
}
```

**Use Cases:**
- View player career stats
- Compare PvE vs PvP activity
- Check lifetime completions

## Activity Tools

### get_activity_history

Get recent activity history for a character.

**Parameters:**
- `membershipType` (number, required): Platform ID
- `membershipId` (string, required): Player's membership ID
- `characterId` (string, required): Character ID
- `mode` (number, optional): Activity mode filter (0=All, 4=Raid, 82=Dungeon, etc.)
- `count` (number, optional): Number of activities (default: 25, max: 250)
- `page` (number, optional): Page number for pagination (default: 0)

**Returns:**
- Activity name (auto-resolved from hash)
- Completion status
- Duration
- Date/time
- Kills and deaths
- Fireteam members

**Example:**
```typescript
{
  membershipType: 3,
  membershipId: "4611686018467...",
  characterId: "2305843009...",
  mode: 4, // Raids only
  count: 10
}
```

**Common Mode Values:**
- `0`: All activities
- `4`: Raid
- `5`: All PvP
- `7`: All PvE
- `16`: Nightfall
- `18`: All Strikes
- `46`: Scored Nightfall
- `82`: Dungeon
- `84`: Trials of Osiris

**Use Cases:**
- Track recent completions
- Count specific activity runs
- View completion times

---

### get_pgcr

Get Post-Game Carnage Report for an activity.

**Parameters:**
- `activityId` (string, required): Activity instance ID from activity history

**Returns:**
- Complete activity details
- Full fireteam roster
- Per-player statistics (kills, deaths, K/D, precision kills, etc.)
- Activity duration
- Completion status

**Example:**
```typescript
{
  activityId: "12345678901234567890"
}
```

**Use Cases:**
- Detailed activity analysis
- Compare fireteam performance
- Verify activity completion

## Item Tools

### search_items

Search for weapons, armor, or items by name.

**Parameters:**
- `query` (string, required): Item name or partial name
- `itemType` (string, optional): Filter by type (Weapon, Armor, etc.)
- `maxResults` (number, optional): Max results (default: 10, max: 50)

**Returns:**
- Item hash for further queries
- Item name and description
- Item type and tier (Exotic, Legendary, etc.)
- Source information
- Season/expansion introduced

**Example:**
```typescript
{
  query: "Fatebringer",
  itemType: "Weapon",
  maxResults: 5
}
```

**Use Cases:**
- Find item hash for detailed lookup
- Search for specific gear
- Browse items by name

---

### get_item_details

Get complete item information including all possible perks.

**Parameters:**
- `itemHash` (number, required): Item hash from search or API
- `includePlugSets` (boolean, optional): Include all perk options (default: true)

**Returns:**
- Complete item name and description
- All possible perk options per column
- Stat values
- Socket information
- Curated/recommended rolls

**Example:**
```typescript
{
  itemHash: 2171478765, // Fatebringer
  includePlugSets: true
}
```

**Use Cases:**
- See all possible weapon perks
- Check armor mod options
- Find god rolls

---

### get_item_image

Get item image as base64-encoded data.

**Parameters:**
- `itemHash` (number, required): Item hash
- `imageType` (string, optional): "screenshot" (default) or "icon"

**Returns:**
- Base64-encoded image data
- Image format (PNG/JPEG)
- Dimensions

**Example:**
```typescript
{
  itemHash: 2171478765,
  imageType: "screenshot"
}
```

**Image Types:**
- `screenshot`: Large inspect view (~200KB) - best for detailed view
- `icon`: Small inventory icon (~3KB) - best for quick reference

**Use Cases:**
- Display weapon/armor images
- Create loadout visualizations
- Reference item appearance

## Clan Tools

### get_clan_roster

Get complete clan roster with member details.

**Parameters:**
- `membershipType` (number, required): Platform ID
- `membershipId` (string, required): Any clan member's membership ID
- `includeOnlineStatus` (boolean, optional): Include online status (default: true)

**Returns:**
- All clan members
- Join dates
- Play time
- Last online
- Current activity (if online)
- Clan ranks

**Example:**
```typescript
{
  membershipType: 3,
  membershipId: "4611686018467...",
  includeOnlineStatus: true
}
```

**Use Cases:**
- View clan roster
- Find online members
- Check member activity

## Definition Tools

### get_activity_definition

Get activity details from the manifest.

**Parameters:**
- `activityHash` (number, required): Activity hash from API

**Returns:**
- Activity name
- Description
- Activity type (Raid, Dungeon, Strike, etc.)
- Recommended power level
- Matchmaking availability
- Rewards

**Example:**
```typescript
{
  activityHash: 1541280591 // Salvation's Edge
}
```

**Use Cases:**
- Resolve activity hash to name
- Get activity description
- Check power requirements

## Error Handling

All tools return errors in a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `INVALID_PARAMETERS` | Missing or invalid parameters | Check parameter format |
| `PLAYER_NOT_FOUND` | Player does not exist | Verify Bungie name format |
| `API_ERROR` | Bungie API returned error | Check API key and rate limits |
| `RATE_LIMIT` | Too many requests | Wait and retry |
| `NETWORK_ERROR` | Connection failed | Check network connectivity |
| `CACHE_ERROR` | Manifest cache issue | Clear cache and retry |

## Rate Limiting

The server implements automatic rate limiting:
- Default: 150ms between requests
- Configurable via `API_RATE_LIMIT_MS` environment variable
- Automatic retry with exponential backoff (up to 3 retries by default)

## Pagination

Tools that return lists support pagination:
- `count`: Number of items per page (varies by tool)
- `page`: Page number (0-indexed)
- Check response for `hasMore` indicator

**Example:**
```typescript
// First page
{ count: 25, page: 0 }

// Second page  
{ count: 25, page: 1 }
```

## Best Practices

1. **Cache responses** when possible - manifest data rarely changes
2. **Batch requests** - use profile endpoint to get all characters at once
3. **Handle rate limits** - implement exponential backoff
4. **Validate hashes** - ensure hashes are numbers, not strings
5. **Check for nulls** - player profiles can have missing data
6. **Use fuzzy search first** - easier for users than exact names
7. **Store membership IDs** - avoid repeated player lookups

## Tool Categories by Use Case

### Looking up a player
1. `find_players` - Fuzzy search
2. `search_player` - Exact match
3. `get_profile` - Full profile
4. `get_character` - Character details

### Tracking activities
1. `get_activity_history` - Recent activities
2. `get_pgcr` - Detailed activity report
3. `get_historical_stats` - Lifetime stats

### Item research
1. `search_items` - Find by name
2. `get_item_details` - See all perks
3. `get_item_image` - Get image

### Clan management
1. `get_clan_roster` - View members
2. `find_players` - Search members

## Support

For issues or questions:
- Check [Troubleshooting Guide](TROUBLESHOOTING.md)
- Review [Bungie API Documentation](https://bungie-net.github.io/multi/index.html)
- Open an issue on [GitHub](https://github.com/Nadiar/destiny2-mcp-server/issues)
