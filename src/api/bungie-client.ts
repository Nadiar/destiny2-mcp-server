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

export class BungieApiClient {
  private apiKey: string;
  // Simple per-host rate limiter: max N requests per interval
  private static lastRequestTime = 0;
  private static minIntervalMs = 150; // ~6-7 req/sec to be polite
  private static rateLimitMutex: Promise<void> = Promise.resolve();

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('BUNGIE_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${BUNGIE_API_BASE}${endpoint}`;
    try {
      // Atomic rate limiting via mutex
      await (BungieApiClient.rateLimitMutex = BungieApiClient.rateLimitMutex.then(async () => {
        const now = Date.now();
        const elapsed = now - BungieApiClient.lastRequestTime;
        const waitMs = Math.max(0, BungieApiClient.minIntervalMs - elapsed);
        if (waitMs > 0) {
          await new Promise(r => setTimeout(r, waitMs));
        }
        BungieApiClient.lastRequestTime = Date.now();
      }));

      const response = await fetch(url, {
        ...options,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        // Retry once on 429/5xx with small backoff
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          await new Promise(r => setTimeout(r, 500));
          const retry = await fetch(url, {
            ...options,
            headers: {
              'X-API-Key': this.apiKey,
              'Content-Type': 'application/json',
              ...options.headers,
            },
          });
          if (!retry.ok) {
            throw new Error(`Bungie API error: ${retry.status} ${retry.statusText}`);
          }
          const retryData = await retry.json() as BungieResponse<T>;
          if (retryData.ErrorCode !== 1) {
            throw new Error(`Bungie API error: ${retryData.ErrorStatus} - ${retryData.Message}`);
          }
          return retryData.Response;
        }
        throw new Error(`Bungie API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as BungieResponse<T>;
      if (data.ErrorCode !== 1) {
        throw new Error(`Bungie API error: ${data.ErrorStatus} - ${data.Message}`);
      }
      return data.Response;
    } catch (err: any) {
      // Sanitize possible leakage of API key in error messages
      const msg = String(err?.message || err);
      const redacted = this.apiKey ? msg.replace(new RegExp(this.apiKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '***') : msg;
      const e = new Error(redacted);
      e.name = err?.name || 'BungieApiError';
      throw e;
    }
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

