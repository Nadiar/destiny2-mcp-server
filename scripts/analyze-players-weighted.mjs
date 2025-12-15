#!/usr/bin/env node
/**
 * Weighted Player Rankings from World's First Leaderboards
 * 
 * Scoring (exponential decay):
 * - 1st place = 100 pts, 2nd = 50, 3rd = 25 (halves each position)
 * - Formula: 100 / 2^(rank-1) for ranks 1-25
 * - Ranks 26-100 = flat 1 point (contest completion credit)
 * - Raids weighted 1.5x vs dungeons
 */

import fs from 'fs';
import path from 'path';

// Load enriched leaderboard data
const scriptDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const projectRoot = path.resolve(scriptDir, '..');
const dataPath = path.join(projectRoot, 'leaderboard-data', 'leaderboards-enriched.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const raids = data.raids || [];
const dungeons = data.dungeons || [];

console.log(`Loaded ${raids.length} raids, ${dungeons.length} dungeons\n`);


// Dynamic weight multipliers: double dungeon value for team size, then equalize total raid/dungeon weight
const N_RAID = raids.length;
const N_DUNGEON = dungeons.length;
const RAID_MULTIPLIER = 1.0;
const DUNGEON_MULTIPLIER = 2 * (N_RAID / N_DUNGEON);

// Calculate placement points with exponential decay
// 1st = 100, 2nd = 50, 3rd = 25, etc. (halves each position)
// Ranks 26-100 get flat 1 point (contest completion)
function getPlacementPoints(rank) {
  if (rank > 25) return 1; // Contest completion credit
  return 100 / Math.pow(2, rank - 1);
}

// Track player scores
const playerScores = new Map(); // membershipId -> player data

// Process all entries, but only count a player's best clear per activity
function processLeaderboard(lb, isRaid) {
  const multiplier = isRaid ? RAID_MULTIPLIER : DUNGEON_MULTIPLIER;
  const activityType = isRaid ? 'raid' : 'dungeon';

  // Track best clear per player for this activity
  const bestRankByPlayer = new Map();
  const entryByPlayer = new Map();
  for (const entry of lb.entries) {
    if (!entry.players) continue;
    for (const player of entry.players) {
      if (!player.membershipId) continue;
      const key = player.membershipId;
      if (!bestRankByPlayer.has(key) || entry.rank < bestRankByPlayer.get(key)) {
        bestRankByPlayer.set(key, entry.rank);
        entryByPlayer.set(key, entry);
      }
    }
  }

  // Only count each player's best clear for this activity
  for (const [key, rank] of bestRankByPlayer.entries()) {
    const entry = entryByPlayer.get(key);
    const player = entry.players.find(p => p.membershipId === key);
    if (!player) continue;

    const placementPoints = getPlacementPoints(rank);
    const weightedPoints = placementPoints * multiplier;

    if (!playerScores.has(key)) {
      playerScores.set(key, {
        membershipId: player.membershipId,
        membershipType: player.membershipType,
        bungieName: player.bungieName || player.displayName,
        raidPoints: 0,
        dungeonPoints: 0,
        raidClears: 0,
        dungeonClears: 0,
        raidTop25: 0,
        dungeonTop25: 0,
        bestRaidRank: Infinity,
        bestDungeonRank: Infinity,
        worldFirsts: 0, // 1st place finishes
        topThrees: 0, // Top 3 finishes
        activities: []
      });
    }

    const score = playerScores.get(key);
    // Update name if we have a better one
    if (player.bungieName && player.bungieName !== 'Unknown') {
      score.bungieName = player.bungieName;
    }

    if (isRaid) {
      score.raidPoints += weightedPoints;
      score.raidClears++;
      if (rank <= 25) score.raidTop25++;
      if (rank < score.bestRaidRank) score.bestRaidRank = rank;
    } else {
      score.dungeonPoints += weightedPoints;
      score.dungeonClears++;
      if (rank <= 25) score.dungeonTop25++;
      if (rank < score.bestDungeonRank) score.bestDungeonRank = rank;
    }

    if (rank === 1) score.worldFirsts++;
    if (rank <= 3) score.topThrees++;

    score.activities.push({
      activity: lb.activity,
      type: activityType,
      rank: rank,
      points: weightedPoints
    });
  }
}

// Process raids and dungeons
for (const lb of raids) {
  processLeaderboard(lb, true);
}
for (const lb of dungeons) {
  processLeaderboard(lb, false);
}

console.log(`Processed ${playerScores.size} unique players\n`);

// Calculate totals and sort

// Bell curve normalization (z-score)
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function stddev(arr, mu) {
  return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / arr.length);
}

