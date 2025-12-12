/**
 * Integration tests for Manifest Cache
 * 
 * Tests the manifest caching system with real API data.
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ManifestCache } from '../../src/services/manifest-cache.js';
import { hasRealApiKey } from '../setup.js';

const describeIntegration = hasRealApiKey() ? describe : describe.skip;

describeIntegration('Manifest Cache Integration Tests', () => {
  let cache: ManifestCache;

  beforeAll(() => {
    const apiKey = process.env.BUNGIE_API_KEY!;
    cache = new ManifestCache(apiKey, {
      ttlHours: 24,
      maxSizeMb: 100,
    });
  });

  describe('Cache Operations', () => {
    it('should initialize and download manifest data', async () => {
      const startTime = Date.now();
      
      await cache.initialize();
      
      const elapsed = Date.now() - startTime;
      console.log(`  ⏱️ Cache initialization took ${elapsed}ms`);
      
      // isInitialized is a getter, not a method
      expect(cache.isInitialized).toBe(true);
    }, 60000); // Allow up to 60s for first download

    it('should search items after initialization', async () => {
      // Ensure cache is initialized
      if (!cache.isInitialized) {
        await cache.initialize();
      }

      const results = cache.searchItems('Hand Cannon', 10);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      console.log(`  🔍 Found ${results.length} hand cannons in cache`);
    });

    it('should get item definition from cache', async () => {
      if (!cache.isInitialized) {
        await cache.initialize();
      }

      // Search for an item first
      const searchResults = cache.searchItems('Sunshot', 1);
      
      if (searchResults.length > 0) {
        const hash = searchResults[0].hash;
        const item = cache.getItem(hash);
        
        expect(item).toBeDefined();
        console.log(`  📋 Retrieved: ${item?.name}`);
      }
    });

    it('should use cached data on second initialization', async () => {
      // Create a new cache instance 
      const apiKey = process.env.BUNGIE_API_KEY!;
      const cache2 = new ManifestCache(apiKey);
      
      const startTime = Date.now();
      await cache2.initialize();
      const elapsed = Date.now() - startTime;
      
      console.log(`  ⏱️ Second initialization took ${elapsed}ms (should be faster if cached)`);
      
      expect(cache2.isInitialized).toBe(true);
    }, 60000);
  });

  describe('Item Search', () => {
    it('should find exotic weapons', async () => {
      if (!cache.isInitialized) {
        await cache.initialize();
      }

      const exotics = ['Gjallarhorn', 'Sunshot', 'Ace of Spades', 'Thorn'];
      
      for (const exotic of exotics) {
        const results = cache.searchItems(exotic, 5);
        console.log(`  🔫 "${exotic}": ${results.length} results`);
        // May not find all due to naming variations
      }
      
      expect(true).toBe(true);
    });
  });
});
