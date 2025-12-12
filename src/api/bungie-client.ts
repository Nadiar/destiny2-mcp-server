import type {
  BungieResponse,
  DestinyManifest,
  DestinyProfileResponse,
  DestinyCharacterComponent,
  DestinyActivityHistoryEntry,
  DestinyPostGameCarnageReportData,
  DestinyEntityDefinition,
  UserSearchResponse,
} from '../types/index.js';
import { DestinyComponentType, DestinyActivityModeType } from '../types/index.js';

const BUNGIE_API_BASE = 'https://www.bungie.net/Platform';
const BUNGIE_STATS_BASE = 'https://stats.bungie.net/Platform';

/**
 * Configuration options for BungieApiClient
 */
export interface BungieApiClientOptions {
  /** Minimum milliseconds between requests (default: 150) */
  rateLimitMs?: number;
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Error class for Bungie API errors with retry information
 */
export class BungieApiError extends Error {
  readonly statusCode?: number;
  readonly errorCode?: number;
  readonly errorStatus?: string;
  readonly retryable: boolean;

  constructor(message: string, options?: { statusCode?: number; errorCode?: number; errorStatus?: string; retryable?: boolean }) {
    super(message);
    this.name = 'BungieApiError';
    this.statusCode = options?.statusCode;
    this.errorCode = options?.errorCode;
    this.errorStatus = options?.errorStatus;
    this.retryable = options?.retryable ?? false;
  }
}

export class BungieApiClient {
  private apiKey: string;
  private options: Required<BungieApiClientOptions>;
  
  // Simple per-host rate limiter: max N requests per interval
  private static lastRequestTime = 0;
  private static rateLimitMutex: Promise<void> = Promise.resolve();

  constructor(apiKey: string, options: BungieApiClientOptions = {}) {
    if (!apiKey) {
      throw new Error('BUNGIE_API_KEY is required');
    }
    this.apiKey = apiKey;
    this.options = {
      rateLimitMs: options.rateLimitMs ?? 150,
      maxRetries: options.maxRetries ?? 3,
      timeoutMs: options.timeoutMs ?? 30000,
    };
  }

