import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CACHE_DIR = join(homedir(), '.destiny2-mcp', 'cache', 'raidhub');

export interface CachedLeaderboard {
  key: string; // unique key (e.g., contest:raidSlug or teamfirst:activity:version)
  fetchedAt: string; // ISO timestamp
  payload: unknown;
}

export class RaidHubCache {
  private cache: Map<string, CachedLeaderboard> = new Map();

  private async ensureDir(): Promise<void> {
    if (!existsSync(CACHE_DIR)) {
      await mkdir(CACHE_DIR, { recursive: true });
    }
  }

  private filePathForKey(key: string): string {
    const safe = key.replace(/[^a-z0-9-_.]/gi, '_');
    return join(CACHE_DIR, `${safe}.json`);
  }

  async get(key: string): Promise<CachedLeaderboard | null> {
    if (this.cache.has(key)) return this.cache.get(key)!;

    // Try to read from disk
    try {
      const path = this.filePathForKey(key);
      if (!existsSync(path)) return null;
      const content = await readFile(path, 'utf-8');
      const obj = JSON.parse(content) as CachedLeaderboard;
      this.cache.set(key, obj);
      return obj;
    } catch {
      return null;
    }
  }

  async set(key: string, payload: unknown): Promise<CachedLeaderboard> {
    const entry: CachedLeaderboard = { key, fetchedAt: new Date().toISOString(), payload };
    this.cache.set(key, entry);
    try {
      await this.ensureDir();
      const path = this.filePathForKey(key);
      await writeFile(path, JSON.stringify(entry), 'utf-8');
    } catch (e) {
      // Don't fail when disk write fails; keep in-memory cache
      console.error('[RaidHubCache] Failed to persist cache to disk', e);
    }
    return entry;
  }

  // For tests and admin controls
  async clear(key?: string): Promise<void> {
    if (key) {
      this.cache.delete(key);
      try {
        const path = this.filePathForKey(key);
        if (existsSync(path)) {
          await writeFile(path, '', 'utf-8');
        }
      } catch {}
      return;
    }

    // Clear all in-memory cache and attempt to remove cache files
    this.cache.clear();
    try {
      if (existsSync(CACHE_DIR)) {
        const files = await import('fs/promises').then((fs) => fs.readdir(CACHE_DIR));
        for (const f of files) {
          try {
            await import('fs/promises').then((fs) => fs.unlink(`${CACHE_DIR}/${f}`));
          } catch {}
        }
      }
    } catch {}
  }
}

export const raidhubCache = new RaidHubCache();
