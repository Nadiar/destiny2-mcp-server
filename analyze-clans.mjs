// Fetch clan info for top players to build elite clans list
import fs from 'fs/promises';

const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;
const RATE_LIMIT_MS = 150;

let lastRequestTime = 0;
async function fetchBungie(url) {
  const now = Date.now();
  if (now - lastRequestTime < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - (now - lastRequestTime)));
  }
  lastRequestTime = Date.now();
  
  const res = await fetch(url, { headers: { 'X-API-Key': BUNGIE_API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).Response;
}

const data = JSON.parse(await fs.readFile('leaderboard-data/leaderboards-enriched.json', 'utf-8'));

// Collect all unique players
const players = new Map();
for (const lb of [...data.raids, ...data.dungeons]) {
  for (const entry of lb.entries) {
    for (const p of entry.players) {
      if (p.membershipId) {
        if (!players.has(p.membershipId)) {
          players.set(p.membershipId, {
            membershipId: p.membershipId,
            membershipType: p.membershipType,
            bungieName: p.bungieName,
            completions: 0
          });
        }
        players.get(p.membershipId).completions++;
      }
    }
  }
}

// Sort by completions and take top 200
const topPlayers = Array.from(players.values())
  .sort((a, b) => b.completions - a.completions)
  .slice(0, 200);

console.log(`Fetching clan info for ${topPlayers.length} top players...\n`);

const clans = new Map(); // groupId -> { name, tag, members: [], totalCompletions }

for (let i = 0; i < topPlayers.length; i++) {
  const p = topPlayers[i];
  process.stdout.write(`\r${i+1}/${topPlayers.length}...`);
  
  try {
    const groups = await fetchBungie(
      `https://www.bungie.net/Platform/GroupV2/User/${p.membershipType}/${p.membershipId}/0/1/`
    );
    
    const destiny2Clan = groups?.results?.find(g => g.group?.groupType === 1);
    if (destiny2Clan) {
      const clan = destiny2Clan.group;
      const groupId = String(clan.groupId);
      
      if (!clans.has(groupId)) {
        clans.set(groupId, {
          groupId,
          name: clan.name,
          tag: clan.clanInfo?.clanCallsign || '',
          members: [],
          totalCompletions: 0
        });
      }
      
      clans.get(groupId).members.push(p.bungieName);
      clans.get(groupId).totalCompletions += p.completions;
    }
  } catch (e) {
    // Skip on error
  }
}

console.log(`\n\nFound ${clans.size} unique clans\n`);

// Sort by total completions
const sortedClans = Array.from(clans.values())
  .sort((a, b) => b.totalCompletions - a.totalCompletions);

console.log('Top 50 Elite Clans by Contest Completions:');
console.log('=========================================\n');

for (let i = 0; i < Math.min(50, sortedClans.length); i++) {
  const c = sortedClans[i];
  console.log(`${i+1}. [${c.tag}] ${c.name}`);
  console.log(`   GroupId: ${c.groupId}`);
  console.log(`   Total completions: ${c.totalCompletions}`);
  console.log(`   Members in top 200: ${c.members.slice(0, 5).join(', ')}${c.members.length > 5 ? ` (+${c.members.length - 5} more)` : ''}`);
  console.log('');
}

// Output as JSON for easy import
await fs.writeFile('.pgcr-cache/elite-clans-from-leaderboards.json', JSON.stringify(sortedClans, null, 2));
console.log('\nSaved to .pgcr-cache/elite-clans-from-leaderboards.json');
