/**
 * Unit tests for BungieApiClient
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BungieApiClient, BungieApiError } from '../src/api/bungie-client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BungieApiClient', () => {
  let client: BungieApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new BungieApiClient('test1234567890abcdef1234567890ab');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with valid API key', () => {
      const client = new BungieApiClient('test1234567890abcdef1234567890ab');
      expect(client).toBeDefined();
    });

    it('should throw when API key is empty', () => {
      expect(() => new BungieApiClient('')).toThrow('BUNGIE_API_KEY is required');
    });

    it('should accept custom options', () => {
      const client = new BungieApiClient('test1234567890abcdef1234567890ab', {
        rateLimitMs: 200,
        maxRetries: 5,
        timeoutMs: 60000,
      });
      expect(client).toBeDefined();
    });
  });

  describe('API calls', () => {
    it('should make successful API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: { version: '1.0.0' },
          ErrorCode: 1,
          ErrorStatus: 'Success',
          Message: 'Ok',
        }),
      });

      const result = await client.getManifest();
      expect(result).toEqual({ version: '1.0.0' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include API key in headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: {},
          ErrorCode: 1,
          ErrorStatus: 'Success',
          Message: 'Ok',
        }),
      });

      await client.getManifest();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test1234567890abcdef1234567890ab',
          }),
        })
      );
    });

    it('should retry on 429 rate limit error', async () => {
      // First call returns 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: { success: true },
          ErrorCode: 1,
          ErrorStatus: 'Success',
          Message: 'Ok',
        }),
      });

      const result = await client.getManifest();
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      // First call returns 500
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: { success: true },
          ErrorCode: 1,
          ErrorStatus: 'Success',
          Message: 'Ok',
        }),
      });

      const result = await client.getManifest();
      expect(result).toEqual({ success: true });
    });

    it('should throw after max retries exceeded', async () => {
      // All calls fail
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const clientWithRetries = new BungieApiClient('test1234567890abcdef1234567890ab', {
        maxRetries: 2,
        rateLimitMs: 10, // Speed up test
      });

      await expect(clientWithRetries.getManifest()).rejects.toThrow();
      // Initial + 2 retries = 3 calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle Bungie API error codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: null,
          ErrorCode: 7, // ParameterParseFailure
          ErrorStatus: 'ParameterParseFailure',
          Message: 'Invalid parameter',
        }),
      });

      await expect(client.getManifest()).rejects.toThrow('ParameterParseFailure');
    });

    it('should not leak API key in error messages', async () => {
      // Mock a network error that contains the API key in the error message
      const clientWithKey = new BungieApiClient('test1234567890abcdef1234567890ab', {
        maxRetries: 0, // Disable retries to speed up test
        rateLimitMs: 10,
      });

      mockFetch.mockRejectedValueOnce(
        new Error('Connection failed for test1234567890abcdef1234567890ab')
      );

      try {
        await clientWithKey.getManifest();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).not.toContain('test1234567890abcdef1234567890ab');
        expect((error as Error).message).toContain('***');
      }
    });
  });

  describe('searchPlayer', () => {
    it('should search for player by name', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: {
            searchResults: [
              {
                bungieGlobalDisplayName: 'TestPlayer',
                bungieGlobalDisplayNameCode: 1234,
              },
            ],
          },
          ErrorCode: 1,
          ErrorStatus: 'Success',
          Message: 'Ok',
        }),
      });

      const result = await client.searchPlayer('TestPlayer', 0);
      expect(result.searchResults).toHaveLength(1);
      expect(result.searchResults[0].bungieGlobalDisplayName).toBe('TestPlayer');
    });
  });

  describe('getProfile', () => {
    it('should get player profile with components', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Response: {
            profile: { data: { userInfo: { displayName: 'TestPlayer' } } },
          },
          ErrorCode: 1,
          ErrorStatus: 'Success',
          Message: 'Ok',
        }),
      });

      const result = await client.getProfile(3, '12345');
      expect(result.profile?.data?.userInfo?.displayName).toBe('TestPlayer');
    });
  });
});

describe('BungieApiError', () => {
  it('should create error with status code', () => {
    const error = new BungieApiError('Test error', { statusCode: 500 });
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('BungieApiError');
  });

  it('should mark errors as retryable', () => {
    const retryable = new BungieApiError('Rate limited', { statusCode: 429, retryable: true });
    expect(retryable.retryable).toBe(true);

    const notRetryable = new BungieApiError('Bad request', { statusCode: 400, retryable: false });
    expect(notRetryable.retryable).toBe(false);
  });
});
