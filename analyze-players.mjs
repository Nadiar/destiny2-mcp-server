// Analyze leaderboard data to find elite clans
import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('leaderboard-data/leaderboards-enriched.json', 'utf-8'));

// Collect all unique players with their membership info
const players = new Map();

for (const lb of [...data.raids, ...data.dungeons]) {
  for (const entry of lb.entries) {
    for (const p of entry.players) {
      if (p.membershipId && !players.has(p.membershipId)) {
        players.set(p.membershipId, {
          membershipId: p.membershipId,
          membershipType: p.membershipType,
          bungieName: p.bungieName,
          activities: []
        });
      }
      if (p.membershipId) {
        players.get(p.membershipId).activities.push({
          activity: lb.activity,
          rank: entry.rank
        });
      }
    }
  }
}

console.log(`Found ${players.size} unique players across all leaderboards`);
console.log(`\nTop 20 most decorated players:`);

const sorted = Array.from(players.values())
  .sort((a, b) => b.activities.length - a.activities.length)
  .slice(0, 20);

for (const p of sorted) {
  console.log(`${p.bungieName} - ${p.activities.length} contest completions (${p.membershipType}/${p.membershipId})`);
}
