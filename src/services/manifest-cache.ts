import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache directory in user's home directory (works for global installs)
const CACHE_DIR = join(homedir(), '.destiny2-mcp', 'cache');
const MANIFEST_VERSION_FILE = join(CACHE_DIR, 'manifest-version.json');
const ITEMS_CACHE_FILE = join(CACHE_DIR, 'items.json');

interface ItemDefinition {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  itemType: number;
  itemSubType: number;
  tierType: number;
  tierTypeName?: string;
  seasonHash?: number;
  iconWatermark?: string;
  collectibleHash?: number;
}

interface ManifestVersion {
  version: string;
  downloadedAt: string;
}

interface ItemSearchResult {
  hash: number;
  name: string;
  description: string;
  icon?: string;
  itemType: string;
  tierType: string;
  source?: string;
  seasonNumber?: number;
}

// Known watermark hashes to season/expansion/event info
// Watermarks identify when gear was introduced or reissued
const WATERMARK_SEASONS: Record<string, { name: string; number: number }> = {
  // Seasons
  '36418dde751148bd3b95a023d491ea73.png': { name: 'Season of the Splicer', number: 14 },
  'd105aa342f2d0c53a90a28477552f61f.png': { name: 'Season of Arrivals', number: 11 },
  '7b41678824a620d4f295984862702179.png': { name: 'Season of the Risen', number: 16 },
  '7b48b09fbb50634680168d5880b16bc9.png': { name: 'Season of the Chosen', number: 13 },
  '914322d11262322c839a5388db2a4943.png': { name: 'Season of the Lost', number: 15 },
  '41d05b7cb5cc0a384af07ee9b7d36dd2.png': { name: 'Season of the Haunted', number: 17 },
  '0b441021fbc328e6d0e2abc895f5c96e.png': { name: 'Season of Plunder', number: 18 },
  'bce51cf90464e28026140df77c4eb6ce.png': { name: 'Season of the Hunt', number: 12 },
  '9bfaa5536772e2f3ef1252813a21c4d1.png': { name: 'Season of the Seraph', number: 19 },
  'e4a1a5aaeb9f65cc5276fd4d86d1c1b2.png': { name: 'Season of Defiance', number: 20 },
  'e775dcb3d47e3d54e0e24fbdb64b5763.png': { name: 'Season of the Deep', number: 21 },
  'd4141b2247cf999c73d3dc409f9d00f7.png': { name: 'Season of the Witch', number: 22 },
  '0ac354c1c326441716ddb15d2c158c59.png': { name: 'Season of the Wish', number: 23 },

  // Episodes (Year 7+)
  '6f17d323d81dd683086d88a9268f8106.png': { name: 'Episode: Echoes', number: 24 },
  'b9620c9768c298515caeb183a3388163.png': { name: 'Episode: Revenant', number: 25 },
  '6129365b4fad6754f2b8c4478fc3c4ac.png': { name: 'Episode: Heresy', number: 26 },

  // Expansions
  '50d36366595897d49b5d33e101c8fd07.png': { name: 'The Final Shape', number: 24 },
  'fc31e8ede7cc15908d6e2b39167afbcf.png': { name: 'Lightfall', number: 20 },
  'c23c9ec8709fecbc678ea1d0a42f6a41.png': { name: 'The Witch Queen', number: 16 },
  'c1c542d176c85e1e0c8c041f1690c5e4.png': { name: 'Beyond Light', number: 12 },
  '6a52f7cd9099990157c739a8260babea.png': { name: 'Shadowkeep', number: 8 },
  'e10338777d1d8633e073846e613b6c77.png': { name: 'Forsaken', number: 4 },

  // Raids & Dungeons
  'bcc26708e314306fb2fc8cb98fcbf47e.png': { name: 'Grasp of Avarice/30th Anniversary', number: 15 },
  'a15754752f40aaf7b1b00aadb70a8f35.png': { name: 'Garden of Salvation', number: 8 },
  '5232219633cc4d90570bffda36caccf4.png': { name: 'Vow of the Disciple', number: 16 },
  '2dc17f123b7449b14144e76cfbeb2309.png': { name: "King's Fall (Reprised)", number: 17 },
  'fc02418ad2002351a3f88faa5b14eb88.png': { name: "Crota's End (Reprised)", number: 22 },
  '03d000a7f097b6e12012b8c2eab0b1ad.png': { name: 'Root of Nightmares', number: 20 },
  '0d6c3365022ed3b059eac467b076978f.png': { name: "Salvation's Edge", number: 24 },
  '661c84a377389a3b8a1fc38b44189b41.png': { name: 'Vespers Host', number: 25 },

  // Iron Banner
  '4f28dc0f39238fe25d298a894ea71389.png': { name: 'Iron Banner', number: 15 },

  // Trials of Osiris
  'ae5c7f708a36f754c2f68c65c88ab9aa.png': { name: 'Trials of Osiris', number: 11 },
  'a5e27dc822aa72787f388bd1fc115803.png': { name: 'Trials of Osiris (Reprised)', number: 17 },
  '7d815c943977fe71bbf00caf1bd9c514.png': { name: "King's Fall (Reprised)", number: 17 },

  // Crucible/Gambit/Vanguard
  'aeb95eb1abe8e45e1fe2573d6b3ab3c5.png': { name: 'Crucible (Pre-Beyond Light)', number: 7 },
  '2c022e452f395db7b1daec1cb44631fc.png': { name: 'Gambit/Vanguard', number: 4 },
  'b2410a70904ab0b09a716054c83fbcfd.png': { name: 'Vanguard/World', number: 12 },
  '75adde12e4e9c9fb237e492d8258eb73.png': { name: 'Dares of Eternity', number: 15 },

  // Events
  '50c3ebe414c6946429934d79504922fa.png': { name: 'Solstice', number: 14 },
  '53dc0b02306726ff1517af33ac908cef.png': { name: 'Festival of the Lost', number: 15 },
  '83fbcacd223402c09af4b7ab067f8cce.png': { name: 'Dawning', number: 12 },

  // Legacy/World Drops
  'a0556509f8825756b6b89f59f90528ec.png': { name: 'World Drop (Current)', number: 23 },
  '249813e647271a8227bae0d8a39ed505.png': { name: 'Nightfall', number: 19 },
  'e0c16042274fd7d9cbffc4489e340c5d.png': { name: 'Black Armory', number: 5 },
  '58d3ec8338cc9746a2e0cf901fbcec0e.png': { name: 'Menagerie/Opulence', number: 7 },
  'da5f961ef97b78293cc498978c10e178.png': { name: 'Crucible (Redrix Era)', number: 4 },
  '7ba9d804508dd083ec20fcdb8ba0869d.png': { name: 'Curse of Osiris', number: 2 },
  '859498e47c73b11f9e4af20bf6cfea16.png': { name: 'Fishing/Deep Dive', number: 21 },
};

