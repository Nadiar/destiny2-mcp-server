/**
 * Vitest global setup file
 * Sets up mocks and test environment
 *
 * For unit tests: Uses fake API key (default)
 * For integration tests: Set INTEGRATION_TEST=true to load .env
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { config } from 'dotenv';
import { resolve } from 'path';

// Check if we're running integration tests
const isIntegrationTest = process.env.INTEGRATION_TEST === 'true';

// Load .env immediately for integration tests (before test files import)
// This ensures hasRealApiKey() works at module evaluation time
let hasValidApiKey = false;

if (isIntegrationTest) {
  const envPath = resolve(process.cwd(), '.env');
  const result = config({ path: envPath });

  if (
    !result.error &&
    process.env.BUNGIE_API_KEY &&
    process.env.BUNGIE_API_KEY !== 'test1234567890abcdef1234567890ab'
  ) {
    hasValidApiKey = true;
    console.log('\n✅ Integration test mode: Using real API key from .env\n');
  } else {
    console.warn(
      '\n⚠️  Integration test mode enabled but .env file not found or BUNGIE_API_KEY not set.'
    );
    console.warn('   Create a .env file with your real BUNGIE_API_KEY to run integration tests.');
    console.warn('   Falling back to mock API key.\n');
    process.env.BUNGIE_API_KEY = 'test1234567890abcdef1234567890ab';
  }
} else {
  // Use fake API key for unit tests
  process.env.BUNGIE_API_KEY = 'test1234567890abcdef1234567890ab';
}

// Set common test environment variables
process.env.LOG_LEVEL = 'error'; // Reduce noise during tests
process.env.NODE_ENV = 'test';

// beforeAll is still useful for any per-file setup
beforeAll(() => {
  // Environment is already configured above
});

afterEach(() => {
  // Clear all mocks between tests
  vi.clearAllMocks();
});

afterAll(() => {
  // Cleanup
  vi.restoreAllMocks();
});

/**
 * Helper to check if we have a real API key for integration tests
 */
export function hasRealApiKey(): boolean {
  return isIntegrationTest && hasValidApiKey;
}

/**
 * Helper to skip integration tests when no real API key is available
 */
export function skipIfNoApiKey(testFn: () => void | Promise<void>) {
  if (!hasRealApiKey()) {
    console.log('  ⏭️  Skipped: No real API key available');
    return;
  }
  return testFn();
}
