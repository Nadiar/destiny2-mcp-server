import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getEliteTierForPlayer } from './elite-tier.js';

// Types for enriched leaderboard data
interface LeaderboardPlayer {
  membershipId: string;
  membershipType: number;
  displayName: string;
  bungieGlobalDisplayName: string;
  bungieGlobalDisplayNameCode: number;
  bungieName: string;
  characterId: string;
  characterClass: string;
  lightLevel: number;
  completed: boolean;
  kills: number;
  deaths: number;
  assists: number;
  timePlayedSeconds: number;
}

interface LeaderboardEntry {
  rank: number;
  pgcrId: string;
  time: string;
  timeSeconds: number;
  players: LeaderboardPlayer[];
  activityDetails?: {
    instanceId: string;
    referenceId: number;
    directorActivityHash: number;
    mode: number;
    modes: number[];
    isPrivate: boolean;
  };
  period?: string;
  enriched: boolean;
}

interface Leaderboard {
  activity: string;
  slug: string;
  mode: string;
  url: string;
  scrapedAt: string;
  enrichedAt?: string;
  entries: LeaderboardEntry[];
  summary: {
    totalInTop100: number;
    teamsIn24Hours: number;
    teamsIn48Hours: number;
    worldsFirst: LeaderboardEntry | null;
    lastInTop100: LeaderboardEntry | null;
  };
}

interface LeaderboardData {
  raids: Leaderboard[];
  dungeons: Leaderboard[];
  generatedAt: string;
}

// Cache for loaded leaderboard data
let leaderboardDataCache: LeaderboardData | null = null;
let cacheLoadTime = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load enriched leaderboard data from file
 */
async function loadLeaderboardData(): Promise<LeaderboardData> {
  const now = Date.now();
  if (leaderboardDataCache && now - cacheLoadTime < CACHE_TTL) {
    return leaderboardDataCache;
  }

  // Resolve path relative to this file
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataPath = join(__dirname, '..', '..', 'leaderboard-data', 'leaderboards-enriched.json');

  try {
    const data = await readFile(dataPath, 'utf-8');
    leaderboardDataCache = JSON.parse(data);
    cacheLoadTime = now;
    if (!leaderboardDataCache) {
      throw new Error('Leaderboard data cache is not loaded');
    }
    return leaderboardDataCache;
  } catch {
    // Fall back to non-enriched data
    const fallbackPath = join(__dirname, '..', '..', 'leaderboard-data', 'leaderboards.json');
    const data = await readFile(fallbackPath, 'utf-8');
    leaderboardDataCache = JSON.parse(data);
    cacheLoadTime = now;
    if (!leaderboardDataCache) {
      throw new Error('Leaderboard data cache is not loaded');
    }
    return leaderboardDataCache;
  }
}

/**
 * Find a leaderboard by activity name or slug
 */
function findLeaderboard(data: LeaderboardData, query: string): Leaderboard | undefined {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Search raids first
  let result = data.raids.find(
    (lb) =>
      lb.slug.toLowerCase() === normalizedQuery ||
      lb.activity
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .includes(normalizedQuery)
  );

  if (!result) {
    // Search dungeons
    result = data.dungeons.find(
      (lb) =>
        lb.slug.toLowerCase() === normalizedQuery ||
        lb.activity
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .includes(normalizedQuery)
    );
  }

  return result;
}

/**
 * Find a player across all leaderboards
 */
function findPlayerInLeaderboards(
  data: LeaderboardData,
  query: string
): Array<{ leaderboard: Leaderboard; entry: LeaderboardEntry; player: LeaderboardPlayer }> {
  const normalizedQuery = query.toLowerCase();
  const results: Array<{
    leaderboard: Leaderboard;
    entry: LeaderboardEntry;
    player: LeaderboardPlayer;
  }> = [];

  const allLeaderboards = [...data.raids, ...data.dungeons];

  for (const leaderboard of allLeaderboards) {
    for (const entry of leaderboard.entries) {
      for (const player of entry.players) {
        if (
          player.bungieName?.toLowerCase().includes(normalizedQuery) ||
          player.displayName?.toLowerCase().includes(normalizedQuery) ||
          player.membershipId === query
        ) {
          results.push({ leaderboard, entry, player });
        }
      }
    }
  }

  return results;
}

