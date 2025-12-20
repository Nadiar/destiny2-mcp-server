import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerRaidHubTools } from '../src/tools/raidhub-tools.js';

describe('raidhub tools registration', () => {
  let handlers: Record<string, Function> = {};
  const mockServer = {
    tool: (name: string, desc: string, schema: any, handler: Function) => {
      handlers[name] = handler;
    },
  } as any;

  beforeEach(() => {
    handlers = {};
    vi.restoreAllMocks();
  });

  it('registers expected tools and their handlers work', async () => {
    const mockClient = {
      getManifest: vi.fn().mockResolvedValue({ foo: 'bar' }),
      playerSearch: vi.fn().mockResolvedValue({ results: [] }),
      getPgcr: vi.fn().mockResolvedValue({ pgcr: true }),
      getContestLeaderboard: vi.fn().mockResolvedValue({ entries: [] }),
      getTeamFirstLeaderboard: vi.fn().mockResolvedValue({ entries: [] }),
    } as any;

    registerRaidHubTools(mockServer, mockClient);

    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining([
        'raidhub_manifest',
        'raidhub_player_search',
        'raidhub_get_pgcr',
        'raidhub_contest_leaderboard',
        'raidhub_team_first',
      ])
    );

    const manifestRes = await handlers['raidhub_manifest']({});
    expect(manifestRes.content[0].json).toEqual({ foo: 'bar' });

    const searchRes = await handlers['raidhub_player_search']({ query: 'datto' });
    expect(searchRes.content[0].json).toEqual({ results: [] });

    const pgcrRes = await handlers['raidhub_get_pgcr']({ instanceId: '123' });
    expect(pgcrRes.content[0].json).toEqual({ pgcr: true });

    const contestRes = await handlers['raidhub_contest_leaderboard']({ raid: 'salvation-edge' });
    expect(contestRes.content[0].json).toEqual({ entries: [] });

    const teamFirstRes = await handlers['raidhub_team_first']({ activity: 'act', version: 'v1' });
    expect(teamFirstRes.content[0].json).toEqual({ entries: [] });
  });
});
