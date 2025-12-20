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
// Data verified from World's First leaderboard analysis (raid.report/dungeon.report)
//
// Weighted scoring methodology (exponential decay):
// - 1st place = 100 pts, 2nd = 50 pts, 3rd = 25 pts (halves each position)
// - Formula: 100 / 2^(rank-1) for ranks 1-25
// - Ranks 26-100 = flat 1 point (participation)
// - Raid multiplier: 1.5x (6-player coordination vs 3-player dungeons)
// - Dungeon multiplier: 1.0x
// - Sample: Top 200 players by combined weighted score
//
// Last updated: 2025-12-13 (verified from leaderboard PGCR data)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EliteClan {
  tag: string; // Clan tag (e.g., "E" for Elysium)
  category: 'world-first' | 'speedrun' | 'endgame' | 'pve-legend';
  rank?: number; // Weighted rank (exponential decay + raid 1.5x)
  notes?: string; // Clan name and notable info
  groupId?: string; // Bungie clan group ID (for direct roster lookup)
  raidScore?: number; // Raid-weighted score
  dungeonScore?: number; // Dungeon score
}

export const ELITE_CLANS: EliteClan[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP 50 CLANS (weighted exponential decay: 1st=100, 2nd=50, 3rd=25...)
  // Raids weighted 1.5x vs dungeons
  // ═══════════════════════════════════════════════════════════════════════════

  // Tier 1: Top 10 (world-first category)
  {
    tag: 'E',
    category: 'world-first',
    rank: 1,
    notes: 'Elysium - 5339 pts (Saltagreppo, multiple WF wins)',
    groupId: '3148408',
    raidScore: 5037,
    dungeonScore: 303,
  },
  {
    tag: 'Lux',
    category: 'world-first',
    rank: 2,
    notes: 'Luminous - 3635 pts',
    groupId: '1585122',
    raidScore: 3099,
    dungeonScore: 535,
  },
  {
    tag: 'P',
    category: 'world-first',
    rank: 3,
    notes: 'Passion - 2702 pts',
    groupId: '4999487',
    raidScore: 2095,
    dungeonScore: 608,
  },
  {
    tag: 'I',
    category: 'world-first',
    rank: 4,
    notes: 'Indebted - 2135 pts (#1 dungeon clan)',
    groupId: '5243173',
    raidScore: 1231,
    dungeonScore: 904,
  },
  {
    tag: 'B',
    category: 'world-first',
    rank: 5,
    notes: 'Boundless - 914 pts',
    groupId: '5154207',
    raidScore: 545,
    dungeonScore: 369,
  },
  {
    tag: 'P',
    category: 'world-first',
    rank: 6,
    notes: 'Parabellum - 848 pts (DrakathShadow, Jake)',
    groupId: '4892273',
    raidScore: 833,
    dungeonScore: 14,
  },
  {
    tag: 'Λ',
    category: 'world-first',
    rank: 7,
    notes: 'Ascend - 842 pts',
    groupId: '3556786',
    raidScore: 727,
    dungeonScore: 116,
  },
  {
    tag: 'MATH',
    category: 'world-first',
    rank: 8,
    notes: 'Math Class - 825 pts (Datto)',
    groupId: '881267',
    raidScore: 627,
    dungeonScore: 198,
  },
  {
    tag: 'RDM',
    category: 'world-first',
    rank: 9,
    notes: 'Redeem - 722 pts (Modern, Mape)',
    groupId: '817426',
    raidScore: 552,
    dungeonScore: 170,
  },
  {
    tag: 'T1',
    category: 'world-first',
    rank: 10,
    notes: 'Tier 1 - 657 pts (Gigz, Gamesager)',
    groupId: '1456001',
    raidScore: 652,
    dungeonScore: 4,
  },

  // Tier 2: Ranks 11-25 (world-first/endgame category)
  {
    tag: 'S1',
    category: 'world-first',
    rank: 11,
    notes: 'Space Force I - 632 pts',
    groupId: '3193545',
    raidScore: 331,
    dungeonScore: 301,
  },
  {
    tag: 'BK',
    category: 'world-first',
    rank: 12,
    notes: 'Burger - 528 pts (Sweatcicle, Gladd)',
    groupId: '5344927',
    raidScore: 323,
    dungeonScore: 205,
  },
  {
    tag: 'BBCS',
    category: 'world-first',
    rank: 13,
    notes: 'Best Buy Customer Service - 468 pts (raid specialists)',
    groupId: '2860070',
    raidScore: 468,
    dungeonScore: 0,
  },
  {
    tag: 'ゝ',
    category: 'world-first',
    rank: 14,
    notes: 'Dash - 462 pts',
    groupId: '4807278',
    raidScore: 413,
    dungeonScore: 49,
  },
  {
    tag: 'R',
    category: 'endgame',
    rank: 15,
    notes: 'Reality - 316 pts',
    groupId: '2584240',
    raidScore: 314,
    dungeonScore: 2,
  },
  {
    tag: '∞',
    category: 'endgame',
    rank: 16,
    notes: 'Níghtmare - 312 pts',
    groupId: '4129911',
    raidScore: 311,
    dungeonScore: 1,
  },
  {
    tag: 'P1',
    category: 'endgame',
    rank: 17,
    notes: 'Phantom One - 305 pts',
    groupId: '4912136',
    raidScore: 104,
    dungeonScore: 201,
  },
  {
    tag: 'Λ',
    category: 'endgame',
    rank: 18,
    notes: 'Alistia - 273 pts',
    groupId: '3868052',
    raidScore: 142,
    dungeonScore: 131,
  },
  {
    tag: 'blet',
    category: 'endgame',
    rank: 19,
    notes: 'When Breath Becomes Air - 241 pts (dungeon focus)',
    groupId: '4857400',
    raidScore: 40,
    dungeonScore: 201,
  },
  {
    tag: '倒卖星星',
    category: 'endgame',
    rank: 20,
    notes: 'Scalping étoiles - 230 pts',
    groupId: '5158358',
    raidScore: 227,
    dungeonScore: 3,
  },
  {
    tag: 'ƒ',
    category: 'endgame',
    rank: 21,
    notes: '小小沸物 (Frog) - 227 pts',
    groupId: '4984659',
    raidScore: 225,
    dungeonScore: 1,
  },
  {
    tag: 'VE',
    category: 'endgame',
    rank: 22,
    notes: 'Visible - 200 pts (dungeon specialists)',
    groupId: '2673600',
    raidScore: 0,
    dungeonScore: 200,
  },
  {
    tag: 'B',
    category: 'endgame',
    rank: 23,
    notes: 'Bliss - 189 pts',
    groupId: '4927161',
    raidScore: 60,
    dungeonScore: 129,
  },
  {
    tag: '2007',
    category: 'endgame',
    rank: 24,
    notes: 'halo 3 lan party - 162 pts',
    groupId: '5042205',
    raidScore: 161,
    dungeonScore: 1,
  },
  {
    tag: '★',
    category: 'endgame',
    rank: 25,
    notes: 'Stella Nera - 160 pts (dungeon focus)',
    groupId: '3533709',
    raidScore: 5,
    dungeonScore: 155,
  },

  // Tier 3: Ranks 26-50 (endgame category - notable clans outside top 25)
  {
    tag: 'Baux',
    category: 'endgame',
    rank: 26,
    notes: 'Dabaux - 159 pts',
    groupId: '4089725',
  },
  {
    tag: 'bob',
    category: 'endgame',
    rank: 27,
    notes: 'Nerdbob - 126 pts',
    groupId: '5027893',
  },
  {
    tag: 'L',
    category: 'endgame',
    rank: 28,
    notes: 'Light - 113 pts',
    groupId: '4471905',
  },
  {
    tag: 'FBLS',
    category: 'endgame',
    rank: 29,
    notes: 'Fabulosos - 104 pts',
    groupId: '1746003',
  },
  {
    tag: 'WIPE',
    category: 'endgame',
    rank: 30,
    notes: 'The Backpack PC - 103 pts',
    groupId: '4816666',
  },
  {
    tag: 'DV',
    category: 'endgame',
    rank: 31,
    notes: 'DestinyVeteran - 102 pts',
    groupId: '4682689',
  },
  {
    tag: 'HITP',
    category: 'endgame',
    rank: 32,
    notes: 'Hard in the Paint - 91 pts',
    groupId: '4738606',
  },
  {
    tag: 'I',
    category: 'endgame',
    rank: 33,
    notes: 'Irrational - 85 pts',
    groupId: '1064666',
  },
  {
    tag: 'S',
    category: 'endgame',
    rank: 34,
    notes: 'Silimar - 78 pts',
    groupId: '3504168',
  },
  {
    tag: 'TLH',
    category: 'endgame',
    rank: 35,
    notes: 'The Legend Himself (Slayerage) - 77 pts',
    groupId: '444870',
  },
  {
    tag: 'E',
    category: 'endgame',
    rank: 36,
    notes: 'Ethereal - 77 pts',
    groupId: '3926326',
  },
  {
    tag: 'ぷ',
    category: 'endgame',
    rank: 37,
    notes: 'Infinity - 66 pts',
    groupId: '4887104',
  },
  {
    tag: 'F',
    category: 'endgame',
    rank: 38,
    notes: 'Flow - 64 pts',
    groupId: '3797352',
  },
  {
    tag: 'U',
    category: 'endgame',
    rank: 39,
    notes: 'Unleash - 63 pts',
    groupId: '2114442',
  },
  {
    tag: 'K',
    category: 'endgame',
    rank: 40,
    notes: 'Karthus - 55 pts',
    groupId: '4745423',
  },
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
