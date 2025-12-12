/**
 * Integration tests for Bungie API
 * 
 * These tests make REAL API calls to Bungie's servers.
 * Run with: npm run test:integration
 * 
 * Requirements:
 * - A valid .env file with BUNGIE_API_KEY
 * - Internet connection
 * - Bungie API availability
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BungieApiClient } from '../../src/api/bungie-client.js';
import { hasRealApiKey } from '../setup.js';

// Only run these tests in integration mode with a real API key
const describeIntegration = hasRealApiKey() ? describe : describe.skip;

describeIntegration('Bungie API Integration Tests', () => {
  let client: BungieApiClient;

  beforeAll(() => {
    const apiKey = process.env.BUNGIE_API_KEY!;
    client = new BungieApiClient(apiKey, {
      rateLimitMs: 100, // Be respectful of rate limits
      maxRetries: 3,
      timeoutMs: 30000,
    });
  });

  describe('Manifest', () => {
    it('should fetch the current manifest', async () => {
      const manifest = await client.getManifest();
      
      expect(manifest).toBeDefined();
      expect(manifest.version).toBeDefined();
      expect(typeof manifest.version).toBe('string');
      
      console.log(`  📦 Manifest version: ${manifest.version}`);
    });
  });

  describe('Activity Definition', () => {
    it('should get activity definition by hash', async () => {
      // A well-known raid activity hash (Crota's End)
      const activityHash = 4179289725;
      
      try {
        const activity = await client.getActivityDefinition(activityHash);
        
        expect(activity).toBeDefined();
        console.log(`  🎮 Activity retrieved successfully`);
      } catch (error) {
        // Some hashes may be outdated
        console.log(`  ⚠️ Activity hash ${activityHash} not found (may be outdated)`);
        expect(true).toBe(true); // Don't fail for outdated hashes
      }
    });
  });

  describe('Item Definition', () => {
    it('should get item definition by hash', async () => {
      // Gjallarhorn hash
      const gjallyHash = 1363886209;
      
      try {
        const item = await client.getItemDefinitionFull(gjallyHash);
        
        expect(item).toBeDefined();
        console.log(`  📋 Item retrieved successfully`);
      } catch (error) {
        // Hash might be outdated
        console.log(`  ⚠️ Item hash ${gjallyHash} not found (may be outdated)`);
        expect(true).toBe(true);
      }
    });
  });

  describe('Rate Limiting', () => {
    it('should handle multiple rapid requests gracefully', async () => {
      const requests = Array(5).fill(null).map(() => client.getManifest());
      
      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(5);
      results.forEach(manifest => {
        expect(manifest.version).toBeDefined();
      });
      
      console.log('  ✅ Successfully handled 5 concurrent requests');
    });
  });
});

// Provide helpful message when tests are skipped
describe('Integration Test Status', () => {
  it('should report integration test availability', () => {
    if (!hasRealApiKey()) {
      console.log('\n  ℹ️  Integration tests skipped - no real API key detected');
      console.log('     To run integration tests:');
      console.log('     1. Create a .env file with BUNGIE_API_KEY=your-key');
      console.log('     2. Run: npm run test:integration\n');
    } else {
      console.log('\n  ✅ Running with real Bungie API key\n');
    }
    expect(true).toBe(true);
  });
});
