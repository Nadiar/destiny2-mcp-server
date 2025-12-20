import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RaidHubClient, RaidHubApiError } from '../src/api/raidhub-client.js';

describe('RaidHubClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch manifest and return response', async () => {
    const fakeResponse = {
      minted: '2025-01-01T00:00:00Z',
      success: true,
      response: { hashes: {} },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => fakeResponse,
      })
    );

    const client = new RaidHubClient('key123');
    const manifest = await client.getManifest();
    expect(manifest).toEqual({ hashes: {} });
    expect((fetch as unknown as vi.Mock).mock.calls[0][0]).toContain('/manifest');
    // header was provided
    expect((fetch as unknown as vi.Mock).mock.calls[0][1].headers['x-api-key']).toBe('key123');
  });

  it('should throw RaidHubApiError on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'boom',
      })
    );
    const client = new RaidHubClient('key123');
    await expect(client.getManifest()).rejects.toThrow(RaidHubApiError);
  });
});
