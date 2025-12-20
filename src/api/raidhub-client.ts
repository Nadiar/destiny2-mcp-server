export interface RaidHubClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
}

export class RaidHubApiError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RaidHubApiError';
    this.status = status;
  }
}

export class RaidHubClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(apiKey: string, options: RaidHubClientOptions = {}) {
    if (!apiKey) throw new Error('RAIDHUB_API_KEY is required');
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl ?? 'https://api.raidhub.io';
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          ...(init.headers || {}),
        },
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new RaidHubApiError(
          `RaidHub API error: ${res.status} ${res.statusText} ${text ? `- ${text}` : ''}`,
          res.status
        );
      }

      const json = (await res.json()) as { success?: boolean; response?: T } | T;
      // Some endpoints wrap payload in { success, response }
      if (typeof json === 'object' && json && 'response' in json) {
        // @ts-expect-error - response is generic
        return (json as any).response as T;
      }
      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new RaidHubApiError('RaidHub request timed out');
      }
      if (err instanceof RaidHubApiError) throw err;
      throw new RaidHubApiError(String(err?.message || err));
    }
  }

  // Manifest - activity definitions and metadata
  async getManifest(): Promise<any> {
    return this.request('/manifest');
  }

  // Status
  async getStatus(): Promise<any> {
    return this.request('/status');
  }

  // Player search
  async playerSearch(query: string, membershipType: number = -1, count: number = 20): Promise<any> {
    const params = new URLSearchParams({
      query,
      count: String(count),
      membershipType: String(membershipType),
    });
    return this.request(`/player/search?${params.toString()}`);
  }

  // Player basic (low-cost)
  async getPlayerBasic(membershipId: string): Promise<any> {
    return this.request(`/player/${encodeURIComponent(membershipId)}/basic`);
  }

  // Player history (cursor-based) - requires bearer token on some endpoints; the client supports passing Authorization header
  async getPlayerHistory(
    membershipId: string,
    count = 200,
    cursor?: string,
    bearerToken?: string
  ): Promise<any> {
    const params = new URLSearchParams({ count: String(count) });
    if (cursor) params.set('cursor', cursor);
    const headers: Record<string, string> = {};
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;
    return this.request(
      `/player/${encodeURIComponent(membershipId)}/history?${params.toString()}`,
      {
        headers,
      }
    );
  }

  // Instances - filter for player's instances
  async getPlayerInstances(membershipId: string, query: Record<string, string> = {}): Promise<any> {
    const params = new URLSearchParams(query as Record<string, string>);
    return this.request(
      `/player/${encodeURIComponent(membershipId)}/instances?${params.toString()}`
    );
  }

  // Instance / PGCR
  async getInstance(instanceId: string): Promise<any> {
    return this.request(`/instance/${encodeURIComponent(instanceId)}`);
  }

  async getPgcr(instanceId: string): Promise<any> {
    return this.request(`/pgcr/${encodeURIComponent(instanceId)}`);
  }

  // Leaderboards - generic endpoints
  async getGlobalLeaderboard(category: string, page = 1, count = 50): Promise<any> {
    const params = new URLSearchParams({ page: String(page), count: String(count) });
    return this.request(
      `/leaderboard/individual/global/${encodeURIComponent(category)}?${params.toString()}`
    );
  }

  async getRaidLeaderboard(raid: string, category: string, page = 1, count = 50): Promise<any> {
    const params = new URLSearchParams({ page: String(page), count: String(count) });
    return this.request(
      `/leaderboard/individual/raid/${encodeURIComponent(raid)}/${encodeURIComponent(category)}?${params.toString()}`
    );
  }

  async getContestLeaderboard(raid: string, page = 1, count = 50): Promise<any> {
    const params = new URLSearchParams({ page: String(page), count: String(count) });
    return this.request(
      `/leaderboard/team/contest/${encodeURIComponent(raid)}?${params.toString()}`
    );
  }

  async getTeamFirstLeaderboard(
    activity: string,
    version: string,
    page = 1,
    count = 50
  ): Promise<any> {
    const params = new URLSearchParams({ page: String(page), count: String(count) });
    return this.request(
      `/leaderboard/team/first/${encodeURIComponent(activity)}/${encodeURIComponent(version)}?${params.toString()}`
    );
  }

  async getClanLeaderboard(page = 1, count = 50, column = 'weighted_contest_score'): Promise<any> {
    const params = new URLSearchParams({ page: String(page), count: String(count), column });
    return this.request(`/leaderboard/clan?${params.toString()}`);
  }

  // Metrics
  async getWeaponsRollingWeek(sort = 'usage', count = 25): Promise<any> {
    const params = new URLSearchParams({ sort, count: String(count) });
    return this.request(`/metrics/weapons/rolling-week?${params.toString()}`);
  }

  async getPopulationRollingDay(): Promise<any> {
    return this.request('/metrics/population/rolling-day');
  }
}