/**
 * Configuration options for ManifestCache
 */
export interface ManifestCacheOptions {
  /** Cache TTL in hours (default: 24) */
  ttlHours?: number;
  /** Maximum cache size in megabytes (default: 100) */
  maxSizeMb?: number;
}

export class ManifestCache {
  private items: Map<number, ItemDefinition> = new Map();
  private itemsByName: Map<string, ItemDefinition[]> = new Map();
  private seasons: Map<number, { name: string; number?: number }> = new Map();
  private collectibles: Map<number, string> = new Map();
  private initialized = false;
  private apiKey: string;
  private options: Required<ManifestCacheOptions>;

  constructor(apiKey: string, options: ManifestCacheOptions = {}) {
    this.apiKey = apiKey;
    this.options = {
      ttlHours: options.ttlHours ?? 24,
      maxSizeMb: options.maxSizeMb ?? 100,
    };
  }

  private async ensureCacheDir(): Promise<void> {
    if (!existsSync(CACHE_DIR)) {
      await mkdir(CACHE_DIR, { recursive: true });
    }
  }

  private async fetchWithApiKey(url: string): Promise<Response> {
    return fetch(url, {
      headers: {
        'X-API-Key': this.apiKey,
      },
    });
  }

  /**
   * Checks if the cached version is still within TTL
   */
  private isCacheExpired(cachedVersion: ManifestVersion): boolean {
    const downloadedAt = new Date(cachedVersion.downloadedAt);
    const ttlMs = this.options.ttlHours * 60 * 60 * 1000;
    return Date.now() - downloadedAt.getTime() > ttlMs;
  }

