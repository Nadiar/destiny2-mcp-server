#!/usr/bin/env node
/**
 * Weighted Clan Analysis from World's First Leaderboards
 * 
 * Weighting system (exponential decay):
 * - 1st place = 100 points
 * - 2nd place = 50 points (gap halves each position)
 * - 3rd place = 25 points
 * - Formula: 100 / 2^(rank-1) for ranks 1-25
 * - Ranks 26-100 = 1 point flat
 * - Raids weighted 1.5x vs dungeons (6-player coordination vs 3-player)
 * - Separate rankings for raids, dungeons, and combined
 */

import fs from 'fs';
import path from 'path';

const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;
if (!BUNGIE_API_KEY) {
  console.error('BUNGIE_API_KEY environment variable required');
  process.exit(1);
}

// Load enriched leaderboard data
const scriptDir = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const projectRoot = path.resolve(scriptDir, '..');
const dataPath = path.join(projectRoot, 'leaderboard-data', 'leaderboards-enriched.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Separate raids and dungeons
const raids = data.raids || [];
const dungeons = data.dungeons || [];

console.log(`Loaded ${raids.length} raids, ${dungeons.length} dungeons\n`);

// Weight multipliers
const RAID_MULTIPLIER = 1.5;
const DUNGEON_MULTIPLIER = 1.0;

// Calculate placement points with exponential decay
// 1st = 100, 2nd = 50, 3rd = 25, etc. (halves each position)
// Ranks 26+ get flat 1 point
function getPlacementPoints(rank) {
  if (rank > 25) return 1;
  return 100 / Math.pow(2, rank - 1);
}

// Track player scores
const playerScores = new Map(); // membershipId -> { raidPoints, dungeonPoints, entries: [] }

// Process all entries
function processLeaderboard(lb, isRaid) {
  const multiplier = isRaid ? RAID_MULTIPLIER : DUNGEON_MULTIPLIER;
  const activityType = isRaid ? 'raid' : 'dungeon';
  
  for (const entry of lb.entries) {
    if (!entry.players) continue;
    
    const placementPoints = getPlacementPoints(entry.rank);
    const weightedPoints = placementPoints * multiplier;
    
    for (const player of entry.players) {
      if (!player.membershipId) continue;
      
      const key = player.membershipId;
      if (!playerScores.has(key)) {
        playerScores.set(key, {
          membershipId: player.membershipId,
          membershipType: player.membershipType,
          bungieName: player.bungieName || player.displayName,
          raidPoints: 0,
          dungeonPoints: 0,
          raidCount: 0,
          dungeonCount: 0,
          entries: []
        });
      }
      
      const score = playerScores.get(key);
      if (isRaid) {
        score.raidPoints += weightedPoints;
        score.raidCount++;
      } else {
        score.dungeonPoints += weightedPoints;
        score.dungeonCount++;
      }
      score.entries.push({
        activity: lb.activity,
        type: activityType,
        rank: entry.rank,
        points: weightedPoints
      });
    }
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

// Get top players by different metrics
const allPlayers = Array.from(playerScores.values());

const topCombined = [...allPlayers]
  .map(p => ({ ...p, totalPoints: p.raidPoints + p.dungeonPoints }))
  .sort((a, b) => b.totalPoints - a.totalPoints)
  .slice(0, 200);

const topRaiders = [...allPlayers]
  .sort((a, b) => b.raidPoints - a.raidPoints)
  .slice(0, 100);

const topDungeonRunners = [...allPlayers]
  .sort((a, b) => b.dungeonPoints - a.dungeonPoints)
  .slice(0, 100);

// Fetch clan info for top players
async function fetchClanInfo(membershipType, membershipId) {
  const url = `https://www.bungie.net/Platform/GroupV2/User/${membershipType}/${membershipId}/0/1/`;
  try {
    const response = await fetch(url, {
      headers: { 'X-API-Key': BUNGIE_API_KEY }
    });
    const data = await response.json();
    
    if (data.Response?.results?.[0]?.group) {
      const group = data.Response.results[0].group;
      return {
        groupId: group.groupId,
        name: group.name,
        clanCallsign: group.clanInfo?.clanCallsign || ''
      };
    }
  } catch (err) {
    // Ignore errors
  }
  return null;
}

// Aggregate clan scores
async function aggregateClanScores(players, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Fetching clan info for top ${players.length} ${label}...`);
  console.log(`${'='.repeat(60)}\n`);
  
  const clanScores = new Map(); // groupId -> { name, tag, raidPoints, dungeonPoints, members: [] }
  
  let processed = 0;
  for (const player of players) {
    const clan = await fetchClanInfo(player.membershipType, player.membershipId);
    processed++;
    
    if (processed % 20 === 0) {
      console.log(`  Processed ${processed}/${players.length} players...`);
    }
    
    if (!clan) continue;
    
    if (!clanScores.has(clan.groupId)) {
      clanScores.set(clan.groupId, {
        groupId: clan.groupId,
        name: clan.name,
        tag: clan.clanCallsign,
        raidPoints: 0,
        dungeonPoints: 0,
        totalPoints: 0,
        members: []
      });
    }
    
    const clanData = clanScores.get(clan.groupId);
    clanData.raidPoints += player.raidPoints;
    clanData.dungeonPoints += player.dungeonPoints;
    clanData.totalPoints += (player.raidPoints + player.dungeonPoints);
    clanData.members.push({
      name: player.bungieName,
      raidPoints: player.raidPoints,
      dungeonPoints: player.dungeonPoints,
      totalPoints: player.raidPoints + player.dungeonPoints
    });
    
    // Rate limit
    await new Promise(r => setTimeout(r, 50));
  }
  
  return clanScores;
}

// Main analysis
async function main() {
  // Get clan scores from top 200 combined players
  const clanScores = await aggregateClanScores(topCombined, 'combined players');

  const clansArray = Array.from(clanScores.values());

  // Bell curve normalization (z-score)
  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
  function stddev(arr, mu) {
    return Math.sqrt(arr.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / arr.length);
  }

  const raidPointsArr = clansArray.map(c => c.raidPoints);
  const dungeonPointsArr = clansArray.map(c => c.dungeonPoints);
  const totalPointsArr = clansArray.map(c => c.totalPoints);

  const raidMean = mean(raidPointsArr);
  const raidStd = stddev(raidPointsArr, raidMean) || 1;
  const dungeonMean = mean(dungeonPointsArr);
  const dungeonStd = stddev(dungeonPointsArr, dungeonMean) || 1;
  const totalMean = mean(totalPointsArr);
  const totalStd = stddev(totalPointsArr, totalMean) || 1;

  function rescaleZ(z, minZ, maxZ) {
    const clamped = Math.max(minZ, Math.min(maxZ, z));
    return ((clamped - minZ) / (maxZ - minZ)) * 100;
  }

  // Add z-scores and rescaled bell scores
  for (const c of clansArray) {
    c.raidZ = (c.raidPoints - raidMean) / raidStd;
    c.dungeonZ = (c.dungeonPoints - dungeonMean) / dungeonStd;
    c.totalZ = (c.totalPoints - totalMean) / totalStd;
  }
  const raidZs = clansArray.map(c => c.raidZ);
  const dungeonZs = clansArray.map(c => c.dungeonZ);
  const totalZs = clansArray.map(c => c.totalZ);
  const raidMinZ = Math.min(...raidZs), raidMaxZ = Math.max(...raidZs);
  const dungeonMinZ = Math.min(...dungeonZs), dungeonMaxZ = Math.max(...dungeonZs);
  const totalMinZ = Math.min(...totalZs), totalMaxZ = Math.max(...totalZs);
  for (const c of clansArray) {
    c.raidBell = rescaleZ(c.raidZ, raidMinZ, raidMaxZ);
    c.dungeonBell = rescaleZ(c.dungeonZ, dungeonMinZ, dungeonMaxZ);
    c.totalBell = rescaleZ(c.totalZ, totalMinZ, totalMaxZ);
  }

  // Sort by different metrics
  const byCombined = [...clansArray].sort((a, b) => b.totalPoints - a.totalPoints);
  const byRaid = [...clansArray].sort((a, b) => b.raidPoints - a.raidPoints);
  const byDungeon = [...clansArray].sort((a, b) => b.dungeonPoints - a.dungeonPoints);
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log('TOP 25 CLANS BY WEIGHTED COMBINED SCORE (Raids 1.5x)');
  console.log(`${'═'.repeat(70)}`);
  console.log('Rank | Tag      | Clan Name                    | Combined | Raid Pts | Dung Pts | Members');
  console.log('-'.repeat(95));
  
  for (let i = 0; i < Math.min(25, byCombined.length); i++) {
    const c = byCombined[i];
    console.log(
      `${String(i + 1).padStart(4)} | ` +
      `${c.tag.padEnd(8)} | ` +
      `${c.name.slice(0, 28).padEnd(28)} | ` +
      `${c.totalPoints.toFixed(1).padStart(8)} | ` +
      `${c.raidPoints.toFixed(1).padStart(8)} | ` +
      `${c.dungeonPoints.toFixed(1).padStart(8)} | ` +
      `${c.members.length}`
    );
  }
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log('TOP 25 CLANS BY RAID SCORE ONLY (weighted by placement)');
  console.log(`${'═'.repeat(70)}`);
  console.log('Rank | Tag      | Clan Name                    | Raid Pts | Members');
  console.log('-'.repeat(70));
  
  for (let i = 0; i < Math.min(25, byRaid.length); i++) {
    const c = byRaid[i];
    console.log(
      `${String(i + 1).padStart(4)} | ` +
      `${c.tag.padEnd(8)} | ` +
      `${c.name.slice(0, 28).padEnd(28)} | ` +
      `${c.raidPoints.toFixed(1).padStart(8)} | ` +
      `${c.members.length}`
    );
  }
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log('TOP 25 CLANS BY DUNGEON SCORE ONLY (weighted by placement)');
  console.log(`${'═'.repeat(70)}`);
  console.log('Rank | Tag      | Clan Name                    | Dung Pts | Members');
  console.log('-'.repeat(70));
  
  for (let i = 0; i < Math.min(25, byDungeon.length); i++) {
    const c = byDungeon[i];
    console.log(
      `${String(i + 1).padStart(4)} | ` +
      `${c.tag.padEnd(8)} | ` +
      `${c.name.slice(0, 28).padEnd(28)} | ` +
      `${c.dungeonPoints.toFixed(1).padStart(8)} | ` +
      `${c.members.length}`
    );
  }
  
  // Save detailed results with normalized scores
  const output = {
    generated: new Date().toISOString(),
    methodology: {
      formula: '100 / 2^(rank-1) for top 25, flat 1 point for ranks 26-100',
      normalization: 'Bell curve (z-score) normalization for raid, dungeon, and combined scores; rescaled to 0-100',
      example: '1st=100, 2nd=50, 3rd=25, 4th=12.5, 5th=6.25, ..., 26th+=1',
      raidMultiplier: RAID_MULTIPLIER,
      dungeonMultiplier: DUNGEON_MULTIPLIER,
      sampleSize: 'Top 200 players by combined weighted score'
    },
    rankings: {
      combined: byCombined.slice(0, 50).map((c, i) => ({
        rank: i + 1,
        tag: c.tag,
        name: c.name,
        groupId: c.groupId,
        totalPoints: Math.round(c.totalPoints * 10) / 10,
        totalBell: Math.round(c.totalBell * 10) / 10,
        raidPoints: Math.round(c.raidPoints * 10) / 10,
        raidBell: Math.round(c.raidBell * 10) / 10,
        dungeonPoints: Math.round(c.dungeonPoints * 10) / 10,
        dungeonBell: Math.round(c.dungeonBell * 10) / 10,
        memberCount: c.members.length
      })),
      raidOnly: byRaid.slice(0, 50).map((c, i) => ({
        rank: i + 1,
        tag: c.tag,
        name: c.name,
        groupId: c.groupId,
        raidPoints: Math.round(c.raidPoints * 10) / 10,
        raidBell: Math.round(c.raidBell * 10) / 10,
        memberCount: c.members.length
      })),
      dungeonOnly: byDungeon.slice(0, 50).map((c, i) => ({
        rank: i + 1,
        tag: c.tag,
        name: c.name,
        groupId: c.groupId,
        dungeonPoints: Math.round(c.dungeonPoints * 10) / 10,
        dungeonBell: Math.round(c.dungeonBell * 10) / 10,
        memberCount: c.members.length
      }))
    }
  };
  
  const outputPath = path.join(projectRoot, '.pgcr-cache', 'elite-clans-weighted.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\n	 Detailed results saved to ${outputPath}`);
}

main().catch(console.error);
