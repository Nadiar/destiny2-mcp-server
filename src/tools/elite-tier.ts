import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Loads the PvE Elite tier for a player by membershipId from the weighted rankings cache.
 * Returns the eliteTier string (e.g., 'S-Tier Elite') or null if not found.
 */
export async function getEliteTierForPlayer(membershipId: string): Promise<string | null> {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const rankingsPath = join(
      __dirname,
      '..',
      '..',
      '.pgcr-cache',
      'player-rankings-weighted.json'
    );
    const data = JSON.parse(await readFile(rankingsPath, 'utf-8'));
    if (!data.rankings || !data.rankings.combined) return null;
    const player = data.rankings.combined.find((p: any) => p.membershipId === membershipId);
    return player?.eliteTier || null;
  } catch {
    return null;
  }
}