const raidPointsArr = Array.from(playerScores.values()).map(p => p.raidPoints);
const dungeonPointsArr = Array.from(playerScores.values()).map(p => p.dungeonPoints);
const totalPointsArr = Array.from(playerScores.values()).map(p => p.raidPoints + p.dungeonPoints);

const raidMean = mean(raidPointsArr);
const raidStd = stddev(raidPointsArr, raidMean) || 1;
const dungeonMean = mean(dungeonPointsArr);
const dungeonStd = stddev(dungeonPointsArr, dungeonMean) || 1;
const totalMean = mean(totalPointsArr);
const totalStd = stddev(totalPointsArr, totalMean) || 1;

// Optionally, rescale z-scores to 0-100
function rescaleZ(z, minZ, maxZ) {
  // Clamp z to [minZ, maxZ] then scale
  const clamped = Math.max(minZ, Math.min(maxZ, z));
  return ((clamped - minZ) / (maxZ - minZ)) * 100;
}

const allPlayers = Array.from(playerScores.values()).map(p => {
  const totalPoints = p.raidPoints + p.dungeonPoints;
  const raidZ = (p.raidPoints - raidMean) / raidStd;
  const dungeonZ = (p.dungeonPoints - dungeonMean) / dungeonStd;
  const totalZ = (totalPoints - totalMean) / totalStd;
  // For rescaling, use observed min/max z
  return {
    ...p,
    totalPoints,
    totalClears: p.raidClears + p.dungeonClears,
    totalTop25: p.raidTop25 + p.dungeonTop25,
    bestRaidRank: p.bestRaidRank === Infinity ? null : p.bestRaidRank,
    bestDungeonRank: p.bestDungeonRank === Infinity ? null : p.bestDungeonRank,
    raidZ,
    dungeonZ,
    totalZ
  };
});

// Find min/max z for rescaling
const raidZs = allPlayers.map(p => p.raidZ);
const dungeonZs = allPlayers.map(p => p.dungeonZ);
const totalZs = allPlayers.map(p => p.totalZ);
const raidMinZ = Math.min(...raidZs), raidMaxZ = Math.max(...raidZs);
const dungeonMinZ = Math.min(...dungeonZs), dungeonMaxZ = Math.max(...dungeonZs);
const totalMinZ = Math.min(...totalZs), totalMaxZ = Math.max(...totalZs);

// Add rescaled scores and assign Elite sub-tiers
function getEliteTier(score) {
  if (score >= 80) return 'S-Tier Elite';
  if (score >= 60) return 'A-Tier Elite';
  if (score >= 40) return 'B-Tier Elite';
  if (score >= 20) return 'C-Tier Elite';
  return 'D-Tier Elite';
}
for (const p of allPlayers) {
  p.raidBell = rescaleZ(p.raidZ, raidMinZ, raidMaxZ);
  p.dungeonBell = rescaleZ(p.dungeonZ, dungeonMinZ, dungeonMaxZ);
  p.totalBell = rescaleZ(p.totalZ, totalMinZ, totalMaxZ);
  p.eliteTier = getEliteTier(p.totalBell);
}

// Sort by bell curve normalized scores
const byTotal = [...allPlayers].sort((a, b) => b.totalBell - a.totalBell);
const byRaid = [...allPlayers].sort((a, b) => b.raidBell - a.raidBell);
const byDungeon = [...allPlayers].sort((a, b) => b.dungeonBell - a.dungeonBell);


// Print top players by normalized (bell curve) scores
console.log('\u2550'.repeat(120));
console.log('TOP 50 PLAYERS BY BELL CURVE NORMALIZED SCORE (0-100 scale)');
console.log('\u2550'.repeat(120));
console.log('Rank | Player Name                    | Combined | Raid | Dungeon | WFs | Top3 | Clears');
console.log('-'.repeat(120));

for (let i = 0; i < Math.min(50, byTotal.length); i++) {
  const p = byTotal[i];
  console.log(
    `${String(i + 1).padStart(4)} | ` +
    `${(p.bungieName || 'Unknown').slice(0, 30).padEnd(30)} | ` +
    `${p.totalBell.toFixed(1).padStart(8)} | ` +
    `${p.raidBell.toFixed(1).padStart(8)} | ` +
    `${p.dungeonBell.toFixed(1).padStart(8)} | ` +
    `${String(p.worldFirsts).padStart(3)} | ` +
    `${String(p.topThrees).padStart(4)} | ` +
    `${p.totalClears}`
  );
}

console.log('\n' + '═'.repeat(100));
console.log('TOP 30 RAIDERS (Raid Score Only)');
console.log('═'.repeat(100));
console.log('Rank | Player Name                    | Raid Pts | Best | Top25 | Clears');
console.log('-'.repeat(80));

