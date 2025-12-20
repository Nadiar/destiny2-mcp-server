import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { RaidHubClient } from '../api/raidhub-client.js';

import { raidhubCache } from '../services/raidhub-cache.js';

export function registerRaidHubTools(server: McpServer, client?: RaidHubClient): void {
  // Public tool: always register. Serves cached results when client/key not present.
  server.tool(
    'raidhub_public_leaderboard',
    'Get contest/team-first/global leaderboards. Returns cached results if RaidHub API key is not configured.',
    {
      kind: z
        .enum(['contest', 'team_first', 'raid', 'global', 'clan'])
        .describe('Type of leaderboard to fetch'),
      raid: z.string().optional().describe('Raid id/slug (for contest/raid kinds)'),
      activity: z.string().optional().describe('Activity id/slug (for team_first)'),
      version: z.string().optional().describe('Version id (for team_first)'),
      category: z
        .string()
        .optional()
        .describe('Category for global/raid leaderboards (e.g. clears)'),
      page: z.number().optional().describe('Page number'),
      count: z.number().optional().describe('Items per page'),
      forceLive: z
        .boolean()
        .optional()
        .describe('If true, attempt to fetch live data (requires RAIDHUB_API_KEY)'),
    },
    async ({
      kind,
      raid,
      activity,
      version,
      category = 'clears',
      page = 1,
      count = 50,
      forceLive = false,
    }) => {
      const key = (() => {
        switch (kind) {
          case 'contest':
            return `contest:${raid}`;
          case 'team_first':
            return `team_first:${activity}:${version}`;
          case 'raid':
            return `raid:${raid}:${category}`;
          case 'global':
            return `global:${category}`;
          case 'clan':
            return `clan`;
          default:
            return `unknown`;
        }
      })();

      // Try cache first
      const cached = await raidhubCache.get(key);

      // If we have a client, always attempt a live fetch (live-first). On failure, fall back to cache if available.
      if (client) {
        try {
          let payload: unknown;
          if (kind === 'contest' && raid) {
            payload = await client.getContestLeaderboard(raid, page, count);
          } else if (kind === 'team_first' && activity && version) {
            payload = await client.getTeamFirstLeaderboard(activity, version, page, count);
          } else if (kind === 'raid' && raid) {
            payload = await client.getRaidLeaderboard(raid, category, page, count);
          } else if (kind === 'global') {
            payload = await client.getGlobalLeaderboard(category, page, count);
          } else if (kind === 'clan') {
            payload = await client.getClanLeaderboard(page, count);
          } else {
            return {
              content: [{ type: 'text', text: 'Invalid parameters for leaderboard request' }],
              isError: true,
            };
          }

          // Store in cache and return
          await raidhubCache.set(key, payload);
          return { content: [{ type: 'json', json: payload }] };
        } catch (e) {
          // If fetch failed but we have cache, return it with a warning
          if (cached) {
            return {
              content: [
                { type: 'json', json: cached.payload },
                {
                  type: 'text',
                  text: `Warning: live fetch failed - returning cached result. Error: ${e instanceof Error ? e.message : String(e)}`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: `Error fetching leaderboard: ${e instanceof Error ? e.message : 'Unknown'}`,
              },
            ],
            isError: true,
          };
        }
      }

      // No client: return cached if present
      if (cached) {
        return { content: [{ type: 'json', json: cached.payload }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: 'Leaderboard not available. No cached result and RaidHub integration is not configured on this server. Admins: set USE_RAIDHUB=true and RAIDHUB_API_KEY to enable live leaderboards.',
          },
        ],
        isError: true,
      };
    }
  );

  // If a client is provided (API key present), register extra live-only tools
  if (!client) return;

  server.tool(
    'raidhub_manifest',
    'Get RaidHub manifest (activity definitions, versions, raid lists)',
    {},
    async () => {
      try {
        const manifest = await client.getManifest();
        return {
          content: [{ type: 'json', json: manifest }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching RaidHub manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'raidhub_player_search',
    'Search players via RaidHub by name',
    {
      query: z.string().describe('Search query (Bungie name or platform name)'),
      membershipType: z.number().optional().describe('Platform membershipType (optional)'),
      count: z.number().optional().describe('Number of results (default 20)'),
    },
    async ({ query, membershipType = -1, count = 20 }) => {
      try {
        const res = await client.playerSearch(query, membershipType, count);
        return { content: [{ type: 'json', json: res }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching RaidHub players: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'raidhub_get_pgcr',
    'Get raw PGCR (post-game carnage report) from RaidHub by instanceId (fallback to Bungie PGCR)',
    { instanceId: z.string().describe('Instance ID') },
    async ({ instanceId }) => {
      try {
        const pgcr = await client.getPgcr(instanceId);
        return { content: [{ type: 'json', json: pgcr }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching RaidHub PGCR: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'raidhub_contest_leaderboard',
    'Get contest leaderboard (all teams that completed the contest version) for a raid',
    {
      raid: z.string().describe('Raid identifier (slug or id)'),
      page: z.number().optional().describe('Page number (default 1)'),
      count: z.number().optional().describe('Items per page (default 50)'),
    },
    async ({ raid, page = 1, count = 50 }) => {
      try {
        const board = await client.getContestLeaderboard(raid, page, count);
        // update cache as a side-effect
        await raidhubCache.set(`contest:${raid}`, board);
        return { content: [{ type: 'json', json: board }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching contest leaderboard: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'raidhub_team_first',
    'Get first-completions (team first) leaderboard for an activity+version',
    {
      activity: z.string().describe('Activity identifier/hash'),
      version: z.string().describe('Version id'),
      page: z.number().optional().describe('Page number (default 1)'),
      count: z.number().optional().describe('Items per page (default 50)'),
    },
    async ({ activity, version, page = 1, count = 50 }) => {
      try {
        const board = await client.getTeamFirstLeaderboard(activity, version, page, count);
        await raidhubCache.set(`team_first:${activity}:${version}`, board);
        return { content: [{ type: 'json', json: board }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching team-first leaderboard: ${error instanceof Error ? error.message : 'Unknown'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Useful utility: fall back to RaidHub for PGCR if Bungie fails
}
