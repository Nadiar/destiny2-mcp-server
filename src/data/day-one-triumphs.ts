// Day-One Raid Triumph Detection
// These triumph hashes represent completing a raid within the first 24-48 hours of release
// This is a verified, objective way to identify elite/endgame players
// Players with these triumphs are proven skilled raiders

export interface DayOneTriumph {
  hash: number;
  name: string;
  raid: string;
  timeframe: '24h' | '48h';
  releaseDate?: string; // When the raid released
}

// Day-one/contest mode raid triumphs - pulled from Bungie API manifest
export const DAY_ONE_TRIUMPHS: DayOneTriumph[] = [
  // 24-hour triumphs (original day-one raids)
  {
    hash: 2699580344,
    name: 'Fresh from the Crypt',
    raid: 'Deep Stone Crypt',
    timeframe: '24h',
    releaseDate: '2020-11-21',
  },
  {
    hash: 3292013044,
    name: 'First Crown-Bearers',
    raid: 'Crown of Sorrow',
    timeframe: '24h',
    releaseDate: '2019-06-04',
  },
  {
    hash: 922211732,
    name: 'Day at the Pyramid',
    raid: 'Vow of the Disciple',
    timeframe: '24h',
    releaseDate: '2022-03-05',
  },
  {
    hash: 2384429092,
    name: "Tempo's Edge",
    raid: 'Vault of Glass',
    timeframe: '24h',
    releaseDate: '2021-05-22',
  },
  {
    hash: 2579096068,
    name: 'Regicide',
    raid: "King's Fall",
    timeframe: '24h',
    releaseDate: '2022-08-26',
  },

  // 48-hour triumphs (extended contest mode)
  {
    hash: 3025362184,
    name: 'Horticulturist',
    raid: 'Root of Nightmares',
    timeframe: '48h',
    releaseDate: '2023-03-10',
  },
  {
    hash: 3975049489,
    name: 'Paragon',
    raid: "Salvation's Edge",
    timeframe: '48h',
    releaseDate: '2024-06-07',
  },
  {
    hash: 1417273794,
    name: 'Superior Swordplay',
    raid: "Crota's End",
    timeframe: '48h',
    releaseDate: '2023-09-01',
  },

  // Dungeon/Other contest triumphs
  { hash: 2037346146, name: 'Stop the Clock', raid: 'The Desert Perpetual', timeframe: '48h' },
  {
    hash: 2758399574,
    name: 'Stop the Clock II',
    raid: 'The Desert Perpetual (Epic)',
    timeframe: '48h',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ELITE CLANS LIST
// ═══════════════════════════════════════════════════════════════════════════════
// Top 50 clans from RaidHub Clan Leaderboard (sorted by Weighted World First Score)
// Source: https://raidhub.io/clans
//
// Clans with at least one player in the top 1000 of an individual leaderboard
// are included in the clan leaderboard. Refreshes weekly before Monday reset.
//
// Last updated: 2025-11-28 (RaidHub Clan Leaderboard - Top 50)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EliteClan {
  tag: string; // Clan tag (e.g., "E" for Elysium)
  category: 'world-first' | 'speedrun' | 'endgame' | 'pve-legend';
  rank?: number; // RaidHub clan leaderboard rank
  notes?: string; // Clan name and notable info
  groupId?: string; // Bungie clan group ID (for direct roster lookup)
}

export const ELITE_CLANS: EliteClan[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP 50 CLANS (RaidHub Weighted World First Score ranking)
  // ═══════════════════════════════════════════════════════════════════════════

  // Tier 1: Top 10 (world-first category)
  // Note: Add groupId field to enable direct clan roster lookup without needing a known member
  // To find a clan's groupId: use find_players to find a member, then check their clan with
  // GET /GroupV2/User/{membershipType}/{membershipId}/0/1/ endpoint
  {
    tag: 'E',
    category: 'world-first',
    rank: 1,
    notes: 'Elysium - #1 WF Score 689.2',
    groupId: '3148408',
  },
  {
    tag: 'P',
    category: 'world-first',
    rank: 2,
    notes: 'Parabellum - #2 WF Score 517.5',
    groupId: '4892273',
  },
  {
    tag: 'P',
    category: 'world-first',
    rank: 3,
    notes: 'Passion - #3 WF Score 474.6',
    groupId: '4999487',
  },
  {
    tag: 'I',
    category: 'world-first',
    rank: 4,
    notes: 'Indebted - #4 WF Score 437.9',
    groupId: '5243173',
  },
  {
    tag: 'Lux',
    category: 'world-first',
    rank: 5,
    notes: 'Luminous - #5 WF Score 414.1',
    groupId: '1585122',
  },
  {
    tag: 'B',
    category: 'world-first',
    rank: 6,
    notes: 'Boundlessㅤ - #6 WF Score 315.1',
    groupId: '5154207',
  },
  {
    tag: 'ゝ',
    category: 'world-first',
    rank: 7,
    notes: 'Dash - #7 WF Score 267.1',
    groupId: '4807278',
  },
  {
    tag: 'T1',
    category: 'world-first',
    rank: 8,
    notes: 'Tier 1 - #8 WF Score 259.5',
    groupId: '4703047',
  },
  {
    tag: 'B',
    category: 'world-first',
    rank: 9,
    notes: 'Blissㅤ - #9 WF Score 256.8',
    groupId: '1490847',
  },
  {
    tag: 'AUC',
    category: 'world-first',
    rank: 10,
    notes: 'Anti-Unc Coalition - #10 WF Score 211.3',
    groupId: '5253398',
  },

  // Tier 2: Ranks 11-25 (world-first category)
  { tag: 'BK', category: 'world-first', rank: 11, notes: 'Burger - #11 WF Score 204.1' },
  {
    tag: 'bob',
    category: 'world-first',
    rank: 12,
    notes: 'Nerdbob - #12 WF Score 198.9',
    groupId: '5027893',
  },
  {
    tag: 'ぷ',
    category: 'world-first',
    rank: 13,
    notes: 'Infinity - #13 WF Score 178.0',
    groupId: '4887104',
  },
  {
    tag: 'S',
    category: 'world-first',
    rank: 14,
    notes: 'Silimar - #14 WF Score 177.9',
    groupId: '3504168',
  },
  {
    tag: '2007',
    category: 'world-first',
    rank: 15,
    notes: 'halo 3 lan party - #15 WF Score 166.2',
    groupId: '5042205',
  },
  {
    tag: 'blet',
    category: 'world-first',
    rank: 16,
    notes: 'When Breath Becomes Air - #16 WF Score 162.9',
    groupId: '4857400',
  },
  {
    tag: 'RDM',
    category: 'world-first',
    rank: 17,
    notes: 'Redeem - #17 WF Score 162.3',
    groupId: '5035047',
  },
  {
    tag: 'Λ',
    category: 'world-first',
    rank: 18,
    notes: 'Alistia - #18 WF Score 158.0',
    groupId: '3868052',
  },
  {
    tag: 'S1',
    category: 'world-first',
    rank: 19,
    notes: 'Space Force I - #19 WF Score 154.3',
    groupId: '3193545',
  },
  {
    tag: 'MATH',
    category: 'world-first',
    rank: 20,
    notes: 'Math Class - #20 WF Score 149.9',
    groupId: '881267',
  },
  {
    tag: 'L',
    category: 'world-first',
    rank: 21,
    notes: 'Light - #21 WF Score 145.5',
    groupId: '4471905',
  },
  {
    tag: 'Λ',
    category: 'world-first',
    rank: 22,
    notes: 'Αscend - #22 WF Score 145.3',
    groupId: '3556786',
  },
  { tag: 'E', category: 'world-first', rank: 23, notes: 'Ethereal - #23 WF Score 144.7' },
  {
    tag: 'M',
    category: 'world-first',
    rank: 24,
    notes: 'Mariana - #24 WF Score 143.8',
    groupId: '5380134',
  },
  {
    tag: 'H',
    category: 'world-first',
    rank: 25,
    notes: 'Hinkelfest - #25 WF Score 143.5',
    groupId: '5398944',
  },

  // Tier 3: Ranks 26-50 (endgame category)
  {
    tag: 'P1',
    category: 'endgame',
    rank: 26,
    notes: 'Phantom One - #26 WF Score 142.5',
    groupId: '4912136',
  },
  { tag: 'S', category: 'endgame', rank: 27, notes: 'Entropy - #27 WF Score 139.8' },
  {
    tag: 'K',
    category: 'endgame',
    rank: 28,
    notes: 'Karthus - #28 WF Score 138.6',
    groupId: '4745423',
  },
  {
    tag: 'U',
    category: 'endgame',
    rank: 29,
    notes: 'Unleash - #29 WF Score 135.8',
    groupId: '5043294',
  },
  {
    tag: 'Mn',
    category: 'endgame',
    rank: 30,
    notes: 'Moonbow - #30 WF Score 135.1',
    groupId: '4720563',
  },
  {
    tag: 'BBCS',
    category: 'endgame',
    rank: 31,
    notes: 'Best Buy Customer Service - #31 WF Score 132.3',
    groupId: '2860070',
  },
  {
    tag: 'R',
    category: 'endgame',
    rank: 32,
    notes: 'Rite - #32 WF Score 130.8',
    groupId: '5228752',
  },
  {
    tag: '倒卖星星',
    category: 'endgame',
    rank: 33,
    notes: 'Scalping étoiles - #33 WF Score 130.5',
    groupId: '5158358',
  },
  {
    tag: 'ƒ',
    category: 'endgame',
    rank: 34,
    notes: '小小沸物/Frog - #34-35 WF Score ~126',
    groupId: '4984659',
  },
  {
    tag: 'F',
    category: 'endgame',
    rank: 36,
    notes: 'Flow - #36 WF Score 123.9',
    groupId: '3797352',
  },
  {
    tag: '風',
    category: 'endgame',
    rank: 37,
    notes: 'Z Σ P H Y R - #37 WF Score 122.0',
    groupId: '4493420',
  },
  { tag: '∞', category: 'endgame', rank: 38, notes: 'Níghtmare - #38 WF Score 118.1' },
  {
    tag: 'ぷ',
    category: 'endgame',
    rank: 39,
    notes: 'Skate - #39 WF Score 115.2',
    groupId: '4305583',
  },
  {
    tag: 'λ',
    category: 'endgame',
    rank: 40,
    notes: 'Sγnergy - #40 WF Score 109.3',
    groupId: '5257706',
  },
  {
    tag: 'S',
    category: 'endgame',
    rank: 41,
    notes: 'Stoicism - #41 WF Score 109.0',
    groupId: '4569715',
  },
  {
    tag: 'Inc',
    category: 'endgame',
    rank: 42,
    notes: 'Just Raid Ιnc - #42 WF Score 108.5',
    groupId: '5269922',
  },
  { tag: 'T', category: 'endgame', rank: 43, notes: 'Limitless - #43 WF Score 106.9' },
  {
    tag: '迅',
    category: 'endgame',
    rank: 44,
    notes: 'EΘN - #44 WF Score 106.6',
    groupId: '5253419',
  },
  {
    tag: 'G1',
    category: 'endgame',
    rank: 45,
    notes: 'Garrison - #45 WF Score 100.0',
    groupId: '1890137',
  },
  {
    tag: 'Ø',
    category: 'endgame',
    rank: 46,
    notes: 'Lımboㅤ - #46 WF Score 93.6',
    groupId: '3866181',
  },
  {
    tag: 'N',
    category: 'endgame',
    rank: 47,
    notes: 'Niche - #47 WF Score 93.5',
    groupId: '4971782',
  },
  {
    tag: 'ISO',
    category: 'endgame',
    rank: 48,
    notes: 'Isometric - #48 WF Score 92.5',
    groupId: '4172658',
  },
  {
    tag: 'RR',
    category: 'endgame',
    rank: 49,
    notes: 'RogueRaider - #49 WF Score 89.6',
    groupId: '3732023',
  },
  { tag: 'J', category: 'endgame', rank: 50, notes: 'Job - #50 WF Score 89.2' },
];

// Get elite clan by tag (case-insensitive)
export function getEliteClan(tag: string): EliteClan | undefined {
  return ELITE_CLANS.find((c) => c.tag.toLowerCase() === tag.toLowerCase());
}

// Check if a clan tag belongs to an elite clan
export function isEliteClan(tag: string | undefined): boolean {
  if (!tag) return false;
  return ELITE_CLANS.some((c) => c.tag.toLowerCase() === tag.toLowerCase());
}

// Get confidence boost for being in an elite clan
export function getEliteClanBoost(clanTag: string | undefined): number {
  const clan = clanTag ? getEliteClan(clanTag) : undefined;
  if (!clan) return 0;

  // Rank-based scoring (higher rank = higher boost)
  if (clan.rank) {
    if (clan.rank <= 5) return 30; // Top 5 clans
    if (clan.rank <= 10) return 25; // Top 10 clans
    if (clan.rank <= 20) return 20; // Top 20 clans
    if (clan.rank <= 35) return 15; // Top 35 clans
    return 10; // Top 50 clans
  }

  // Fallback to category-based scoring
  switch (clan.category) {
    case 'world-first':
      return 25;
    case 'speedrun':
      return 20;
    case 'endgame':
      return 15;
    case 'pve-legend':
      return 10;
    default:
      return 5;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Day-One Triumph Functions
// ═══════════════════════════════════════════════════════════════════════════════

// Get day-one triumph by hash
export function getDayOneTriumph(hash: number): DayOneTriumph | undefined {
  return DAY_ONE_TRIUMPHS.find((t) => t.hash === hash);
}

// Check if a hash is a day-one triumph
export function isDayOneTriumph(hash: number): boolean {
  return DAY_ONE_TRIUMPHS.some((t) => t.hash === hash);
}

// Get all day-one triumph hashes (for API requests)
export function getDayOneTriumphHashes(): number[] {
  return DAY_ONE_TRIUMPHS.map((t) => t.hash);
}

// Count day-one triumphs from a list of completed triumph hashes
export function countDayOneTriumphs(completedTriumphs: number[]): {
  count: number;
  triumphs: DayOneTriumph[];
} {
  const completed = DAY_ONE_TRIUMPHS.filter((t) => completedTriumphs.includes(t.hash));
  return { count: completed.length, triumphs: completed };
}

// Calculate confidence boost based on day-one completions
export function getDayOneBoost(completedTriumphs: number[]): number {
  const { count, triumphs } = countDayOneTriumphs(completedTriumphs);

  if (count === 0) return 0;

  // Base boost: 15 per day-one clear
  // 24h clears are worth more than 48h
  let boost = 0;
  for (const triumph of triumphs) {
    boost += triumph.timeframe === '24h' ? 20 : 15;
  }

  // Bonus for multiple day-ones (shows consistent elite play)
  if (count >= 5)
    boost += 15; // 5+ day-ones = very dedicated
  else if (count >= 3)
    boost += 10; // 3-4 day-ones = serious raider
  else if (count >= 2) boost += 5; // 2 day-ones = experienced

  return Math.min(boost, 50); // Cap at 50 points
}

// Format day-one triumphs for display
export function formatDayOneTriumphs(completedTriumphs: number[]): string {
  const { triumphs } = countDayOneTriumphs(completedTriumphs);
  if (triumphs.length === 0) return '';

  return triumphs.map((t) => `🏆 ${t.name} (${t.raid})`).join('\n');
}