  /**
   * Calculates exponential backoff delay with jitter
   */
  private getBackoffDelay(attempt: number): number {
    // Base delay: 500ms, exponential: 500, 1000, 2000, 4000...
    const baseDelay = 500;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    // Add jitter (0-25% of delay) to prevent thundering herd
    const jitter = exponentialDelay * Math.random() * 0.25;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Determines if an error is retryable
   */
  private isRetryableError(status: number): boolean {
    // Retry on: rate limit, server errors, gateway errors
    return status === 429 || (status >= 500 && status < 600);
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${BUNGIE_API_BASE}${endpoint}`;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Atomic rate limiting via mutex
        await (BungieApiClient.rateLimitMutex = BungieApiClient.rateLimitMutex.then(async () => {
          const now = Date.now();
          const elapsed = now - BungieApiClient.lastRequestTime;
          const waitMs = Math.max(0, this.options.rateLimitMs - elapsed);
          if (waitMs > 0) {
            await new Promise(r => setTimeout(r, waitMs));
          }
          BungieApiClient.lastRequestTime = Date.now();
        }));

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeoutMs);

        try {
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              'X-API-Key': this.apiKey,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            if (this.isRetryableError(response.status) && attempt < this.options.maxRetries) {
              const delay = this.getBackoffDelay(attempt);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            throw new BungieApiError(
              `Bungie API error: ${response.status} ${response.statusText}`,
              { statusCode: response.status, retryable: this.isRetryableError(response.status) }
            );
          }

          const data = await response.json() as BungieResponse<T>;
          if (data.ErrorCode !== 1) {
            // Some Bungie error codes are retryable
            const retryable = data.ErrorCode === 5 || // SystemDisabled
                             data.ErrorCode === 35 || // ThrottleLimit
                             data.ErrorCode === 36;   // PerEndpointRequestThrottleExceeded
            
            if (retryable && attempt < this.options.maxRetries) {
              const delay = this.getBackoffDelay(attempt);
              await new Promise(r => setTimeout(r, delay));
              continue;
            }
            throw new BungieApiError(
              `Bungie API error: ${data.ErrorStatus} - ${data.Message}`,
              { errorCode: data.ErrorCode, errorStatus: data.ErrorStatus, retryable }
            );
          }
          return data.Response;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err: any) {
        // Handle abort (timeout)
        if (err.name === 'AbortError') {
          lastError = new BungieApiError('Request timed out', { retryable: true });
          if (attempt < this.options.maxRetries) {
            const delay = this.getBackoffDelay(attempt);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        } else if (err instanceof BungieApiError) {
          lastError = err;
          if (!err.retryable || attempt >= this.options.maxRetries) {
            break;
          }
        } else {
          // Network or other error - may be retryable
          lastError = err;
          if (attempt < this.options.maxRetries) {
            const delay = this.getBackoffDelay(attempt);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
      }
    }

    // Sanitize possible leakage of API key in error messages
    const msg = String(lastError?.message || lastError || 'Unknown error');
    const redacted = this.apiKey ? msg.replace(new RegExp(this.apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***') : msg;
    const e = new BungieApiError(redacted);
    throw e;
  }

  async searchPlayer(displayName: string, displayNameCode: number): Promise<UserSearchResponse> {
    return this.fetch<UserSearchResponse>('/User/Search/GlobalName/0/', {
      method: 'POST',
      body: JSON.stringify({
        displayNamePrefix: displayName,
      }),
    });
  }

  async searchPlayerByExactName(
    displayName: string,
    displayNameCode: number,
    membershipType: number = -1
  ): Promise<{ membershipId: string; membershipType: number }[]> {
    const response = await this.fetch<Array<{ membershipId: string; membershipType: number }>>(
      `/Destiny2/SearchDestinyPlayerByBungieName/${membershipType}/`,
      {
        method: 'POST',
        body: JSON.stringify({
          displayName,
          displayNameCode,
        }),
      }
    );
    return response || [];
  }

  async getProfile(
    membershipType: number,
    membershipId: string,
    components: DestinyComponentType[] = [
      DestinyComponentType.Profiles,
      DestinyComponentType.Characters,
      DestinyComponentType.CharacterEquipment,
    ]
  ): Promise<DestinyProfileResponse> {
    const componentStr = components.join(',');
    return this.fetch<DestinyProfileResponse>(
      `/Destiny2/${membershipType}/Profile/${membershipId}/?components=${componentStr}`
    );
  }

  async getCharacter(
    membershipType: number,
    membershipId: string,
    characterId: string,
    components: DestinyComponentType[] = [
      DestinyComponentType.Characters,
      DestinyComponentType.CharacterEquipment,
      DestinyComponentType.CharacterProgressions,
    ]
  ): Promise<{ character?: { data?: DestinyCharacterComponent } }> {
    const componentStr = components.join(',');
    return this.fetch<{ character?: { data?: DestinyCharacterComponent } }>(
      `/Destiny2/${membershipType}/Profile/${membershipId}/Character/${characterId}/?components=${componentStr}`
    );
  }

  async getActivityHistory(
    membershipType: number,
    membershipId: string,
    characterId: string,
    mode: DestinyActivityModeType = DestinyActivityModeType.None,
    count: number = 25,
    page: number = 0
  ): Promise<{ activities?: DestinyActivityHistoryEntry[] }> {
    return this.fetch<{ activities?: DestinyActivityHistoryEntry[] }>(
      `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities/?mode=${mode}&count=${count}&page=${page}`
    );
  }

  async getPostGameCarnageReport(activityId: string): Promise<DestinyPostGameCarnageReportData> {
    return this.fetch<DestinyPostGameCarnageReportData>(
      `${BUNGIE_STATS_BASE}/Destiny2/Stats/PostGameCarnageReport/${activityId}/`
    );
  }

  async getManifest(): Promise<DestinyManifest> {
    return this.fetch<DestinyManifest>('/Destiny2/Manifest/');
  }

  async getEntityDefinition(
    entityType: string,
    hashIdentifier: number
  ): Promise<DestinyEntityDefinition> {
    return this.fetch<DestinyEntityDefinition>(
      `/Destiny2/Manifest/${entityType}/${hashIdentifier}/`
    );
  }

  async getHistoricalStats(
    membershipType: number,
    membershipId: string,
    characterId: string = '0'
  ): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(
      `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/`
    );
  }

  async getLinkedProfiles(
    membershipType: number,
    membershipId: string
  ): Promise<{
    bnetMembership?: {
      membershipId: string;
      displayName: string;
    };
    profiles: Array<{
      membershipType: number;
      membershipId: string;
      dateLastPlayed: string;
      displayName: string;
    }>;
  }> {
    return this.fetch(`/Destiny2/${membershipType}/Profile/${membershipId}/LinkedProfiles/`);
  }

  async searchDestinyEntities(
    searchTerm: string,
    type: string = 'DestinyInventoryItemDefinition',
    page: number = 0
  ): Promise<{
    suggestedWords: string[];
    results: {
      results: Array<{
        hash: number;
        displayProperties: { name: string; description: string; icon?: string };
      }>;
      totalResults: number;
      hasMore: boolean;
    };
  }> {
    return this.fetch(
      `/Destiny2/Armory/Search/${type}/${encodeURIComponent(searchTerm)}/?page=${page}`
    );
  }

  async getItemDefinitionFull(itemHash: number): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(
      `/Destiny2/Manifest/DestinyInventoryItemDefinition/${itemHash}/`
    );
  }

  async getActivityDefinition(activityHash: number): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(
      `/Destiny2/Manifest/DestinyActivityDefinition/${activityHash}/`
    );
  }

  async getPlugSetDefinition(plugSetHash: number): Promise<Record<string, unknown>> {
    return this.fetch<Record<string, unknown>>(
      `/Destiny2/Manifest/DestinyPlugSetDefinition/${plugSetHash}/`
    );
  }

  async getGroupsForMember(
    membershipType: number,
    membershipId: string
  ): Promise<{
    results: Array<{
      member: {
        memberType: number;
        groupId: string;
        joinDate: string;
        destinyUserInfo: {
          membershipId: string;
          membershipType: number;
          displayName: string;
          bungieGlobalDisplayName: string;
          bungieGlobalDisplayNameCode: number;
        };
      };
      group: {
        groupId: string;
        name: string;
        motto: string;
        memberCount: number;
        clanInfo?: {
          clanCallsign: string;
        };
      };
    }>;
  }> {
    return this.fetch(`/GroupV2/User/${membershipType}/${membershipId}/0/1/`);
  }

  async getBungieNetUser(bnetMembershipId: string): Promise<{
    membershipId: string;
    displayName: string;
    firstAccess: string;
    about?: string;
  }> {
    return this.fetch(`/User/GetBungieNetUserById/${bnetMembershipId}/`);
  }

  async searchGroups(
    groupName: string,
    groupType: number = 1 // 1 = Clan
  ): Promise<{
    results: Array<{
      groupId: string;
      name: string;
      motto: string;
      memberCount: number;
      clanInfo?: {
        clanCallsign: string;
      };
    }>;
    totalResults: number;
    hasMore: boolean;
  }> {
    return this.fetch(`/GroupV2/Name/${encodeURIComponent(groupName)}/${groupType}/`);
  }

  async getGroupMembers(
    groupId: string,
    currentPage: number = 1
  ): Promise<{
    results: Array<{
      memberType: number;
      isOnline: boolean;
      joinDate: string;
      destinyUserInfo: {
        membershipId: string;
        membershipType: number;
        displayName: string;
        bungieGlobalDisplayName: string;
        bungieGlobalDisplayNameCode: number;
      };
    }>;
    totalResults: number;
    hasMore: boolean;
  }> {
    return this.fetch(`/GroupV2/${groupId}/Members/?currentPage=${currentPage}`);
  }
}

