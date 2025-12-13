import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BungieApiClient } from '../api/index.js';
import { ManifestCache } from '../services/index.js';
import {
  DestinyClass,
  DestinyRace,
  DestinyGender,
  DestinyActivityModeType,
  DestinyComponentType,
  DestinyActivityHistoryEntry,
} from '../types/index.js';
import {
  getDayOneTriumphHashes,
  getDayOneBoost,
  countDayOneTriumphs,
  isEliteClan,
  getEliteClanBoost,
  ELITE_CLANS,
  type DayOneTriumph,
} from '../data/day-one-triumphs.js';

// Bungie API hashes are unsigned 32-bit integers
const DestinyHashSchema = z.number().int().min(0).max(4294967295);

// Bounded concurrency helper to prevent API exhaustion
async function batchExecute<T, R>(
  items: T[],
  batchSize: number,
  executor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(executor));
    results.push(...batchResults);
  }
  return results;
}

function getClassName(classType: DestinyClass): string {
  switch (classType) {
    case DestinyClass.Titan:
      return 'Titan';
    case DestinyClass.Hunter:
      return 'Hunter';
    case DestinyClass.Warlock:
      return 'Warlock';
    default:
      return 'Unknown';
  }
}

function getRaceName(raceType: DestinyRace): string {
  switch (raceType) {
    case DestinyRace.Human:
      return 'Human';
    case DestinyRace.Awoken:
      return 'Awoken';
    case DestinyRace.Exo:
      return 'Exo';
    default:
      return 'Unknown';
  }
}

function getGenderName(genderType: DestinyGender): string {
  switch (genderType) {
    case DestinyGender.Male:
      return 'Male';
    case DestinyGender.Female:
      return 'Female';
    default:
      return 'Unknown';
  }
}

function getMembershipTypeName(type: number): string {
  switch (type) {
    case 1:
      return 'Xbox';
    case 2:
      return 'PlayStation';
    case 3:
      return 'Steam';
    case 4:
      return 'Blizzard';
    case 5:
      return 'Stadia';
    case 6:
      return 'Epic Games';
    case 254:
      return 'Bungie.net';
    default:
      return 'Unknown';
  }
}

