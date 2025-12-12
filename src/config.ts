/**
 * Configuration management with zod validation
 * Centralizes all environment variables and provides type-safe access
 */
import { z } from 'zod';

/**
 * Helper to create a numeric env var schema with string default
 */
const numericEnvVar = (min: number, max: number, defaultVal: string) =>
  z
    .string()
    .default(defaultVal)
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(min).max(max));

/**
 * Environment variable schema with validation
 */
const EnvSchema = z.object({
  // Required
  BUNGIE_API_KEY: z
    .string()
    .min(1, 'BUNGIE_API_KEY is required')
    .regex(/^[a-f0-9]{32}$/i, 'BUNGIE_API_KEY must be a 32 character hex string')
    .describe('Bungie API key from https://www.bungie.net/en/Application'),

  // Optional with defaults
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info').describe('Logging level'),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development')
    .describe('Node environment'),

  // Cache configuration
  CACHE_TTL_HOURS: numericEnvVar(1, 168, '24') // 1 hour to 1 week
    .describe('Manifest cache TTL in hours'),

  CACHE_MAX_SIZE_MB: numericEnvVar(50, 500, '100').describe('Maximum cache size in megabytes'),

  // API configuration
  API_RATE_LIMIT_MS: numericEnvVar(50, 1000, '150').describe(
    'Minimum milliseconds between API requests'
  ),

  API_MAX_RETRIES: numericEnvVar(0, 5, '3').describe('Maximum number of API retry attempts'),

  API_TIMEOUT_MS: numericEnvVar(5000, 60000, '30000').describe(
    'API request timeout in milliseconds'
  ),
});

/**
 * Configuration type derived from schema
 */
export type Config = z.infer<typeof EnvSchema>;

/**
 * Validation result type
 */
export interface ConfigValidationResult {
  success: boolean;
  config?: Config;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validates environment variables and returns typed config
 * @param env - Environment variables (defaults to process.env)
 * @returns Validation result with config or errors
 */
export function validateConfig(
  env: Record<string, string | undefined> = process.env
): ConfigValidationResult {
  const result = EnvSchema.safeParse(env);

  if (result.success) {
    return {
      success: true,
      config: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  };
}

/**
 * Loads and validates configuration, throwing on error
 * @param env - Environment variables (defaults to process.env)
 * @returns Validated configuration
 * @throws Error if validation fails
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = validateConfig(env);

  if (!result.success) {
    const errorMessages = result.errors!.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
    throw new Error(`Configuration validation failed:\n${errorMessages}`);
  }

  return result.config!;
}

/**
 * Checks if API key format is valid (more lenient for future format changes)
 */
export function isValidApiKeyFormat(key: string): boolean {
  // Standard format: 32 hex characters
  if (/^[a-f0-9]{32}$/i.test(key)) {
    return true;
  }
  // Allow other formats with warning (Bungie might change format)
  // At least 16 characters, alphanumeric
  if (/^[a-zA-Z0-9]{16,}$/.test(key)) {
    return true;
  }
  return false;
}

/**
 * Generates a help message for configuration
 */
export function getConfigHelp(): string {
  return `
Destiny 2 MCP Server Configuration
==================================

Required Environment Variables:
  BUNGIE_API_KEY    Your Bungie API key (32 hex characters)
                    Get one at: https://www.bungie.net/en/Application

Optional Environment Variables:
  LOG_LEVEL         Logging level: debug, info, warn, error (default: info)
  NODE_ENV          Environment: development, production, test (default: development)
  CACHE_TTL_HOURS   Manifest cache TTL in hours (default: 24, range: 1-168)
  CACHE_MAX_SIZE_MB Maximum cache size in MB (default: 100, range: 50-500)
  API_RATE_LIMIT_MS Minimum ms between API requests (default: 150, range: 50-1000)
  API_MAX_RETRIES   Max API retry attempts (default: 3, range: 0-5)
  API_TIMEOUT_MS    API request timeout in ms (default: 30000, range: 5000-60000)

Example .env file:
  BUNGIE_API_KEY=your32characterhexkeyhere12345678
  LOG_LEVEL=info
  CACHE_TTL_HOURS=24
`.trim();
}

// Cached config instance (singleton)
let cachedConfig: Config | null = null;

/**
 * Gets the current configuration (lazy loaded and cached)
 * @returns Validated configuration
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Clears the cached configuration (useful for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
}

export default { loadConfig, validateConfig, getConfig, getConfigHelp };