/**
 * Format time string nicely
 */
function formatTime(time: string | undefined): string {
  return time || 'Unknown';
}

/**
 * Get platform name from membership type
 */
function getPlatformName(membershipType: number): string {
  switch (membershipType) {
    case 1:
      return 'Xbox';
    case 2:
      return 'PlayStation';
    case 3:
      return 'Steam';
    case 5:
      return 'Stadia';
    case 6:
      return 'Epic';
    default:
      return 'Unknown';
  }
}

/**
 * Register leaderboard tools with the MCP server
 */
export function registerLeaderboardTools(server: McpServer): void {
  // Tool: List all available leaderboards
  server.tool(
    'list_leaderboards',
    "List all available World's First contest leaderboards for raids and dungeons",
    {},
    async () => {
      try {
        const data = await loadLeaderboardData();

        const raidList = data.raids
          .map((lb) => `- **${lb.activity}** (${lb.entries.length} entries)`)
          .join('\n');

        const dungeonList = data.dungeons
          .map((lb) => `- **${lb.activity}** (${lb.entries.length} entries)`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `# World's First Leaderboards\n\n## Raids (${data.raids.length})\n${raidList}\n\n## Dungeons (${data.dungeons.length})\n${dungeonList}\n\n*Data scraped from raid.report and dungeon.report*`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error loading leaderboards: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get leaderboard for specific activity
  server.tool(
    'get_leaderboard',
    "Get the World's First contest leaderboard for a specific raid or dungeon. Returns top 100 completions with player details.",
    {
      activity: z
        .string()
        .describe('Activity name or slug (e.g., "salvationsedge", "Salvation\'s Edge", "duality")'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of entries to return (default: 10)'),
    },
    async ({ activity, limit = 10 }) => {
      try {
        const data = await loadLeaderboardData();
        const leaderboard = findLeaderboard(data, activity);

        if (!leaderboard) {
          const allActivities = [...data.raids, ...data.dungeons]
            .map((lb) => lb.activity)
            .join(', ');
          return {
            content: [
              {
                type: 'text',
                text: `Activity "${activity}" not found. Available activities: ${allActivities}`,
              },
            ],
          };
        }

        const entries = leaderboard.entries.slice(0, limit);
        const entryList = entries
          .map((e) => {
            const playerNames = e.players.map((p) => p.bungieName).join(', ') || 'Unknown players';
            return `**#${e.rank}** - ${formatTime(e.time)}\n   Players: ${playerNames}\n   PGCR: ${e.pgcrId}`;
          })
          .join('\n\n');

        const summary = leaderboard.summary;
        const summaryText = summary
          ? `\n## Summary\n- Teams in 24h: ${summary.teamsIn24Hours}\n- Teams in 48h: ${summary.teamsIn48Hours}\n- World's First: ${formatTime(summary.worldsFirst?.time)}`
          : '';

        return {
          content: [
            {
              type: 'text',
              text: `# ${leaderboard.activity} - World's First Leaderboard\n\n${summaryText}\n\n## Top ${entries.length} Entries\n\n${entryList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting leaderboard: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Search for a player in leaderboards
  server.tool(
    'search_leaderboard_player',
    "Search for a player across all World's First leaderboards to find their contest completions",
    {
      player: z
        .string()
        .describe('Player name, Bungie name (e.g., "Player#1234"), or membership ID'),
    },
    async ({ player }) => {
      try {
        const data = await loadLeaderboardData();
        const results = findPlayerInLeaderboards(data, player);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No World's First contest completions found for "${player}"`,
              },
            ],
          };
        }

        // Try to get elite tier for the first matching player
        const eliteTier = await getEliteTierForPlayer(results[0].player.membershipId);
        const eliteTierText = eliteTier ? `\n**PvE ${eliteTier}**` : '';

        // Group by player (in case multiple matches)
        const playerResults = results.map((r) => {
          return `**${r.leaderboard.activity}** - Rank #${r.entry.rank}\n   Time: ${formatTime(r.entry.time)}\n   Player: ${r.player.bungieName} (${getPlatformName(r.player.membershipType)})\n   PGCR: ${r.entry.pgcrId}`;
        });

        return {
          content: [
            {
              type: 'text',
              text: `# World's First Completions for "${player}"${eliteTierText}\n\nFound ${results.length} contest completion(s):\n\n${playerResults.join('\n\n')}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching player: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Filter leaderboard entries by activity, rank, or player name
  server.tool(
    'filter_leaderboard_entries',
    'Filter leaderboard entries by activity name (partial), rank range, or partial player name. All filters are optional and case-insensitive.',
    {
      activity: z.string().optional().describe('Activity name (partial match, e.g., "Last Wish")'),
      minRank: z.number().optional().describe('Minimum rank (inclusive)'),
      maxRank: z.number().optional().describe('Maximum rank (inclusive)'),
      player: z.string().optional().describe('Player name (partial match, e.g., "Datto")'),
    },
    async ({ activity, minRank, maxRank, player }) => {
      const data = await loadLeaderboardData();
      const allLeaderboards = [...data.raids, ...data.dungeons];
      const entries: LeaderboardEntry[] = [];
      for (const lb of allLeaderboards) {
        // Filter by activity if provided
        if (activity && !lb.activity.toLowerCase().includes(activity.toLowerCase())) continue;
        for (const entry of lb.entries) {
          // Filter by rank
          if (typeof minRank === 'number' && entry.rank < minRank) continue;
          if (typeof maxRank === 'number' && entry.rank > maxRank) continue;
          // Filter by player name
          if (player) {
            const match = entry.players.some(
              (p) =>
                p.bungieName?.toLowerCase().includes(player.toLowerCase()) ||
                p.displayName?.toLowerCase().includes(player.toLowerCase())
            );
            if (!match) continue;
          }
          entries.push(entry);
        }
      }
      if (entries.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No leaderboard entries found for the given filters.',
            },
          ],
        };
      }
      // Summarize results for text output
      const summary = entries
        .slice(0, 10)
        .map((e) => {
          const playerNames = e.players.map((p) => p.bungieName).join(', ') || 'Unknown players';
          return `#${e.rank} - ${playerNames} (${e.time})`;
        })
        .join('\n');
      return {
        content: [
          {
            type: 'text',
            text: `Found ${entries.length} leaderboard entries.\n\nFirst 10 results:\n${summary}`,
          },
        ],
      };
    }
  );
  server.tool(
    'get_worlds_first',
    "Get the World's First completion details for a specific raid or dungeon",
    {
      activity: z
        .string()
        .describe('Activity name or slug (e.g., "salvationsedge", "Salvation\'s Edge", "duality")'),
    },
    async ({ activity }) => {
      try {
        const data = await loadLeaderboardData();
        const leaderboard = findLeaderboard(data, activity);

        if (!leaderboard) {
          return {
            content: [
              {
                type: 'text',
                text: `Activity "${activity}" not found`,
              },
            ],
          };
        }

        const wf = leaderboard.entries[0];
        if (!wf) {
          return {
            content: [
              {
                type: 'text',
                text: `No World's First data available for ${leaderboard.activity}`,
              },
            ],
          };
        }

        const players = wf.players
          .map(
            (p) =>
              `- **${p.bungieName}** (${getPlatformName(p.membershipType)}, ${p.characterClass})`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `# 🏆 World's First: ${leaderboard.activity}\n\n**Completion Time:** ${formatTime(wf.time)}\n**PGCR:** ${wf.pgcrId}\n\n## Team\n${players || 'Player details not available'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting World's First: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get PGCR details for a leaderboard entry
  server.tool(
    'get_leaderboard_pgcr',
    'Get detailed PGCR (Post-Game Carnage Report) information for a leaderboard entry',
    {
      activity: z.string().describe('Activity name or slug'),
      rank: z.number().int().min(1).max(100).describe('Rank position (1-100)'),
    },
    async ({ activity, rank }) => {
      try {
        const data = await loadLeaderboardData();
        const leaderboard = findLeaderboard(data, activity);

        if (!leaderboard) {
          return {
            content: [
              {
                type: 'text',
                text: `Activity "${activity}" not found`,
              },
            ],
          };
        }

        const entry = leaderboard.entries.find((e) => e.rank === rank);
        if (!entry) {
          return {
            content: [
              {
                type: 'text',
                text: `No entry found at rank ${rank} for ${leaderboard.activity}`,
              },
            ],
          };
        }

        const players = entry.players
          .map((p) => {
            const kda = p.deaths > 0 ? ((p.kills + p.assists) / p.deaths).toFixed(2) : 'Perfect';
            return `- **${p.bungieName}** (${p.characterClass})\n  Platform: ${getPlatformName(p.membershipType)}\n  K/D/A: ${p.kills}/${p.deaths}/${p.assists} (${kda})\n  Time Played: ${Math.floor(p.timePlayedSeconds / 60)}m\n  Membership ID: ${p.membershipId}`;
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `# ${leaderboard.activity} - Rank #${entry.rank}\n\n**Completion Time:** ${formatTime(entry.time)}\n**PGCR ID:** ${entry.pgcrId}\n**Date:** ${entry.period || 'Unknown'}\n\n## Player Details\n\n${players || 'Player details not available (data not enriched)'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting PGCR details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Compare players across leaderboards
  server.tool(
    'compare_leaderboard_players',
    "Compare two players' World's First contest achievements",
    {
      player1: z.string().describe('First player name or Bungie name'),
      player2: z.string().describe('Second player name or Bungie name'),
    },
    async ({ player1, player2 }) => {
      try {
        const data = await loadLeaderboardData();
        const results1 = findPlayerInLeaderboards(data, player1);
        const results2 = findPlayerInLeaderboards(data, player2);

        const format = (results: typeof results1, name: string) => {
          if (results.length === 0) return `**${name}**: No contest completions found`;
          const completions = results
            .map(
              (r) =>
                `- ${r.leaderboard.activity}: Rank #${r.entry.rank} (${formatTime(r.entry.time)})`
            )
            .join('\n');
          return `**${name}** (${results.length} completions):\n${completions}`;
        };

        return {
          content: [
            {
              type: 'text',
              text: `# World's First Comparison\n\n${format(results1, player1)}\n\n${format(results2, player2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error comparing players: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Get leaderboard statistics
  server.tool(
    'get_leaderboard_stats',
    "Get aggregate statistics across all World's First leaderboards",
    {},
    async () => {
      try {
        const data = await loadLeaderboardData();

        // Count unique players
        const playerSet = new Set<string>();
        const allLeaderboards = [...data.raids, ...data.dungeons];

        for (const lb of allLeaderboards) {
          for (const entry of lb.entries) {
            for (const player of entry.players) {
              if (player.membershipId) {
                playerSet.add(player.membershipId);
              }
            }
          }
        }

        // Find most decorated players
        const playerCounts = new Map<string, { name: string; count: number }>();
        for (const lb of allLeaderboards) {
          for (const entry of lb.entries) {
            for (const player of entry.players) {
              if (player.membershipId) {
                const existing = playerCounts.get(player.membershipId);
                if (existing) {
                  existing.count++;
                } else {
                  playerCounts.set(player.membershipId, { name: player.bungieName, count: 1 });
                }
              }
            }
          }
        }

        const topPlayers = Array.from(playerCounts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map((p, i) => `${i + 1}. **${p.name}** - ${p.count} contest completions`)
          .join('\n');

        const totalEntries = allLeaderboards.reduce((sum, lb) => sum + lb.entries.length, 0);
        const enrichedEntries = allLeaderboards.reduce(
          (sum, lb) => sum + lb.entries.filter((e) => e.enriched).length,
          0
        );

        return {
          content: [
            {
              type: 'text',
              text: `# World's First Leaderboard Statistics\n\n## Overview\n- **Total Raids:** ${data.raids.length}\n- **Total Dungeons:** ${data.dungeons.length}\n- **Total Entries:** ${totalEntries}\n- **Enriched Entries:** ${enrichedEntries}\n- **Unique Players:** ${playerSet.size}\n\n## Most Contest Completions\n${topPlayers}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
