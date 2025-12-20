import { describe, it, expect, vi, beforeEach } from 'vitest';
import { raidhubCache } from '../src/services/raidhub-cache.js';
import { registerRaidHubTools } from '../src/tools/raidhub-tools.js';

describe('raidhub public leaderboard tool', () => {
  let handlers: Record<string, Function> = {};
  const mockServer = {
    tool: (name: string, desc: string, schema: any, handler: Function) => {
      handlers[name] = handler;
    },
  } as any;

  beforeEach(async () => {
    handlers = {};
    vi.restoreAllMocks();
    await raidhubCache.clear();
  });

  it('returns helpful error when no cache and no client', async () => {
    registerRaidHubTools(mockServer, undefined);
    expect(Object.keys(handlers)).toContain('raidhub_public_leaderboard');

    const res = await handlers['raidhub_public_leaderboard']({
      kind: 'contest',
      raid: 'salvation-edge',
    });
    // Some servers may not include an isError flag; ensure the response contains the expected helpful message
    expect(res.content[0].text).toContain('Leaderboard not available');
  });

  it('returns cached result when present and no client', async () => {
    // Seed cache
    await raidhubCache.set('contest:salvation-edge', { entries: [{ team: 'a' }] });

    registerRaidHubTools(mockServer, undefined);
    const res = await handlers['raidhub_public_leaderboard']({
      kind: 'contest',
      raid: 'salvation-edge',
    });
    expect(res.content[0].json).toEqual({ entries: [{ team: 'a' }] });
  });

  it('fetches live when client provided and updates cache', async () => {
    const mockClient: any = {
      getContestLeaderboard: vi.fn().mockResolvedValue({ entries: [{ team: 'live' }] }),
    };

    registerRaidHubTools(mockServer, mockClient);

    const res = await handlers['raidhub_public_leaderboard']({
      kind: 'contest',
      raid: 'salvation-edge',
    });
    expect(res.content[0].json).toEqual({ entries: [{ team: 'live' }] });

    const cached = await raidhubCache.get('contest:salvation-edge');
    expect(cached?.payload).toEqual({ entries: [{ team: 'live' }] });
  });
});
