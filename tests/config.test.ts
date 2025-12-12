/**
 * Unit tests for configuration module
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateConfig,
  loadConfig,
  isValidApiKeyFormat,
  getConfigHelp,
  clearConfigCache,
} from '../src/config.js';

describe('Config Module', () => {
  beforeEach(() => {
    clearConfigCache();
  });

  describe('validateConfig', () => {
    it('should validate a complete valid config', () => {
      const env = {
        BUNGIE_API_KEY: 'abcdef1234567890abcdef1234567890',
        LOG_LEVEL: 'info',
        NODE_ENV: 'production',
        CACHE_TTL_HOURS: '24',
        CACHE_MAX_SIZE_MB: '100',
        API_RATE_LIMIT_MS: '150',
        API_MAX_RETRIES: '3',
        API_TIMEOUT_MS: '30000',
      };

      const result = validateConfig(env);
      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config!.BUNGIE_API_KEY).toBe('abcdef1234567890abcdef1234567890');
      expect(result.config!.LOG_LEVEL).toBe('info');
    });

    it('should use defaults for optional values', () => {
      const env = {
        BUNGIE_API_KEY: 'abcdef1234567890abcdef1234567890',
      };

      const result = validateConfig(env);
      expect(result.success).toBe(true);
      expect(result.config!.LOG_LEVEL).toBe('info');
      expect(result.config!.CACHE_TTL_HOURS).toBe(24);
      expect(result.config!.API_MAX_RETRIES).toBe(3);
    });

    it('should fail when BUNGIE_API_KEY is missing', () => {
      const env = {
        LOG_LEVEL: 'info',
      };

      const result = validateConfig(env);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.path === 'BUNGIE_API_KEY')).toBe(true);
    });

    it('should fail when BUNGIE_API_KEY format is invalid', () => {
      const env = {
        BUNGIE_API_KEY: 'invalid-key',
      };

      const result = validateConfig(env);
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.path === 'BUNGIE_API_KEY')).toBe(true);
    });

    it('should fail when LOG_LEVEL is invalid', () => {
      const env = {
        BUNGIE_API_KEY: 'abcdef1234567890abcdef1234567890',
        LOG_LEVEL: 'invalid',
      };

      const result = validateConfig(env);
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.path === 'LOG_LEVEL')).toBe(true);
    });

    it('should validate CACHE_TTL_HOURS range', () => {
      const envTooLow = {
        BUNGIE_API_KEY: 'abcdef1234567890abcdef1234567890',
        CACHE_TTL_HOURS: '0',
      };

      const resultLow = validateConfig(envTooLow);
      expect(resultLow.success).toBe(false);

      const envTooHigh = {
        BUNGIE_API_KEY: 'abcdef1234567890abcdef1234567890',
        CACHE_TTL_HOURS: '200',
      };

      const resultHigh = validateConfig(envTooHigh);
      expect(resultHigh.success).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('should return config when valid', () => {
      const env = {
        BUNGIE_API_KEY: 'abcdef1234567890abcdef1234567890',
      };

      const config = loadConfig(env);
      expect(config.BUNGIE_API_KEY).toBe('abcdef1234567890abcdef1234567890');
    });

    it('should throw when invalid', () => {
      const env = {
        LOG_LEVEL: 'info', // Missing API key
      };

      expect(() => loadConfig(env)).toThrow('Configuration validation failed');
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('should accept valid 32-character hex strings', () => {
      expect(isValidApiKeyFormat('abcdef1234567890abcdef1234567890')).toBe(true);
      expect(isValidApiKeyFormat('ABCDEF1234567890ABCDEF1234567890')).toBe(true);
    });

    it('should accept longer alphanumeric strings (future-proofing)', () => {
      expect(isValidApiKeyFormat('abcdefghijklmnop1234567890')).toBe(true);
    });

    it('should reject short strings', () => {
      expect(isValidApiKeyFormat('short')).toBe(false);
      expect(isValidApiKeyFormat('1234567890')).toBe(false);
    });

    it('should reject strings with special characters', () => {
      expect(isValidApiKeyFormat('abc-def-123-456-abc-def-123-456!')).toBe(false);
    });
  });

  describe('getConfigHelp', () => {
    it('should return help text with all variables documented', () => {
      const help = getConfigHelp();
      expect(help).toContain('BUNGIE_API_KEY');
      expect(help).toContain('LOG_LEVEL');
      expect(help).toContain('CACHE_TTL_HOURS');
      expect(help).toContain('API_RATE_LIMIT_MS');
      expect(help).toContain('https://www.bungie.net/en/Application');
    });
  });
});