  private async getCurrentManifestVersion(): Promise<string> {
    const response = await this.fetchWithApiKey(
      'https://www.bungie.net/Platform/Destiny2/Manifest/'
    );
    if (!response.ok) {
      throw new Error(`Manifest API returned ${response.status}: ${response.statusText}`);
    }
    const data = (await response.json()) as {
      Response?: { version: string };
      ErrorStatus?: string;
    };
    if (!data.Response?.version) {
      throw new Error(`Invalid manifest response: ${data.ErrorStatus || 'No Response object'}`);
    }
    return data.Response.version;
  }

  private async getCachedVersion(): Promise<ManifestVersion | null> {
    try {
      if (!existsSync(MANIFEST_VERSION_FILE)) {
        return null;
      }
      const content = await readFile(MANIFEST_VERSION_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async downloadManifest(): Promise<void> {
    console.error('[ManifestCache] Downloading item definitions from Bungie...');

    // Get manifest paths
    const manifestResponse = await this.fetchWithApiKey(
      'https://www.bungie.net/Platform/Destiny2/Manifest/'
    );
    const manifestData = (await manifestResponse.json()) as {
      Response: {
        version: string;
        jsonWorldComponentContentPaths: {
          en: {
            DestinyInventoryItemDefinition: string;
            DestinySeasonDefinition: string;
            DestinyCollectibleDefinition: string;
          };
        };
      };
    };
    const paths = manifestData.Response.jsonWorldComponentContentPaths.en;

    // Download items, seasons, and collectibles in parallel
    console.error('[ManifestCache] Fetching definitions...');
    const [itemsResponse, seasonsResponse, collectiblesResponse] = await Promise.all([
      fetch(`https://www.bungie.net${paths.DestinyInventoryItemDefinition}`),
      fetch(`https://www.bungie.net${paths.DestinySeasonDefinition}`),
      fetch(`https://www.bungie.net${paths.DestinyCollectibleDefinition}`),
    ]);

    const itemsData = (await itemsResponse.json()) as Record<
      string,
      {
        hash: number;
        displayProperties: { name: string; description: string; icon?: string };
        itemType: number;
        itemSubType: number;
        inventory?: { tierType: number; tierTypeName?: string };
        seasonHash?: number;
        iconWatermark?: string;
        collectibleHash?: number;
      }
    >;

    const seasonsData = (await seasonsResponse.json()) as Record<
      string,
      {
        hash: number;
        seasonNumber?: number;
        displayProperties: { name: string };
      }
    >;

    const collectiblesData = (await collectiblesResponse.json()) as Record<
      string,
      {
        hash: number;
        sourceString?: string;
      }
    >;

    // Build seasons lookup with number
    const seasonsLookup: Record<number, { name: string; number?: number }> = {};
    for (const season of Object.values(seasonsData)) {
      seasonsLookup[season.hash] = {
        name: season.displayProperties?.name || '',
        number: season.seasonNumber,
      };
    }

    // Build collectibles source lookup
    const collectiblesLookup: Record<number, string> = {};
    for (const collectible of Object.values(collectiblesData)) {
      if (collectible.sourceString) {
        collectiblesLookup[collectible.hash] = collectible.sourceString;
      }
    }

    // Process and store items
    const processedItems: Record<string, ItemDefinition> = {};

    for (const [hash, item] of Object.entries(itemsData)) {
      // Only store items with names (skip redacted/unnamed items)
      if (item.displayProperties?.name) {
        processedItems[hash] = {
          hash: item.hash,
          name: item.displayProperties.name,
          description: item.displayProperties.description || '',
          icon: item.displayProperties.icon,
          itemType: item.itemType,
          itemSubType: item.itemSubType,
          tierType: item.inventory?.tierType || 0,
          tierTypeName: item.inventory?.tierTypeName,
          seasonHash: item.seasonHash,
          iconWatermark: item.iconWatermark,
          collectibleHash: item.collectibleHash,
        };
      }
    }

    // Save to cache
    await this.ensureCacheDir();
    await writeFile(ITEMS_CACHE_FILE, JSON.stringify(processedItems));
    await writeFile(join(CACHE_DIR, 'seasons.json'), JSON.stringify(seasonsLookup));
    await writeFile(join(CACHE_DIR, 'collectibles.json'), JSON.stringify(collectiblesLookup));
    await writeFile(
      MANIFEST_VERSION_FILE,
      JSON.stringify({
        version: manifestData.Response.version,
        downloadedAt: new Date().toISOString(),
      })
    );

    console.error(
      `[ManifestCache] Cached ${Object.keys(processedItems).length} items, ${Object.keys(seasonsLookup).length} seasons`
    );
  }

  private async loadFromCache(): Promise<boolean> {
    try {
      if (!existsSync(ITEMS_CACHE_FILE)) {
        return false;
      }

      const content = await readFile(ITEMS_CACHE_FILE, 'utf-8');
      const items = JSON.parse(content) as Record<string, ItemDefinition>;

      // Load seasons and collectibles
      if (existsSync(join(CACHE_DIR, 'seasons.json'))) {
        const seasonsContent = await readFile(join(CACHE_DIR, 'seasons.json'), 'utf-8');
        const seasons = JSON.parse(seasonsContent) as Record<
          string,
          { name: string; number?: number } | string
        >;
        for (const [hash, data] of Object.entries(seasons)) {
          // Handle both old format (string) and new format (object)
          if (typeof data === 'string') {
            this.seasons.set(Number(hash), { name: data });
          } else {
            this.seasons.set(Number(hash), data);
          }
        }
      }

      if (existsSync(join(CACHE_DIR, 'collectibles.json'))) {
        const collectiblesContent = await readFile(join(CACHE_DIR, 'collectibles.json'), 'utf-8');
        const collectibles = JSON.parse(collectiblesContent) as Record<string, string>;
        for (const [hash, source] of Object.entries(collectibles)) {
          this.collectibles.set(Number(hash), source);
        }
      }

      this.items.clear();
      this.itemsByName.clear();

      for (const item of Object.values(items)) {
        this.items.set(item.hash, item);

        // Index by lowercase name for search
        const lowerName = item.name.toLowerCase();
        if (!this.itemsByName.has(lowerName)) {
          this.itemsByName.set(lowerName, []);
        }
        this.itemsByName.get(lowerName)!.push(item);
      }

      return true;
    } catch {
      return false;
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // First, try to load existing cache (for graceful degradation)
    const hasExistingCache = await this.loadFromCache();
    const cachedVersion = await this.getCachedVersion();

    try {
      // Try to check for updates
      const currentVersion = await this.getCurrentManifestVersion();

      // Determine if we need to update based on version or TTL
      const needsUpdate =
        !cachedVersion ||
        cachedVersion.version !== currentVersion ||
        this.isCacheExpired(cachedVersion);

      if (needsUpdate) {
        const reason = !cachedVersion
          ? 'no cache'
          : cachedVersion.version !== currentVersion
            ? 'version mismatch'
            : 'cache expired';
        console.error(
          `[ManifestCache] Manifest update needed (${reason}). Current: ${currentVersion}, Cached: ${cachedVersion?.version || 'none'}`
        );
        await this.downloadManifest();

        // Reload from freshly downloaded cache
        const loaded = await this.loadFromCache();
        if (!loaded) {
          throw new Error('Failed to load manifest cache after download');
        }
      } else {
        console.error(
          `[ManifestCache] Using cached manifest (version: ${cachedVersion.version}, age: ${this.getCacheAgeString(cachedVersion)})`
        );
      }

      this.initialized = true;
      console.error(`[ManifestCache] Initialized with ${this.items.size} items`);
    } catch (error) {
      // Graceful degradation: use stale cache if available
      if (hasExistingCache && this.items.size > 0) {
        console.error(
          `[ManifestCache] Update failed, using stale cache (${this.items.size} items):`,
          error
        );
        this.initialized = true;
        return;
      }
      console.error('[ManifestCache] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Gets a human-readable string for cache age
   */
  private getCacheAgeString(cachedVersion: ManifestVersion): string {
    const downloadedAt = new Date(cachedVersion.downloadedAt);
    const ageMs = Date.now() - downloadedAt.getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    if (ageHours < 1) {
      const ageMinutes = Math.floor(ageMs / (1000 * 60));
      return `${ageMinutes} minutes`;
    }
    if (ageHours < 24) {
      return `${ageHours} hours`;
    }
    const ageDays = Math.floor(ageHours / 24);
    return `${ageDays} days`;
  }

  private getItemTypeName(itemType: number): string {
    const types: Record<number, string> = {
      0: 'None',
      1: 'Currency',
      2: 'Armor',
      3: 'Weapon',
      7: 'Message',
      8: 'Engram',
      9: 'Consumable',
      10: 'ExchangeMaterial',
      11: 'MissionReward',
      12: 'QuestStep',
      13: 'QuestStepComplete',
      14: 'Emblem',
      15: 'Quest',
      16: 'Subclass',
      17: 'ClanBanner',
      18: 'Aura',
      19: 'Mod',
      20: 'Dummy',
      21: 'Ship',
      22: 'Vehicle',
      23: 'Emote',
      24: 'Ghost',
      25: 'Package',
      26: 'Bounty',
      27: 'Wrapper',
      28: 'SeasonalArtifact',
      29: 'Finisher',
      30: 'Pattern',
    };
    return types[itemType] || 'Unknown';
  }

  private getTierTypeName(tierType: number, tierTypeName?: string): string {
    if (tierTypeName) return tierTypeName;
    const tiers: Record<number, string> = {
      0: 'Unknown',
      1: 'Currency',
      2: 'Basic',
      3: 'Common',
      4: 'Rare',
      5: 'Legendary',
      6: 'Exotic',
    };
    return tiers[tierType] || 'Unknown';
  }

  private getItemSource(item: ItemDefinition): string | undefined {
    // Try season first (with season number if available)
    if (item.seasonHash && this.seasons.has(item.seasonHash)) {
      const season = this.seasons.get(item.seasonHash)!;
      if (season.number) {
        return `${season.name} (S${season.number})`;
      }
      return season.name;
    }

    // Try watermark mapping
    if (item.iconWatermark) {
      const watermarkFile = item.iconWatermark.split('/').pop();
      if (watermarkFile && WATERMARK_SEASONS[watermarkFile]) {
        const seasonInfo = WATERMARK_SEASONS[watermarkFile];
        return `${seasonInfo.name} (S${seasonInfo.number})`;
      }
    }

    // Try collectible source
    if (item.collectibleHash && this.collectibles.has(item.collectibleHash)) {
      return this.collectibles.get(item.collectibleHash);
    }

    return undefined;
  }

  private getSeasonNumber(item: ItemDefinition): number | undefined {
    // Try season hash first
    if (item.seasonHash && this.seasons.has(item.seasonHash)) {
      return this.seasons.get(item.seasonHash)?.number;
    }
    // Try watermark mapping
    if (item.iconWatermark) {
      const watermarkFile = item.iconWatermark.split('/').pop();
      if (watermarkFile && WATERMARK_SEASONS[watermarkFile]) {
        return WATERMARK_SEASONS[watermarkFile].number;
      }
    }
    return undefined;
  }

  searchItems(query: string, limit: number = 25): ItemSearchResult[] {
    if (!this.initialized) {
      throw new Error('ManifestCache not initialized. Call initialize() first.');
    }

    const lowerQuery = query.toLowerCase();
    const results: ItemSearchResult[] = [];
    const seen = new Set<number>();

    // Exact match first
    const exactMatches = this.itemsByName.get(lowerQuery) || [];
    for (const item of exactMatches) {
      if (!seen.has(item.hash)) {
        seen.add(item.hash);
        results.push({
          hash: item.hash,
          name: item.name,
          description: item.description,
          icon: item.icon ? `https://www.bungie.net${item.icon}` : undefined,
          itemType: this.getItemTypeName(item.itemType),
          tierType: this.getTierTypeName(item.tierType, item.tierTypeName),
          source: this.getItemSource(item),
          seasonNumber: this.getSeasonNumber(item),
        });
      }
    }

    // Then partial matches (contains query)
    if (results.length < limit) {
      for (const item of this.items.values()) {
        if (results.length >= limit) break;
        if (seen.has(item.hash)) continue;

        if (item.name.toLowerCase().includes(lowerQuery)) {
          seen.add(item.hash);
          results.push({
            hash: item.hash,
            name: item.name,
            description: item.description,
            icon: item.icon ? `https://www.bungie.net${item.icon}` : undefined,
            itemType: this.getItemTypeName(item.itemType),
            tierType: this.getTierTypeName(item.tierType, item.tierTypeName),
            source: this.getItemSource(item),
            seasonNumber: this.getSeasonNumber(item),
          });
        }
      }
    }

    // Sort: Weapons/Armor first, then by tier, then by NEWEST season first
    results.sort((a, b) => {
      // Prioritize weapons and armor
      const typeOrder = ['Weapon', 'Armor', 'Mod'];
      const aTypeIndex = typeOrder.indexOf(a.itemType);
      const bTypeIndex = typeOrder.indexOf(b.itemType);
      const aTypePriority = aTypeIndex === -1 ? 999 : aTypeIndex;
      const bTypePriority = bTypeIndex === -1 ? 999 : bTypeIndex;

      if (aTypePriority !== bTypePriority) {
        return aTypePriority - bTypePriority;
      }

      // Then by tier (Exotic first)
      const tierOrder = ['Exotic', 'Legendary', 'Rare', 'Common', 'Basic'];
      const aTierIndex = tierOrder.indexOf(a.tierType);
      const bTierIndex = tierOrder.indexOf(b.tierType);
      const aTierPriority = aTierIndex === -1 ? 999 : aTierIndex;
      const bTierPriority = bTierIndex === -1 ? 999 : bTierIndex;

      if (aTierPriority !== bTierPriority) {
        return aTierPriority - bTierPriority;
      }

      // Then by season number (HIGHER = NEWER = first)
      const aSeason = a.seasonNumber ?? 0;
      const bSeason = b.seasonNumber ?? 0;
      if (aSeason !== bSeason) {
        return bSeason - aSeason; // Descending (newer first)
      }

      // Finally alphabetically
      return a.name.localeCompare(b.name);
    });

    return results.slice(0, limit);
  }

  getItem(hash: number): ItemDefinition | undefined {
    return this.items.get(hash);
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get itemCount(): number {
    return this.items.size;
  }
}