export function registerTools(
  server: McpServer,
  client: BungieApiClient,
  manifestCache: ManifestCache
): void {
  server.tool(
    'search_player',
    'EXACT MATCH ONLY: Search for a Destiny 2 player when you have their complete Bungie Name with code (e.g., "Guardian#1234"). If you only have a partial name or don\'t know the #code, use find_players instead which does fuzzy matching.',
    {
      bungieName: z
        .string()
        .describe(
          'Complete Bungie Name in format "DisplayName#Code" (e.g., "Datto#6446", "ATP#6173"). IMPORTANT: You must have the exact 4-digit code. If you don\'t know the code, use find_players tool instead for fuzzy search.'
        ),
    },
    async ({ bungieName }) => {
      const match = bungieName.match(/^(.+)#(\d+)$/);
      if (!match) {
        return {
          content: [
            {
              type: 'text',
              text: 'Invalid Bungie Name format. Please use "DisplayName#Code" (e.g., "Guardian#1234"). For partial name search without the #code, use find_players instead.',
            },
          ],
          isError: true,
        };
      }

      const [, displayName, codeStr] = match;
      const displayNameCode = parseInt(codeStr, 10);

      try {
        const results = await client.searchPlayerByExactName(displayName, displayNameCode);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No player found with Bungie Name: ${bungieName}`,
              },
            ],
          };
        }

        const formatted = results
          .map((m) => `- ${getMembershipTypeName(m.membershipType)}: ${m.membershipId}`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found player ${bungieName}:\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching for player: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'find_players',
    'Fuzzy search for Destiny 2 players by partial name. Returns multiple matches sorted by confidence (0-100+), with cross-save primary account detection. Confidence weighs: recency (25%), playtime (25%), lifetime triumphs (15%), active triumphs (15%), clan (10%), plus bonuses for day-one raid clears and elite clan status. Identifies which platform is the cross-save primary for activity lookups.',
    {
      namePrefix: z
        .string()
        .describe(
          'ANY part of player name to search for - just type what you know (e.g., "Datto" finds "Datto#6446", "ATP" finds "ATP#6173", "bog" finds "Bog on my dog#7426"). Does NOT require the #code. Case-insensitive fuzzy matching.'
        ),
    },
    async ({ namePrefix }) => {
      try {
        const response = await client.searchPlayer(namePrefix, 0);

        if (!response.searchResults || response.searchResults.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No players found matching "${namePrefix}". Try a different name or spelling.`,
              },
            ],
          };
        }

        // Fetch profile data for each result to calculate confidence scores
        interface PlayerResult {
          fullId: string;
          memberships: Array<{
            platform: string;
            id: string;
            membershipType: number;
            isPrimary: boolean;
            isCrossSaved: boolean;
          }>;
          primaryPlatform: string | null;
          primaryMembershipType: number | null;
          primaryMembershipId: string | null;
          confidence: number;
          confidenceLabel: string;
          totalPlaytimeHours: number;
          lastPlayed: Date | null;
          activeScore: number;
          lifetimeScore: number;
          daysSinceLastPlayed: number;
          hasClan: boolean;
          clanName: string | null;
          clanTag: string | null;
          inEliteClan: boolean;
          dayOneCount: number;
          dayOneTriumphs: DayOneTriumph[];
        }

        const playerResults: PlayerResult[] = await Promise.all(
          response.searchResults.map(async (result) => {
            const fullId = `${result.bungieGlobalDisplayName}#${result.bungieGlobalDisplayNameCode}`;
            const memberships: Array<{
              platform: string;
              id: string;
              membershipType: number;
              isPrimary: boolean;
              isCrossSaved: boolean;
            }> = [];

            let totalPlaytimeHours = 0;
            let lastPlayed: Date | null = null;
            let activeScore = 0;
            let lifetimeScore = 0;
            let hasClan = false;
            let clanName: string | null = null;
            let clanTag: string | null = null;
            let dayOneCount = 0;
            let dayOneTriumphs: DayOneTriumph[] = [];
            let primaryPlatform: string | null = null;
            let primaryMembershipType: number | null = null;
            let primaryMembershipId: string | null = null;

            if (result.destinyMemberships && result.destinyMemberships.length > 0) {
              // Determine the cross-save primary account
              // crossSaveOverride indicates which platform is primary (0 = no cross-save, otherwise it's the primary type)
              const crossSaveType = result.destinyMemberships[0].crossSaveOverride;
              const hasCrossSave = crossSaveType !== 0;

              // Find the primary membership (the one matching crossSaveOverride, or first if no cross-save)
              const primary = hasCrossSave
                ? result.destinyMemberships.find((m) => m.membershipType === crossSaveType) ||
                  result.destinyMemberships[0]
                : result.destinyMemberships[0];

              primaryPlatform = getMembershipTypeName(primary.membershipType);
              primaryMembershipType = primary.membershipType;
              primaryMembershipId = primary.membershipId;

              for (const membership of result.destinyMemberships) {
                const isPrimary = membership.membershipType === primary.membershipType;
                memberships.push({
                  platform: getMembershipTypeName(membership.membershipType),
                  id: membership.membershipId,
                  membershipType: membership.membershipType,
                  isPrimary,
                  isCrossSaved: hasCrossSave,
                });
              }

              // Fetch profile data for confidence calculation
              try {
                const [profile, clanData] = await Promise.all([
                  client.getProfile(primary.membershipType, primary.membershipId, [
                    DestinyComponentType.Profiles,
                    DestinyComponentType.Characters,
                    DestinyComponentType.Records,
                  ]),
                  client
                    .getGroupsForMember(primary.membershipType, primary.membershipId)
                    .catch(() => null),
                ]);

                if (profile.profile?.data) {
                  lastPlayed = new Date(profile.profile.data.dateLastPlayed);
                }

                if (profile.profileRecords?.data) {
                  activeScore = profile.profileRecords.data.activeScore || 0;
                  lifetimeScore = profile.profileRecords.data.lifetimeScore || 0;

                  // Check for day-one raid triumphs
                  const records = profile.profileRecords.data.records;
                  if (records) {
                    const dayOneHashes = getDayOneTriumphHashes();
                    const completedDayOneHashes: number[] = [];

                    for (const hash of dayOneHashes) {
                      const record = records[hash];
                      // A triumph is complete if ObjectiveNotCompleted bit (4) is NOT set
                      // State=0 means fully complete, no flags set
                      if (record && (record.state & 4) === 0) {
                        completedDayOneHashes.push(hash);
                      }
                    }

                    const dayOneResult = countDayOneTriumphs(completedDayOneHashes);
                    dayOneCount = dayOneResult.count;
                    dayOneTriumphs = dayOneResult.triumphs;
                  }
                }

                if (profile.characters?.data) {
                  for (const char of Object.values(profile.characters.data)) {
                    totalPlaytimeHours += parseInt(char.minutesPlayedTotal) / 60;
                  }
                }

                // Extract clan info
                if (clanData?.results && clanData.results.length > 0) {
                  hasClan = true;
                  const clan = clanData.results[0];
                  clanName = clan.group.name;
                  clanTag = clan.group.clanInfo?.clanCallsign || null;
                }
              } catch {
                // Profile may be private or unavailable
              }
            }

            // Calculate days since last played
            const daysSinceLastPlayed = lastPlayed
              ? Math.floor((Date.now() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24))
              : 9999;

            // Calculate confidence score (0-100 base, can exceed with day-one bonus)
            // UPDATED weights to emphasize recency + playtime for better disambiguation:
            // Base weights: recency (25%), playtime (25%), lifetime triumph (15%), active triumph (15%), clan (10%)
            // Day-one raid bonus: +15-50 depending on number of clears
            let confidence = 0;

            // Recency score (0-25): played in last 30 days = max, steep decay after
            // This is KEY for finding the "real" player - active players are almost always the right match
            let recencyScore = 0;
            if (daysSinceLastPlayed <= 30) {
              recencyScore = 25; // Max score for recent activity
            } else if (daysSinceLastPlayed <= 90) {
              recencyScore = 15 + 10 * (1 - (daysSinceLastPlayed - 30) / 60);
            } else if (daysSinceLastPlayed <= 365) {
              recencyScore = 15 * (1 - (daysSinceLastPlayed - 90) / 275);
            }
            // No points for >365 days inactive
            confidence += recencyScore;

            // Playtime score (0-25): scaled for heavy investment
            // 100 hours = 10 pts, 500 hours = 18 pts, 1000+ hours = 22-25 pts
            const playtimeScore = Math.min(
              25,
              (Math.log10(totalPlaytimeHours + 1) / Math.log10(1001)) * 25
            );
            confidence += playtimeScore;

            // Lifetime triumph score (0-15): 100k+ = max
            const lifetimeScorePoints = Math.min(15, (lifetimeScore / 100000) * 15);
            confidence += lifetimeScorePoints;

            // Active triumph score (0-15): 20k+ = max
            const activeScorePoints = Math.min(15, (activeScore / 20000) * 15);
            confidence += activeScorePoints;

            // Clan bonus (0-10 for any clan, extra for elite clans)
            if (hasClan) {
              confidence += 10;
              // Elite clan bonus (verified competitive/endgame clans)
              confidence += getEliteClanBoost(clanTag || undefined);
            }

            // Check if player is in an elite clan
            const inEliteClan = isEliteClan(clanTag || undefined);

            // Day-one raid bonus (verified elite status via triumph completion)
            const completedDayOneHashes = dayOneTriumphs.map((t) => t.hash);
            confidence += getDayOneBoost(completedDayOneHashes);

            // Round to nearest integer (can exceed 100 for day-one raiders or elite clan members)
            confidence = Math.round(confidence);

            // Confidence label - emphasize activity level
            let confidenceLabel: string;
            if (dayOneCount >= 3) {
              confidenceLabel = `Elite (${dayOneCount} Day-One Clears!)`;
            } else if (dayOneCount >= 1) {
              confidenceLabel = `Proven Raider (${dayOneCount} Day-One Clear${dayOneCount > 1 ? 's' : ''})`;
            } else if (inEliteClan) {
              confidenceLabel = 'Elite Clan Member';
            } else if (confidence >= 80) {
              confidenceLabel = 'Very High (Active Veteran)';
            } else if (confidence >= 60) {
              confidenceLabel = 'High (Active Player)';
            } else if (confidence >= 40) {
              confidenceLabel = 'Medium (Semi-Active)';
            } else if (confidence >= 20) {
              confidenceLabel = 'Low (Inactive/New)';
            } else {
              confidenceLabel = 'Very Low (Inactive - Likely Not Target)';
            }

            return {
              fullId,
              memberships,
              confidence,
              confidenceLabel,
              totalPlaytimeHours: Math.round(totalPlaytimeHours),
              lastPlayed,
              activeScore,
              lifetimeScore,
              daysSinceLastPlayed,
              hasClan,
              clanName,
              clanTag,
              inEliteClan,
              dayOneCount,
              dayOneTriumphs,
              primaryPlatform,
              primaryMembershipType,
              primaryMembershipId,
            };
          })
        );

        // Sort by confidence score (highest first)
        playerResults.sort((a, b) => b.confidence - a.confidence);

        let output = `# Players matching "${namePrefix}"\n\n`;
        output += `Found ${playerResults.length} result(s)${response.hasMore ? ' (more available)' : ''}, sorted by confidence:\n\n`;
        output += `> **Confidence Score** weighs: recency (25%), playtime (25%), lifetime triumph (15%), active triumph (15%), clan (10%), plus bonus for verified day-one raid clears and elite clan membership. **Recently active players with more hours are most likely the correct match.**\n\n`;
        output += `> **⚡ PRIMARY** indicates the cross-save primary account - use this for activity lookups!\n\n`;

        for (const result of playerResults) {
          output += `## ${result.fullId}`;
          if (result.dayOneCount > 0) {
            output += ` 🏆`;
          }
          if (result.inEliteClan) {
            output += ` ⭐`;
          }
          output += `\n`;
          output += `**Confidence:** ${result.confidence}/100 - ${result.confidenceLabel}\n`;

          // Highlight primary account prominently
          if (result.primaryPlatform && result.primaryMembershipId) {
            output += `**⚡ PRIMARY ACCOUNT:** ${result.primaryPlatform} (type: ${result.primaryMembershipType}, id: ${result.primaryMembershipId})\n`;
          }

          if (result.memberships.length > 0) {
            output += `**All Platforms:**\n`;
            for (const membership of result.memberships) {
              if (membership.isPrimary) {
                output += `- **${membership.platform}:** ${membership.id} ⚡ PRIMARY\n`;
              } else if (membership.isCrossSaved) {
                output += `- ${membership.platform}: ${membership.id} (linked)\n`;
              } else {
                output += `- **${membership.platform}:** ${membership.id}\n`;
              }
            }
          } else {
            output += `- No active Destiny 2 memberships\n`;
          }

          // Show stats that contributed to score
          if (result.totalPlaytimeHours > 0 || result.lifetimeScore > 0) {
            output += `- **Playtime:** ${result.totalPlaytimeHours.toLocaleString()} hours\n`;
            output += `- **Triumph:** ${result.activeScore.toLocaleString()} active / ${result.lifetimeScore.toLocaleString()} lifetime\n`;
            if (result.lastPlayed) {
              output += `- **Last Played:** ${result.lastPlayed.toLocaleDateString()} (${result.daysSinceLastPlayed} days ago)\n`;
            }
            if (result.hasClan && result.clanName) {
              output += `- **Clan:** ${result.clanName}${result.clanTag ? ` [${result.clanTag}]` : ''}`;
              if (result.inEliteClan) {
                output += ` ⭐ (Elite Clan)`;
              }
              output += `\n`;
            } else {
              output += `- **Clan:** None\n`;
            }
            // Show day-one triumphs
            if (result.dayOneCount > 0) {
              output += `- **Day-One Clears:** ${result.dayOneCount} 🏆\n`;
              for (const triumph of result.dayOneTriumphs) {
                output += `  - ${triumph.name} (${triumph.raid})\n`;
              }
            }
          } else {
            output += `- *Profile data unavailable (may be private)*\n`;
          }
          output += '\n';
        }

        output += `*Use search_player with the full Bungie ID (Name#Code) for exact lookup. 🏆 = Day-one clears. ⭐ = Elite clan.*`;

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching for players: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_profile',
    'Get a Destiny 2 player profile with characters, clan, triumph score, and account info',
    {
      membershipType: z.number().describe('Platform type (1=Xbox, 2=PS, 3=Steam, 6=Epic)'),
      membershipId: z.string().describe('Destiny membership ID'),
    },
    async ({ membershipType, membershipId }) => {
      try {
        // Fetch profile, clan, and linked profiles in parallel
        const [profile, clanData, linkedProfiles] = await Promise.all([
          client.getProfile(membershipType, membershipId, [
            DestinyComponentType.Profiles,
            DestinyComponentType.Characters,
            DestinyComponentType.CharacterEquipment,
            DestinyComponentType.Records,
          ]),
          client.getGroupsForMember(membershipType, membershipId).catch(() => null),
          client.getLinkedProfiles(membershipType, membershipId).catch(() => null),
        ]);

        if (!profile.profile?.data) {
          return {
            content: [
              {
                type: 'text',
                text: 'Profile data not available (may be private)',
              },
            ],
          };
        }

        // Get account creation date if we have bnet membership
        let accountCreated: string | null = null;
        if (linkedProfiles?.bnetMembership?.membershipId) {
          try {
            const bnetUser = await client.getBungieNetUser(
              linkedProfiles.bnetMembership.membershipId
            );
            if (bnetUser.firstAccess) {
              accountCreated = new Date(bnetUser.firstAccess).toLocaleDateString();
            }
          } catch {
            // Ignore if we can't get bnet user
          }
        }

        const profileData = profile.profile.data;
        const userInfo = profileData.userInfo;
        const displayName = userInfo.bungieGlobalDisplayName || userInfo.displayName;
        const displayCode = userInfo.bungieGlobalDisplayNameCode || '';

        let output = `# Profile: ${displayName}#${displayCode}\n\n`;
        output += `**Platform:** ${getMembershipTypeName(userInfo.membershipType)}\n`;
        if (accountCreated) {
          output += `**Account Created:** ${accountCreated}\n`;
        }
        output += `**Last Played:** ${new Date(profileData.dateLastPlayed).toLocaleString()}\n`;

        // Add triumph score if available
        const records = profile.profileRecords?.data;
        if (records) {
          output += `\n## Triumph Score\n`;
          output += `**Active Score:** ${records.activeScore?.toLocaleString() || 'N/A'}\n`;
          output += `**Lifetime Score:** ${records.lifetimeScore?.toLocaleString() || 'N/A'}\n`;
          output += `**Legacy Score:** ${records.legacyScore?.toLocaleString() || 'N/A'}\n`;
        }

        // Add clan info if available
        if (clanData?.results && clanData.results.length > 0) {
          const clan = clanData.results[0];
          const clanTag = clan.group.clanInfo?.clanCallsign || '';
          const clanName = clan.group.name;
          const memberCount = clan.group.memberCount;
          const joinDate = new Date(clan.member.joinDate).toLocaleDateString();

          output += `\n## Clan\n`;
          output += `**Name:** ${clanName} [${clanTag}]\n`;
          output += `**Members:** ${memberCount}\n`;
          output += `**Joined:** ${joinDate}\n`;
          if (clan.group.motto) {
            output += `**Motto:** "${clan.group.motto}"\n`;
          }
        } else {
          output += `\n**Clan:** Not in a clan\n`;
        }

        output += '\n';

        if (profile.characters?.data) {
          output += '## Characters\n\n';
          for (const [charId, char] of Object.entries(profile.characters.data)) {
            const className = getClassName(char.classType);
            const raceName = getRaceName(char.raceType);
            const genderName = getGenderName(char.genderType);
            const hoursPlayed = Math.round(parseInt(char.minutesPlayedTotal) / 60);

            output += `### ${className} (${char.light} Power)\n`;
            output += `- **ID:** ${charId}\n`;
            output += `- **Race/Gender:** ${raceName} ${genderName}\n`;
            output += `- **Time Played:** ${hoursPlayed} hours\n`;
            output += `- **Last Played:** ${new Date(char.dateLastPlayed).toLocaleString()}\n\n`;
          }
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_character',
    'Get detailed information about a specific Destiny 2 character',
    {
      membershipType: z.number().describe('Platform type'),
      membershipId: z.string().describe('Destiny membership ID'),
      characterId: z.string().describe('Character ID'),
    },
    async ({ membershipType, membershipId, characterId }) => {
      try {
        const result = await client.getCharacter(membershipType, membershipId, characterId);

        if (!result.character?.data) {
          return {
            content: [
              {
                type: 'text',
                text: 'Character data not available',
              },
            ],
          };
        }

        const char = result.character.data;
        const className = getClassName(char.classType);
        const raceName = getRaceName(char.raceType);
        const genderName = getGenderName(char.genderType);
        const hoursPlayed = Math.round(parseInt(char.minutesPlayedTotal) / 60);

        let output = `# ${className} Character\n\n`;
        output += `**Power Level:** ${char.light}\n`;
        output += `**Race:** ${raceName}\n`;
        output += `**Gender:** ${genderName}\n`;
        output += `**Time Played:** ${hoursPlayed} hours\n`;
        output += `**Last Session:** ${char.minutesPlayedThisSession} minutes\n`;
        output += `**Last Played:** ${char.dateLastPlayed}\n\n`;

        if (char.stats) {
          output += '## Stats\n\n';
          const statNames: Record<string, string> = {
            '2996146975': 'Mobility',
            '392767087': 'Resilience',
            '1943323491': 'Recovery',
            '1735777505': 'Discipline',
            '144602215': 'Intellect',
            '4244567218': 'Strength',
          };

          for (const [hash, value] of Object.entries(char.stats)) {
            const name = statNames[hash] || hash;
            output += `- **${name}:** ${value}\n`;
          }
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching character: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_activity_history',
    'Get recent activity history for a character with resolved activity names and time played. Includes completion status, kills, deaths, and assists per activity.',
    {
      membershipType: z.number().describe('Platform type'),
      membershipId: z.string().describe('Destiny membership ID'),
      characterId: z.string().describe('Character ID'),
      mode: z.number().optional().describe('Activity mode (0=All, 4=Raid, 5=PvP, 82=Dungeon)'),
      count: z.number().optional().describe('Number of activities to return (default: 10)'),
    },
    async ({ membershipType, membershipId, characterId, mode = 0, count = 10 }) => {
      try {
        const result = await client.getActivityHistory(
          membershipType,
          membershipId,
          characterId,
          mode as DestinyActivityModeType,
          count
        );

        if (!result.activities || result.activities.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No activities found',
              },
            ],
          };
        }

        // Collect unique activity hashes to resolve names
        const activityHashes = [
          ...new Set(result.activities.map((a) => a.activityDetails.directorActivityHash)),
        ];

        // Resolve activity names in parallel
        const activityNames: Record<number, string> = {};
        await batchExecute(
          activityHashes,
          5, // Max 5 concurrent API calls
          async (hash) => {
            try {
              const def = await client.getActivityDefinition(hash);
              const displayProps = def as { displayProperties?: { name?: string } };
              activityNames[hash] = displayProps.displayProperties?.name || `Unknown (${hash})`;
            } catch {
              activityNames[hash] = `Unknown (${hash})`;
            }
          }
        );

        let output = '# Recent Activities\n\n';
        let totalTimePlayedSeconds = 0;

        for (const activity of result.activities) {
          const date = new Date(activity.period).toLocaleDateString();
          const time = new Date(activity.period).toLocaleTimeString();
          const instanceId = activity.activityDetails.instanceId;
          const activityHash = activity.activityDetails.directorActivityHash;
          const activityName = activityNames[activityHash] || `Unknown (${activityHash})`;
          const modeName =
            DestinyActivityModeType[activity.activityDetails.mode] ||
            String(activity.activityDetails.mode);

          output += `## ${activityName}\n`;
          output += `- **Date:** ${date} ${time}\n`;
          output += `- **Mode:** ${modeName}\n`;
          output += `- **Instance ID:** ${instanceId}\n`;

          if (activity.values.completed) {
            output += `- **Completed:** ${activity.values.completed.basic.displayValue}\n`;
          }
          // Add duration info
          if (activity.values.timePlayedSeconds) {
            const seconds = activity.values.timePlayedSeconds.basic.value;
            totalTimePlayedSeconds += seconds;
            output += `- **Time Played:** ${activity.values.timePlayedSeconds.basic.displayValue}\n`;
          }
          if (activity.values.kills) {
            output += `- **Kills:** ${activity.values.kills.basic.displayValue}\n`;
          }
          if (activity.values.deaths) {
            output += `- **Deaths:** ${activity.values.deaths.basic.displayValue}\n`;
          }
          if (activity.values.assists) {
            output += `- **Assists:** ${activity.values.assists.basic.displayValue}\n`;
          }
          output += '\n';
        }

        // Add summary with total time
        const totalHours = Math.floor(totalTimePlayedSeconds / 3600);
        const totalMinutes = Math.floor((totalTimePlayedSeconds % 3600) / 60);
        output += `---\n**Total Time in ${result.activities.length} Activities:** ${totalHours}h ${totalMinutes}m\n`;

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching activities: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_activity_stats',
    'Get aggregated activity statistics with customizable fields and pagination. Can fetch beyond 250 activities by using multiple pages. Perfect for calculating total time spent in specific activities like "Ghosts of the Deep".',
    {
      membershipType: z.number().describe('Platform type (1=Xbox, 2=PS, 3=Steam, 6=Epic)'),
      membershipId: z.string().describe('Destiny membership ID'),
      characterId: z.string().describe('Character ID'),
      mode: z.number().optional().describe('Activity mode filter (0=All, 4=Raid, 5=PvP, 82=Dungeon, 46=Nightfall)'),
      activityHash: z.number().optional().describe('Filter to specific activity by hash (e.g., Ghosts of the Deep hash). Use search_items or get_activity_definition to find hashes.'),
      maxActivities: z.number().optional().describe('Maximum activities to fetch (default: 250, max: 1000). Will paginate automatically.'),
      fields: z
        .array(z.enum(['time', 'completions', 'kills', 'deaths', 'kd', 'efficiency']))
        .optional()
        .describe('Which stats to include in summary. Options: time, completions, kills, deaths, kd, efficiency. Default: all'),
      groupBy: z
        .enum(['activity', 'none'])
        .optional()
        .describe('Group results by activity name or return flat totals. Default: activity'),
    },
    async ({
      membershipType,
      membershipId,
      characterId,
      mode = 0,
      activityHash,
      maxActivities = 250,
      fields,
      groupBy = 'activity',
    }) => {
      try {
        // Clamp max activities to prevent abuse
        const actualMax = Math.min(maxActivities, 1000);
        const pageSize = 250;
        const pagesToFetch = Math.ceil(actualMax / pageSize);

        // Fetch all pages in parallel (up to 4 concurrent)
        const allActivities: DestinyActivityHistoryEntry[] = [];

        for (let page = 0; page < pagesToFetch && allActivities.length < actualMax; page++) {
          const result = await client.getActivityHistory(
            membershipType,
            membershipId,
            characterId,
            mode as DestinyActivityModeType,
            pageSize,
            page
          );

          if (!result.activities || result.activities.length === 0) break;
          allActivities.push(...result.activities);

          // If we got fewer than pageSize, no more pages
          if (result.activities.length < pageSize) break;
        }

        if (allActivities.length === 0) {
          return {
            content: [{ type: 'text', text: 'No activities found matching criteria.' }],
          };
        }

        // Filter by activity hash if specified
        let filtered = allActivities;
        if (activityHash) {
          filtered = allActivities.filter(
            (a) =>
              a.activityDetails.directorActivityHash === activityHash ||
              a.activityDetails.referenceId === activityHash
          );
        }

        if (filtered.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No activities found with hash ${activityHash}. Fetched ${allActivities.length} total activities.`,
              },
            ],
          };
        }

        // Determine which fields to include
        const includeFields = new Set(fields || ['time', 'completions', 'kills', 'deaths', 'kd', 'efficiency']);

        // Resolve activity names for unique hashes
        const uniqueHashes = [...new Set(filtered.map((a) => a.activityDetails.directorActivityHash))];
        const activityNames: Record<number, string> = {};

        await batchExecute(uniqueHashes.slice(0, 20), 5, async (hash) => {
          try {
            const def = await client.getActivityDefinition(hash);
            const displayProps = def as { displayProperties?: { name?: string } };
            activityNames[hash] = displayProps.displayProperties?.name || `Unknown (${hash})`;
          } catch {
            activityNames[hash] = `Unknown (${hash})`;
          }
        });

        // Aggregate stats
        interface ActivityStats {
          count: number;
          completions: number;
          timePlayedSeconds: number;
          kills: number;
          deaths: number;
          assists: number;
          oldest: Date;
          newest: Date;
        }

        const statsByActivity: Record<string, ActivityStats> = {};
        const totals: ActivityStats = {
          count: 0,
          completions: 0,
          timePlayedSeconds: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          oldest: new Date(),
          newest: new Date(0),
        };

        for (const activity of filtered) {
          const hash = activity.activityDetails.directorActivityHash;
          const name = activityNames[hash] || `Activity ${hash}`;
          const date = new Date(activity.period);

          if (!statsByActivity[name]) {
            statsByActivity[name] = {
              count: 0,
              completions: 0,
              timePlayedSeconds: 0,
              kills: 0,
              deaths: 0,
              assists: 0,
              oldest: new Date(),
              newest: new Date(0),
            };
          }

          const stats = statsByActivity[name];
          stats.count++;
          totals.count++;

          if (activity.values.completed?.basic.value === 1) {
            stats.completions++;
            totals.completions++;
          }

          const timePlayed = activity.values.timePlayedSeconds?.basic.value || 0;
          stats.timePlayedSeconds += timePlayed;
          totals.timePlayedSeconds += timePlayed;

          const kills = activity.values.kills?.basic.value || 0;
          stats.kills += kills;
          totals.kills += kills;

          const deaths = activity.values.deaths?.basic.value || 0;
          stats.deaths += deaths;
          totals.deaths += deaths;

          const assists = activity.values.assists?.basic.value || 0;
          stats.assists += assists;
          totals.assists += assists;

          if (date < stats.oldest) stats.oldest = date;
          if (date > stats.newest) stats.newest = date;
          if (date < totals.oldest) totals.oldest = date;
          if (date > totals.newest) totals.newest = date;
        }

        // Format output
        const formatTime = (seconds: number) => {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          return `${hours}h ${minutes}m`;
        };

        const formatStats = (stats: ActivityStats, name?: string) => {
          let out = name ? `### ${name}\n` : '';
          out += `- **Activities:** ${stats.count}`;
          if (includeFields.has('completions')) {
            out += ` (${stats.completions} completed, ${Math.round((stats.completions / stats.count) * 100)}% completion rate)`;
          }
          out += '\n';

          if (includeFields.has('time')) {
            out += `- **Total Time:** ${formatTime(stats.timePlayedSeconds)}\n`;
          }
          if (includeFields.has('kills')) {
            out += `- **Total Kills:** ${stats.kills.toLocaleString()}\n`;
          }
          if (includeFields.has('deaths')) {
            out += `- **Total Deaths:** ${stats.deaths.toLocaleString()}\n`;
          }
          if (includeFields.has('kd') && stats.deaths > 0) {
            out += `- **K/D Ratio:** ${(stats.kills / stats.deaths).toFixed(2)}\n`;
          }
          if (includeFields.has('efficiency') && stats.deaths > 0) {
            out += `- **Efficiency:** ${((stats.kills + stats.assists) / stats.deaths).toFixed(2)}\n`;
          }
          out += `- **Date Range:** ${stats.oldest.toLocaleDateString()} - ${stats.newest.toLocaleDateString()}\n`;
          return out;
        };

        let output = `# Activity Statistics Summary\n\n`;
        output += `Analyzed ${filtered.length} activities`;
        if (activityHash) {
          output += ` (filtered from ${allActivities.length} total)`;
        }
        output += `\n\n`;

        if (groupBy === 'activity' && Object.keys(statsByActivity).length > 1) {
          // Sort by time played descending
          const sorted = Object.entries(statsByActivity).sort(
            (a, b) => b[1].timePlayedSeconds - a[1].timePlayedSeconds
          );

          output += `## By Activity\n\n`;
          for (const [name, stats] of sorted) {
            output += formatStats(stats, name) + '\n';
          }
        }

        output += `## Overall Totals\n\n`;
        output += formatStats(totals);

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching activity stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_pgcr',
    'Get a Post-Game Carnage Report for a specific activity with resolved names',
    {
      activityId: z.string().describe('Activity instance ID'),
    },
    async ({ activityId }) => {
      try {
        const pgcr = await client.getPostGameCarnageReport(activityId);
        const modeName =
          DestinyActivityModeType[pgcr.activityDetails.mode] || String(pgcr.activityDetails.mode);

        // Resolve activity name
        let activityName = 'Unknown Activity';
        try {
          const activityDef = await client.getActivityDefinition(
            pgcr.activityDetails.directorActivityHash
          );
          const displayProps = activityDef as { displayProperties?: { name?: string } };
          activityName = displayProps.displayProperties?.name || activityName;
        } catch {
          // Keep default name
        }

        let output = `# ${activityName} - Post-Game Carnage Report\n\n`;
        output += `**Activity Hash:** ${pgcr.activityDetails.directorActivityHash}\n`;
        output += `**Date:** ${new Date(pgcr.period).toLocaleString()}\n`;
        output += `**Mode:** ${modeName}\n`;
        output += `**Reference ID:** ${pgcr.activityDetails.referenceId}\n`;

        // Add activity duration from first entry (same for all players)
        if (pgcr.entries.length > 0 && pgcr.entries[0].values.activityDurationSeconds) {
          output += `**Activity Duration:** ${pgcr.entries[0].values.activityDurationSeconds.basic.displayValue}\n`;
        }
        output += '\n';

        if (pgcr.teams && pgcr.teams.length > 0) {
          output += '## Teams\n\n';
          for (const team of pgcr.teams) {
            output += `- **${team.teamName}:** ${team.score.basic.displayValue} points\n`;
          }
          output += '\n';
        }

        output += '## Players\n\n';
        for (const entry of pgcr.entries) {
          const player = entry.player;
          const displayName =
            player.destinyUserInfo.bungieGlobalDisplayName || player.destinyUserInfo.displayName;
          const displayCode = player.destinyUserInfo.bungieGlobalDisplayNameCode;
          const fullBungieId = displayCode ? `${displayName}#${displayCode}` : displayName;

          output += `### ${displayName}\n`;
          output += `- **Bungie ID:** ${fullBungieId}\n`;
          output += `- **Class:** ${player.characterClass || 'Unknown'}\n`;
          output += `- **Light:** ${player.lightLevel}\n`;
          output += `- **Score:** ${entry.score.basic.displayValue}\n`;

          if (entry.values.kills) {
            output += `- **Kills:** ${entry.values.kills.basic.displayValue}\n`;
          }
          if (entry.values.deaths) {
            output += `- **Deaths:** ${entry.values.deaths.basic.displayValue}\n`;
          }
          if (entry.values.assists) {
            output += `- **Assists:** ${entry.values.assists.basic.displayValue}\n`;
          }
          if (entry.values.timePlayedSeconds) {
            output += `- **Time Played:** ${entry.values.timePlayedSeconds.basic.displayValue}\n`;
          }
          output += '\n';
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching PGCR: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_manifest',
    'Get the current Destiny 2 manifest version and paths',
    {},
    async () => {
      try {
        const manifest = await client.getManifest();

        let output = '# Destiny 2 Manifest\n\n';
        output += `**Version:** ${manifest.version}\n\n`;
        output += '## JSON World Content Paths\n\n';

        for (const [lang, path] of Object.entries(manifest.jsonWorldContentPaths)) {
          output += `- **${lang}:** https://www.bungie.net${path}\n`;
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching manifest: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_item_definition',
    'Look up an item definition from the Destiny 2 manifest',
    {
      itemHash: DestinyHashSchema.describe('Item hash identifier (0-4294967295)'),
    },
    async ({ itemHash }) => {
      try {
        const definition = await client.getEntityDefinition(
          'DestinyInventoryItemDefinition',
          itemHash
        );

        let output = `# ${definition.displayProperties.name}\n\n`;
        output += `${definition.displayProperties.description}\n\n`;
        output += `**Hash:** ${definition.hash}\n`;

        if (definition.displayProperties.icon) {
          output += `**Icon:** https://www.bungie.net${definition.displayProperties.icon}\n`;
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching item definition: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_historical_stats',
    'Get historical stats for a player account',
    {
      membershipType: z.number().describe('Platform type'),
      membershipId: z.string().describe('Destiny membership ID'),
      characterId: z
        .string()
        .optional()
        .describe('Character ID (optional, use 0 for account-wide)'),
    },
    async ({ membershipType, membershipId, characterId = '0' }) => {
      try {
        const stats = await client.getHistoricalStats(membershipType, membershipId, characterId);

        return {
          content: [
            {
              type: 'text',
              text: `# Historical Stats\n\n\`\`\`json\n${JSON.stringify(stats, null, 2)}\n\`\`\``,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'search_items',
    'Search for Destiny 2 items by name using the local manifest cache. Returns matching weapons, armor, mods, and other items.',
    {
      searchTerm: z
        .string()
        .describe('Name to search for (e.g., "Fatebringer", "Navigator", "Sunshot")'),
      limit: z.number().optional().describe('Maximum results to return (default 15)'),
    },
    async ({ searchTerm, limit }) => {
      try {
        const results = manifestCache.searchItems(searchTerm, limit || 15);

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No items found matching "${searchTerm}". Try a different search term or partial name.`,
              },
            ],
          };
        }

        // Check for multiple versions of same weapon (different hashes, same base name)
        const weaponResults = results.filter((r) => r.itemType === 'Weapon');
        const baseNames = new Map<string, typeof weaponResults>();
        for (const weapon of weaponResults) {
          // Normalize name (remove "Timelost", "Adept" suffixes for grouping)
          const baseName = weapon.name.replace(/\s*\((?:Timelost|Adept)\)\s*$/i, '').trim();
          if (!baseNames.has(baseName)) {
            baseNames.set(baseName, []);
          }
          baseNames.get(baseName)!.push(weapon);
        }

        const hasMultipleVersions = Array.from(baseNames.values()).some(
          (group) => group.length > 1
        );

        let output = `# Search Results for "${searchTerm}"\n\n`;
        output += `Found ${results.length} item(s):\n\n`;

        if (hasMultipleVersions) {
          output += `> **Note:** Multiple versions of some weapons were found. Results are sorted by newest first (highest season number). When a user asks about a weapon without specifying a version, use the first/newest version unless they mention a specific season or year.\n\n`;
        }

        for (const item of results) {
          output += `## ${item.name}\n`;
          output += `- **Hash:** ${item.hash}\n`;
          output += `- **Type:** ${item.itemType} (${item.tierType})\n`;
          if (item.source) {
            output += `- **Source:** ${item.source}\n`;
          }
          if (item.seasonNumber) {
            output += `- **Season:** ${item.seasonNumber}\n`;
          }
          if (item.description) {
            output += `- **Description:** ${item.description}\n`;
          }
          if (item.icon) {
            output += `- **Icon:** ${item.icon}\n`;
          }
          output += '\n';
        }

        output += `\n*Use get_item_details with a hash for full perk information.*`;

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Item search failed: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_item_image',
    'Get the icon or screenshot for a Destiny 2 item. By default returns the large screenshot if available, or falls back to the small icon. Use imageType parameter to choose.',
    {
      itemHash: DestinyHashSchema.describe('Item hash from search_items (0-4294967295)'),
      imageType: z
        .enum(['screenshot', 'icon', 'auto'])
        .optional()
        .describe(
          'Type of image: "screenshot" (large inspect image), "icon" (small inventory icon), or "auto" (screenshot if available, else icon). Default: auto'
        ),
    },
    async ({ itemHash, imageType = 'auto' }) => {
      try {
        const itemDef = (await client.getItemDefinitionFull(itemHash)) as {
          displayProperties?: { name?: string; icon?: string };
          screenshot?: string;
        };

        const icon = itemDef.displayProperties?.icon;
        const screenshot = itemDef.screenshot; // Screenshot is at root level, not under displayProperties
        const name = itemDef.displayProperties?.name || 'Unknown Item';

        // Determine which image to use based on imageType
        let selectedImage: string | undefined;
        let imageLabel: string;

        if (imageType === 'screenshot') {
          selectedImage = screenshot;
          imageLabel = 'Screenshot';
        } else if (imageType === 'icon') {
          selectedImage = icon;
          imageLabel = 'Icon';
        } else {
          // auto: prefer screenshot, fall back to icon
          selectedImage = screenshot || icon;
          imageLabel = screenshot ? 'Screenshot' : 'Icon';
        }

        if (!selectedImage) {
          return {
            content: [
              {
                type: 'text',
                text: `No ${imageType === 'auto' ? 'image' : imageType} available for item ${itemHash} (${name})`,
              },
            ],
          };
        }

        // Fetch the image and return as base64
        const imageUrl = `https://www.bungie.net${selectedImage}`;
        const response = await fetch(imageUrl);

        if (!response.ok) {
          return {
            content: [
              {
                type: 'text',
                text: `# ${name}\n\n**Icon URL:** https://www.bungie.net${icon}\n${screenshot ? `**Screenshot URL:** https://www.bungie.net${screenshot}` : ''}`,
              },
            ],
          };
        }

        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const serverMimeType = response.headers.get('content-type') || 'image/png';

        // Validate MIME type (Bungie serves jpg/png)
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        const mimeType = allowedTypes.includes(serverMimeType) ? serverMimeType : 'image/png';

        return {
          content: [
            {
              type: 'text',
              text: `# ${name}\n*${imageLabel}*`,
            },
            {
              type: 'image',
              data: base64,
              mimeType,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_item_details',
    'Get full details for an item including name, type, stats, and sockets/perks with resolved perk names',
    {
      itemHash: DestinyHashSchema.describe('Item hash from search_items (0-4294967295)'),
    },
    async ({ itemHash }) => {
      try {
        const itemDef = (await client.getItemDefinitionFull(itemHash)) as Record<string, unknown>;
        const displayProps = itemDef.displayProperties as
          | { name?: string; description?: string; icon?: string }
          | undefined;
        const itemType = itemDef.itemTypeDisplayName as string | undefined;
        const tierType = itemDef.inventory as { tierTypeName?: string } | undefined;

        let output = `# ${displayProps?.name || 'Unknown Item'}\n\n`;
        output += `**Hash:** ${itemHash}\n`;
        output += `**Type:** ${itemType || 'Unknown'}\n`;
        output += `**Tier:** ${tierType?.tierTypeName || 'Unknown'}\n`;
        if (displayProps?.description) {
          output += `**Description:** ${displayProps.description}\n`;
        }
        if (displayProps?.icon) {
          output += `**Icon:** https://www.bungie.net${displayProps.icon}\n`;
        }
        output += '\n';

        // Handle sockets (perks)
        const sockets = itemDef.sockets as
          | {
              socketEntries?: Array<{
                socketTypeHash: number;
                singleInitialItemHash: number;
                reusablePlugSetHash?: number;
                randomizedPlugSetHash?: number;
              }>;
              socketCategories?: Array<{
                socketCategoryHash: number;
                socketIndexes: number[];
              }>;
            }
          | undefined;

        if (sockets?.socketEntries && sockets.socketEntries.length > 0) {
          output += '## Sockets/Perks\n\n';

          // Collect all plug set hashes to resolve
          const plugSetHashes: number[] = [];
          for (const socket of sockets.socketEntries) {
            if (socket.reusablePlugSetHash) plugSetHashes.push(socket.reusablePlugSetHash);
            if (socket.randomizedPlugSetHash) plugSetHashes.push(socket.randomizedPlugSetHash);
          }

          // Resolve plug sets with bounded concurrency
          const plugSets: Record<number, Array<{ name: string; hash: number }>> = {};
          await batchExecute(
            [...new Set(plugSetHashes)],
            3, // Max 3 concurrent plug set lookups
            async (hash) => {
              try {
                const plugSetDef = (await client.getPlugSetDefinition(hash)) as {
                  reusablePlugItems?: Array<{ plugItemHash: number }>;
                };
                const plugItems = plugSetDef.reusablePlugItems || [];

                // Resolve each perk name with bounded concurrency
                const perks = await batchExecute(
                  plugItems.slice(0, 20), // Limit to 20 perks per socket
                  5, // Max 5 concurrent perk lookups per set
                  async (plug) => {
                    try {
                      const perkDef = (await client.getItemDefinitionFull(plug.plugItemHash)) as {
                        displayProperties?: { name?: string };
                      };
                      return {
                        name: perkDef.displayProperties?.name || `Unknown (${plug.plugItemHash})`,
                        hash: plug.plugItemHash,
                      };
                    } catch {
                      return { name: `Unknown (${plug.plugItemHash})`, hash: plug.plugItemHash };
                    }
                  }
                );
                plugSets[hash] = perks;
              } catch {
                plugSets[hash] = [];
              }
            }
          );

          let socketIndex = 0;
          for (const socket of sockets.socketEntries) {
            const plugSetHash = socket.randomizedPlugSetHash || socket.reusablePlugSetHash;
            if (plugSetHash && plugSets[plugSetHash]?.length > 0) {
              output += `### Socket ${socketIndex + 1} (PlugSet: ${plugSetHash})\n`;
              for (const perk of plugSets[plugSetHash]) {
                output += `- ${perk.name} (${perk.hash})\n`;
              }
              output += '\n';
            }
            socketIndex++;
          }
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_plug_set',
    'Get all perks in a plug set with resolved names - use plugSetHash from item sockets',
    {
      plugSetHash: DestinyHashSchema.describe(
        'Plug set hash from item socket definition (0-4294967295)'
      ),
    },
    async ({ plugSetHash }) => {
      try {
        const plugSetDef = (await client.getPlugSetDefinition(plugSetHash)) as {
          reusablePlugItems?: Array<{ plugItemHash: number }>;
          displayProperties?: { name?: string; description?: string };
        };

        let output = `# Plug Set ${plugSetHash}\n\n`;

        if (plugSetDef.displayProperties?.name) {
          output += `**Name:** ${plugSetDef.displayProperties.name}\n`;
        }
        if (plugSetDef.displayProperties?.description) {
          output += `**Description:** ${plugSetDef.displayProperties.description}\n`;
        }
        output += '\n## Available Perks\n\n';

        const plugItems = plugSetDef.reusablePlugItems || [];

        // Resolve perk names with bounded concurrency
        const perks = await batchExecute(
          plugItems,
          5, // Max 5 concurrent perk lookups
          async (plug) => {
            try {
              const perkDef = (await client.getItemDefinitionFull(plug.plugItemHash)) as {
                displayProperties?: { name?: string; description?: string };
              };
              return {
                name: perkDef.displayProperties?.name || `Unknown`,
                hash: plug.plugItemHash,
                description: perkDef.displayProperties?.description || '',
              };
            } catch {
              return { name: 'Unknown', hash: plug.plugItemHash, description: '' };
            }
          }
        );

        for (const perk of perks) {
          output += `### ${perk.name}\n`;
          output += `- **Hash:** ${perk.hash}\n`;
          if (perk.description) {
            output += `- **Effect:** ${perk.description}\n`;
          }
          output += '\n';
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching plug set: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'get_activity_definition',
    'Get details about an activity by hash with resolved name (raids, strikes, dungeons, etc.)',
    {
      activityHash: DestinyHashSchema.describe(
        'Activity hash from activity history (0-4294967295)'
      ),
    },
    async ({ activityHash }) => {
      try {
        const activityDef = (await client.getActivityDefinition(activityHash)) as {
          displayProperties?: { name?: string; description?: string; icon?: string };
          destinationHash?: number;
          placeHash?: number;
          activityTypeHash?: number;
          activityModeHashes?: number[];
          activityModeTypes?: number[];
          directActivityModeHash?: number;
          directActivityModeType?: number;
          tier?: number;
          pgcrImage?: string;
        };

        const displayProps = activityDef.displayProperties;

        let output = `# ${displayProps?.name || 'Unknown Activity'}\n\n`;
        output += `**Hash:** ${activityHash}\n`;
        if (displayProps?.description) {
          output += `**Description:** ${displayProps.description}\n`;
        }
        if (activityDef.tier !== undefined) {
          output += `**Tier:** ${activityDef.tier}\n`;
        }
        if (activityDef.directActivityModeType !== undefined) {
          const modeName =
            DestinyActivityModeType[activityDef.directActivityModeType] ||
            String(activityDef.directActivityModeType);
          output += `**Mode:** ${modeName}\n`;
        }
        if (displayProps?.icon) {
          output += `**Icon:** https://www.bungie.net${displayProps.icon}\n`;
        }
        if (activityDef.pgcrImage) {
          output += `**Image:** https://www.bungie.net${activityDef.pgcrImage}\n`;
        }

        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching activity: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'search_clan_members',
    "Get the full roster of a Destiny 2 clan. Two methods: 1) Search by clan name/tag (may fail with special Unicode characters), or 2) RECOMMENDED: Use knownMember with any clan member's ID to reliably get the roster. Workflow: First use find_players to get a known member's ID, then use that ID with knownMember parameter. Returns member list with online status indicators. IMPORTANT: Use the player's PRIMARY/CROSS-SAVE platform (usually Steam or PlayStation), NOT secondary platforms.",
    {
      clanName: z
        .string()
        .optional()
        .describe(
          'Clan name or tag to search for (e.g., "Elysium", "MATH", "B"). May fail with clans that have special Unicode characters. Optional if using knownMember.'
        ),
      knownMember: z
        .object({
          membershipType: z
            .number()
            .describe(
              "Platform type (1=Xbox, 2=PS, 3=Steam, 6=Epic). MUST use player's PRIMARY/CROSS-SAVE platform - clan membership is tied to their main platform, not secondary accounts."
            ),
          membershipId: z
            .string()
            .describe(
              'Destiny membership ID of ANY player in the target clan from their PRIMARY platform. Get this from find_players results - look for Steam (3) or PlayStation (2) first, as these are most commonly the cross-save primary.'
            ),
        })
        .optional()
        .describe(
          'RECOMMENDED METHOD: Provide any clan member\'s PRIMARY platform to get the full clan roster. More reliable than name search, especially for elite clans with special characters in names. Example: Use find_players to find "Datto", extract his Steam ID (4611686018467284386) with membershipType 3, then use {membershipType:3, membershipId:"4611686018467284386"} to get Math Class roster. If you get "not in clan" error, try a different platform from find_players results.'
        ),
      maxResults: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of members to return (default: 50, max: 100)'),
    },
    async ({ clanName, knownMember, maxResults = 50 }) => {
      try {
        let groupId: string;
        let clanInfo: { name: string; tag: string; motto?: string; memberCount: number };

        // Method 1: Get clan via known member (most reliable)
        if (knownMember) {
          const clanData = await client.getGroupsForMember(
            knownMember.membershipType,
            knownMember.membershipId
          );
          if (!clanData.results || clanData.results.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: `The specified player is not in any clan.`,
                },
              ],
            };
          }

          const clan = clanData.results[0];
          groupId = clan.group.groupId;
          clanInfo = {
            name: clan.group.name,
            tag: clan.group.clanInfo?.clanCallsign || 'N/A',
            motto: clan.group.motto,
            memberCount: clan.group.memberCount,
          };
        }
        // Method 2: Search by clan name (less reliable, especially with special characters)
        else if (clanName) {
          // First check if we have a hard-coded groupId for this elite clan
          const lowerQuery = clanName.toLowerCase();
          const eliteClan = ELITE_CLANS.find(
            (c) =>
              c.tag.toLowerCase() === lowerQuery ||
              (c.notes && c.notes.toLowerCase().includes(lowerQuery))
          );

          if (eliteClan?.groupId) {
            // Use the hard-coded group ID directly!
            groupId = eliteClan.groupId;
            // Get clan info from the group ID
            const membersResponse = await client.getGroupMembers(groupId, 1);
            if (membersResponse.results && membersResponse.results.length > 0) {
              // Extract clan info from the first member's group data
              // We'll need to fetch this separately or extract from member data
              clanInfo = {
                name: eliteClan.notes?.split(' - ')[0] || 'Elite Clan',
                tag: eliteClan.tag,
                motto: 'Elite World-First Clan',
                memberCount: membersResponse.totalResults,
              };
            } else {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Found elite clan ${eliteClan.notes}, but roster is unavailable.`,
                  },
                ],
              };
            }
          } else {
            // Try Bungie's clan search
            let searchResults;
            try {
              searchResults = await client.searchGroups(clanName);
            } catch {
              searchResults = { results: [] };
            }

            if (!searchResults.results || searchResults.results.length === 0) {
              // Fuzzy match against known elite clans as fallback
              const eliteMatches = ELITE_CLANS.filter(
                (c) =>
                  c.tag.toLowerCase().includes(lowerQuery) ||
                  (c.notes && c.notes.toLowerCase().includes(lowerQuery))
              );

              if (eliteMatches.length > 0) {
                const suggestions = eliteMatches
                  .slice(0, 3)
                  .map(
                    (c) =>
                      `- ${c.notes} (tag: [${c.tag}])${c.groupId ? ' ✓ Direct lookup available' : ''}`
                  )
                  .join('\n');

                return {
                  content: [
                    {
                      type: 'text',
                      text: `Bungie API couldn't find "${clanName}", but it matches these elite clans:\n\n${suggestions}\n\nTo get the roster, use find_players to find a member of that clan, then use the knownMember parameter with their Steam/PlayStation ID.`,
                    },
                  ],
                };
              }

              return {
                content: [
                  {
                    type: 'text',
                    text: `No clan found matching "${clanName}". The Bungie API clan search is very strict and often fails with special characters or partial names.\n\nRECOMMENDED: Use find_players to find any member of the clan, then use the knownMember parameter with their Steam (3) or PlayStation (2) membership ID.`,
                  },
                ],
              };
            }

            const clan = searchResults.results[0];
            groupId = clan.groupId;
            clanInfo = {
              name: clan.name,
              tag: clan.clanInfo?.clanCallsign || 'N/A',
              motto: clan.motto,
              memberCount: clan.memberCount,
            };
          }
        } else {
          return {
            content: [
              {
                type: 'text',
                text: 'Must provide either clanName or knownMember parameter.',
              },
            ],
            isError: true,
          };
        }

        // Get clan members
        const membersResponse = await client.getGroupMembers(groupId, 1);
        const allMembers = membersResponse.results || [];
        const displayMembers = allMembers.slice(0, Math.min(maxResults, 100));

        if (allMembers.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `Clan "${clanInfo.name}" [${clanInfo.tag}] has no members`,
              },
            ],
          };
        }

        const memberList = displayMembers
          .map((m) => {
            const info = m.destinyUserInfo;
            const status = m.isOnline ? '🟢' : '⚫';
            const platform = getMembershipTypeName(info.membershipType);
            return `${status} ${info.bungieGlobalDisplayName}#${info.bungieGlobalDisplayNameCode} (${platform})`;
          })
          .join('\n');

        const moreText =
          membersResponse.totalResults > maxResults
            ? `\n\n... and ${membersResponse.totalResults - maxResults} more members (use higher maxResults to see all)`
            : '';

        return {
          content: [
            {
              type: 'text',
              text: `# Clan: ${clanInfo.name} [${clanInfo.tag}]\n\n**Total Members:** ${membersResponse.totalResults}\n**Motto:** ${clanInfo.motto || 'None'}\n\n## Member List (${displayMembers.length} shown):\n${memberList}${moreText}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching clan members: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
