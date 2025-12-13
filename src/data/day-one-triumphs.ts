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
// Rankings based on total contest completions in top 100 across all activities
//
// Last updated: 2025-12-12 (verified from leaderboard PGCR data)
// ═══════════════════════════════════════════════════════════════════════════════

export interface EliteClan {
  tag: string; // Clan tag (e.g., "E" for Elysium)
  category: 'world-first' | 'speedrun' | 'endgame' | 'pve-legend';
  rank?: number; // Rank by contest completions
  notes?: string; // Clan name and notable info
  groupId?: string; // Bungie clan group ID (for direct roster lookup)
}

export const ELITE_CLANS: EliteClan[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // TOP 50 CLANS (verified from World's First leaderboard data)
  // ═══════════════════════════════════════════════════════════════════════════

  // Tier 1: Top 10 (world-first category)
  {
    tag: 'I',
    category: 'world-first',
    rank: 1,
    notes: 'Indebted - 298 contest completions, 25 top players',
    groupId: '5243173',
  },
  {
    tag: 'P',
    category: 'world-first',
    rank: 2,
    notes: 'Passion - 255 contest completions, 25 top players',
    groupId: '4999487',
  },
  {
    tag: 'Lux',
    category: 'world-first',
    rank: 3,
    notes: 'Luminous - 171 contest completions, 14 top players',
    groupId: '1585122',
  },
  {
    tag: 'E',
    category: 'world-first',
    rank: 4,
    notes: 'Elysium - 161 contest completions, 15 top players (Saltagreppo)',
    groupId: '3148408',
  },
  {
    tag: 'ゝ',
    category: 'world-first',
    rank: 5,
    notes: 'Dash - 101 contest completions, 7 top players',
    groupId: '4807278',
  },
  {
    tag: 'B',
    category: 'world-first',
    rank: 6,
    notes: 'Bliss - 83 contest completions, 7 top players',
    groupId: '4927161',
  },
  {
    tag: 'B',
    category: 'world-first',
    rank: 7,
    notes: 'Boundless - 80 contest completions, 8 top players',
    groupId: '5154207',
  },
  {
    tag: 'T1',
    category: 'world-first',
    rank: 8,
    notes: 'Tier 1 - 75 contest completions (Gigz, Gamesager)',
    groupId: '1456001',
  },
  {
    tag: 'RDM',
    category: 'world-first',
    rank: 9,
    notes: 'Redeem - 75 contest completions (Mape, Modern)',
    groupId: '817426',
  },
  {
    tag: 'Λ',
    category: 'world-first',
    rank: 10,
    notes: 'Alistia - 74 contest completions, 6 top players',
    groupId: '3868052',
  },

  // Tier 2: Ranks 11-25 (world-first category)
  {
    tag: 'P',
    category: 'world-first',
    rank: 11,
    notes: 'Parabellum - 65 contest completions (DrakathShadow, Jake)',
    groupId: '4892273',
  },
  {
    tag: 'MATH',
    category: 'world-first',
    rank: 12,
    notes: 'Math Class - 64 contest completions (Datto, Semi)',
    groupId: '881267',
  },
  {
    tag: 'S',
    category: 'world-first',
    rank: 13,
    notes: 'Silimar - 60 contest completions, 6 top players',
    groupId: '3504168',
  },
  {
    tag: 'BK',
    category: 'world-first',
    rank: 14,
    notes: 'Burger - 44 contest completions (Sweatcicle, Gladd)',
    groupId: '5344927',
  },
  {
    tag: 'ぷ',
    category: 'world-first',
    rank: 15,
    notes: 'Infinity - 37 contest completions, 3 top players',
    groupId: '4887104',
  },
  {
    tag: 'E',
    category: 'world-first',
    rank: 16,
    notes: 'Ethereal - 37 contest completions, 3 top players',
    groupId: '3926326',
  },
  {
    tag: 'bob',
    category: 'world-first',
    rank: 17,
    notes: 'Nerdbob - 30 contest completions, 3 top players',
    groupId: '5027893',
  },
  {
    tag: 'F',
    category: 'world-first',
    rank: 18,
    notes: 'Flow - 28 contest completions, 3 top players',
    groupId: '3797352',
  },
  {
    tag: 'U',
    category: 'world-first',
    rank: 19,
    notes: 'Unleash - 28 contest completions, 3 top players',
    groupId: '2114442',
  },
  {
    tag: 'Λ',
    category: 'world-first',
    rank: 20,
    notes: 'Ascend - 26 contest completions, 3 top players',
    groupId: '3556786',
  },
  {
    tag: 'DVT',
    category: 'world-first',
    rank: 21,
    notes: 'Devout - 25 contest completions, 3 top players',
    groupId: '3493841',
  },
  {
    tag: 'S1',
    category: 'world-first',
    rank: 22,
    notes: 'Space Force I - 23 contest completions, 3 top players',
    groupId: '3193545',
  },
  {
    tag: 'K',
    category: 'endgame',
    rank: 23,
    notes: 'Karthus - 19 contest completions, 2 top players',
    groupId: '4745423',
  },
  {
    tag: 'L',
    category: 'endgame',
    rank: 24,
    notes: 'Light - 18 contest completions, 2 top players',
    groupId: '4471905',
  },
  {
    tag: 'blet',
    category: 'endgame',
    rank: 25,
    notes: 'When Breath Becomes Air - 17 contest completions, 2 top players',
    groupId: '4857400',
  },

  // Tier 3: Ranks 26-50 (endgame category)
  {
    tag: '∞',
    category: 'endgame',
    rank: 26,
    notes: 'Níghtmare - 16 contest completions',
    groupId: '4129911',
  },
  {
    tag: 'QωQ',
    category: 'endgame',
    rank: 27,
    notes: '猫猫快乐屋 - 14 contest completions',
    groupId: '5246934',
  },
  {
    tag: 'I',
    category: 'endgame',
    rank: 28,
    notes: 'Irrational - 13 contest completions',
    groupId: '1064666',
  },
  {
    tag: 'Nerd',
    category: 'endgame',
    rank: 29,
    notes: 'Nerds inc. - 13 contest completions',
    groupId: '4645234',
  },
  {
    tag: '氷',
    category: 'endgame',
    rank: 30,
    notes: 'Magnificent - 13 contest completions',
    groupId: '5332944',
  },
  {
    tag: 'AUC',
    category: 'endgame',
    rank: 31,
    notes: 'Anti-Unc Coalition - 12 contest completions',
    groupId: '5253398',
  },
  {
    tag: 'RR',
    category: 'endgame',
    rank: 32,
    notes: 'RogueRaider - 12 contest completions',
    groupId: '3732023',
  },
  {
    tag: 'HITP',
    category: 'endgame',
    rank: 33,
    notes: 'Hard in the Paint - 11 contest completions',
    groupId: '4738606',
  },
  {
    tag: 'Zoo',
    category: 'endgame',
    rank: 34,
    notes: 'Zoo - 11 contest completions',
    groupId: '4608572',
  },
  {
    tag: 'ε',
    category: 'endgame',
    rank: 35,
    notes: 'End - 11 contest completions',
    groupId: '4214804',
  },
  {
    tag: '$',
    category: 'endgame',
    rank: 36,
    notes: 'Allo Business - 10 contest completions',
    groupId: '5369207',
  },
  {
    tag: 'TLH',
    category: 'endgame',
    rank: 37,
    notes: 'The Legend Himself (Slayerage) - 10 contest completions',
    groupId: '444870',
  },
  {
    tag: 'P1',
    category: 'endgame',
    rank: 38,
    notes: 'Phantom One - 10 contest completions',
    groupId: '4912136',
  },
  {
    tag: '硬',
    category: 'endgame',
    rank: 39,
    notes: '硬邦帮 - 10 contest completions',
    groupId: '3870033',
  },
  {
    tag: '⁊',
    category: 'endgame',
    rank: 40,
    notes: 'evulse - 9 contest completions',
    groupId: '3955049',
  },
  {
    tag: 'Osm',
    category: 'endgame',
    rank: 41,
    notes: 'Osmius - 9 contest completions',
    groupId: '3986308',
  },
  {
    tag: 'AΞ',
    category: 'endgame',
    rank: 42,
    notes: 'AFTERFALL - 9 contest completions',
    groupId: '3554734',
  },
  {
    tag: '2007',
    category: 'endgame',
    rank: 43,
    notes: 'halo 3 lan party - 8 contest completions',
    groupId: '5042205',
  },
  {
    tag: 'Đ',
    category: 'endgame',
    rank: 44,
    notes: 'Dior - 8 contest completions',
    groupId: '4884685',
  },
  {
    tag: 'R',
    category: 'endgame',
    rank: 45,
    notes: 'Rite - 8 contest completions',
    groupId: '5228752',
  },
  {
    tag: '〆',
    category: 'endgame',
    rank: 46,
    notes: 'Transition - 8 contest completions',
    groupId: '5033682',
  },
  {
    tag: 'N',
    category: 'endgame',
    rank: 47,
    notes: 'Niche - 8 contest completions',
    groupId: '4971782',
  },
  {
    tag: '倒卖星星',
    category: 'endgame',
    rank: 48,
    notes: 'Scalping étoiles - 8 contest completions',
    groupId: '5158358',
  },
  {
    tag: 'ƒ',
    category: 'endgame',
    rank: 49,
    notes: 'Frog - 8 contest completions',
    groupId: '5067505',
  },
  {
    tag: 'T',
    category: 'endgame',
    rank: 50,
    notes: 'Treason - 8 contest completions',
    groupId: '4088586',
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