for (let i = 0; i < Math.min(30, byRaid.length); i++) {
  const p = byRaid[i];
  console.log(
    `${String(i + 1).padStart(4)} | ` +
    `${(p.bungieName || 'Unknown').slice(0, 30).padEnd(30)} | ` +
    `${p.raidPoints.toFixed(1).padStart(8)} | ` +
    `${String(p.bestRaidRank || '-').padStart(4)} | ` +
    `${String(p.raidTop25).padStart(5)} | ` +
    `${p.raidClears}`
  );
}

console.log('\n' + '═'.repeat(100));
console.log('TOP 30 DUNGEON RUNNERS (Dungeon Score Only)');
console.log('═'.repeat(100));
console.log('Rank | Player Name                    | Dung Pts | Best | Top25 | Clears');
console.log('-'.repeat(80));

for (let i = 0; i < Math.min(30, byDungeon.length); i++) {
  const p = byDungeon[i];
  console.log(
    `${String(i + 1).padStart(4)} | ` +
    `${(p.bungieName || 'Unknown').slice(0, 30).padEnd(30)} | ` +
    `${p.dungeonPoints.toFixed(1).padStart(8)} | ` +
    `${String(p.bestDungeonRank || '-').padStart(4)} | ` +
    `${String(p.dungeonTop25).padStart(5)} | ` +
    `${p.dungeonClears}`
  );
}

// Stats summary
console.log('\n' + '═'.repeat(60));
console.log('STATISTICS');
console.log('═'.repeat(60));

const playersWithWF = allPlayers.filter(p => p.worldFirsts > 0);
const playersWithTop3 = allPlayers.filter(p => p.topThrees > 0);
const playersWithTop25 = allPlayers.filter(p => p.totalTop25 > 0);

console.log(`Total players in top 100: ${allPlayers.length}`);
console.log(`Players with World's First: ${playersWithWF.length}`);
console.log(`Players with Top 3 finish: ${playersWithTop3.length}`);
console.log(`Players with Top 25 finish: ${playersWithTop25.length}`);
console.log(`Players with only contest clears (26-100): ${allPlayers.length - playersWithTop25.length}`);


// Save detailed results with normalized scores
const output = {
  generated: new Date().toISOString(),
  methodology: {
    formula: '100 / 2^(rank-1) for top 25, flat 1 point for ranks 26-100',
    normalization: 'Bell curve (z-score) normalization for raid, dungeon, and combined scores; rescaled to 0-100',
    example: '1st=100, 2nd=50, 3rd=25, 4th=12.5, 5th=6.25, ..., 26th-100th=1',
    raidMultiplier: RAID_MULTIPLIER,
    dungeonMultiplier: DUNGEON_MULTIPLIER,
    raidCount: N_RAID,
    dungeonCount: N_DUNGEON,
    note: 'Dungeon scores are doubled to account for half team size, then total raid and dungeon weights are equalized. All contest mode completers get at least 1 point per clear.'
  },
  stats: {
    totalPlayers: allPlayers.length,
    playersWithWorldFirst: playersWithWF.length,
    playersWithTop3: playersWithTop3.length,
    playersWithTop25: playersWithTop25.length
  },
  rankings: {
    combined: byTotal.slice(0, 200).map((p, i) => ({
      rank: i + 1,
      bungieName: p.bungieName,
      membershipId: p.membershipId,
      membershipType: p.membershipType,
      totalBell: Math.round(p.totalBell * 10) / 10,
      raidBell: Math.round(p.raidBell * 10) / 10,
      dungeonBell: Math.round(p.dungeonBell * 10) / 10,
      eliteTier: p.eliteTier,
      worldFirsts: p.worldFirsts,
      topThrees: p.topThrees,
      totalClears: p.totalClears,
      raidClears: p.raidClears,
      dungeonClears: p.dungeonClears,
      bestRaidRank: p.bestRaidRank,
      bestDungeonRank: p.bestDungeonRank
    })),
    raidOnly: byRaid.slice(0, 100).map((p, i) => ({
      rank: i + 1,
      bungieName: p.bungieName,
      membershipId: p.membershipId,
      raidPoints: Math.round(p.raidPoints * 10) / 10,
      raidBell: Math.round(p.raidBell * 10) / 10,
      raidClears: p.raidClears,
      bestRaidRank: p.bestRaidRank
    })),
    dungeonOnly: byDungeon.slice(0, 100).map((p, i) => ({
      rank: i + 1,
      bungieName: p.bungieName,
      membershipId: p.membershipId,
      dungeonPoints: Math.round(p.dungeonPoints * 10) / 10,
      dungeonBell: Math.round(p.dungeonBell * 10) / 10,
      dungeonClears: p.dungeonClears,
      bestDungeonRank: p.bestDungeonRank
    }))
  }
};

const outputPath = path.join(projectRoot, '.pgcr-cache', 'player-rankings-weighted.json');
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\n
 Detailed results saved to ${outputPath}`);
