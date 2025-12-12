// Bungie API membership types
export enum BungieMembershipType {
  None = 0,
  TigerXbox = 1,
  TigerPsn = 2,
  TigerSteam = 3,
  TigerBlizzard = 4,
  TigerStadia = 5,
  TigerEgs = 6,
  TigerDemon = 10,
  BungieNext = 254,
  All = -1,
}

// Destiny component types for profile requests
export enum DestinyComponentType {
  None = 0,
  Profiles = 100,
  VendorReceipts = 101,
  ProfileInventories = 102,
  ProfileCurrencies = 103,
  ProfileProgression = 104,
  PlatformSilver = 105,
  Characters = 200,
  CharacterInventories = 201,
  CharacterProgressions = 202,
  CharacterRenderData = 203,
  CharacterActivities = 204,
  CharacterEquipment = 205,
  CharacterLoadouts = 206,
  ItemInstances = 300,
  ItemObjectives = 301,
  ItemPerks = 302,
  ItemRenderData = 303,
  ItemStats = 304,
  ItemSockets = 305,
  ItemTalentGrids = 306,
  ItemCommonData = 307,
  ItemPlugStates = 308,
  ItemPlugObjectives = 309,
  ItemReusablePlugs = 310,
  Vendors = 400,
  VendorCategories = 401,
  VendorSales = 402,
  Kiosks = 500,
  CurrencyLookups = 600,
  PresentationNodes = 700,
  Collectibles = 800,
  Records = 900,
  Transitory = 1000,
  Metrics = 1100,
  StringVariables = 1200,
  Craftables = 1300,
  SocialCommendations = 1400,
}

// Activity mode types
export enum DestinyActivityModeType {
  None = 0,
  Story = 2,
  Strike = 3,
  Raid = 4,
  AllPvP = 5,
  Patrol = 6,
  AllPvE = 7,
  Reserved9 = 9,
  Control = 10,
  Reserved11 = 11,
  Clash = 12,
  Reserved13 = 13,
  CrimsonDoubles = 15,
  Nightfall = 16,
  HeroicNightfall = 17,
  AllStrikes = 18,
  IronBanner = 19,
  Reserved20 = 20,
  Reserved21 = 21,
  Reserved22 = 22,
  Reserved24 = 24,
  AllMayhem = 25,
  Reserved26 = 26,
  Reserved27 = 27,
  Reserved28 = 28,
  Reserved29 = 29,
  Reserved30 = 30,
  Supremacy = 31,
  PrivateMatchesAll = 32,
  Survival = 37,
  Countdown = 38,
  TrialsOfTheNine = 39,
  Social = 40,
  TrialsCountdown = 41,
  TrialsSurvival = 42,
  IronBannerControl = 43,
  IronBannerClash = 44,
  IronBannerSupremacy = 45,
  ScoredNightfall = 46,
  ScoredHeroicNightfall = 47,
  Rumble = 48,
  AllDoubles = 49,
  Doubles = 50,
  PrivateMatchesClash = 51,
  PrivateMatchesControl = 52,
  PrivateMatchesSupremacy = 53,
  PrivateMatchesCountdown = 54,
  PrivateMatchesSurvival = 55,
  PrivateMatchesMayhem = 56,
  PrivateMatchesRumble = 57,
  HeroicAdventure = 58,
  Showdown = 59,
  Lockdown = 60,
  Scorched = 61,
  ScorchedTeam = 62,
  Gambit = 63,
  AllPvECompetitive = 64,
  Breakthrough = 65,
  BlackArmoryRun = 66,
  Salvage = 67,
  IronBannerSalvage = 68,
  PvPCompetitive = 69,
  PvPQuickplay = 70,
  ClashQuickplay = 71,
  ClashCompetitive = 72,
  ControlQuickplay = 73,
  ControlCompetitive = 74,
  GambitPrime = 75,
  Reckoning = 76,
  Menagerie = 77,
  VexOffensive = 78,
  NightmareHunt = 79,
  Elimination = 80,
  Momentum = 81,
  Dungeon = 82,
  Sundial = 83,
  TrialsOfOsiris = 84,
  Dares = 85,
  Offensive = 86,
  LostSector = 87,
  Rift = 88,
  ZoneControl = 89,
  IronBannerRift = 90,
  IronBannerZoneControl = 91,
}

// Destiny class types
export enum DestinyClass {
  Titan = 0,
  Hunter = 1,
  Warlock = 2,
  Unknown = 3,
}

// Destiny race types
export enum DestinyRace {
  Human = 0,
  Awoken = 1,
  Exo = 2,
  Unknown = 3,
}

// Destiny gender types
export enum DestinyGender {
  Male = 0,
  Female = 1,
  Unknown = 2,
}

// API Response wrapper
export interface BungieResponse<T> {
  Response: T;
  ErrorCode: number;
  ThrottleSeconds: number;
  ErrorStatus: string;
  Message: string;
  MessageData: Record<string, string>;
}

// User info card
export interface UserInfoCard {
  supplementalDisplayName?: string;
  iconPath?: string;
  crossSaveOverride: BungieMembershipType;
  applicableMembershipTypes: BungieMembershipType[];
  isPublic: boolean;
  membershipType: BungieMembershipType;
  membershipId: string;
  displayName: string;
  bungieGlobalDisplayName?: string;
  bungieGlobalDisplayNameCode?: number;
}

// Destiny profile response
export interface DestinyProfileResponse {
  profile?: {
    data?: {
      userInfo: UserInfoCard;
      dateLastPlayed: string;
      versionsOwned: number;
      characterIds: string[];
      seasonHashes: number[];
      currentSeasonHash?: number;
      currentSeasonRewardPowerCap?: number;
    };
    privacy: number;
  };
  characters?: {
    data?: Record<string, DestinyCharacterComponent>;
    privacy: number;
  };
  characterEquipment?: {
    data?: Record<string, { items: DestinyItemComponent[] }>;
    privacy: number;
  };
  profileInventory?: {
    data?: { items: DestinyItemComponent[] };
    privacy: number;
  };
  profileRecords?: {
    data?: {
      score: number;
      activeScore: number;
      legacyScore: number;
      lifetimeScore: number;
      records?: Record<string, { state: number; objectives?: Array<{ complete: boolean }> }>;
    };
    privacy: number;
  };
}

// Character component
export interface DestinyCharacterComponent {
  membershipId: string;
  membershipType: BungieMembershipType;
  characterId: string;
  dateLastPlayed: string;
  minutesPlayedThisSession: string;
  minutesPlayedTotal: string;
  light: number;
  stats: Record<string, number>;
  raceHash: number;
  genderHash: number;
  classHash: number;
  raceType: DestinyRace;
  classType: DestinyClass;
  genderType: DestinyGender;
  emblemPath: string;
  emblemBackgroundPath: string;
  emblemHash: number;
  emblemColor: {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  };
  levelProgression: {
    progressionHash: number;
    dailyProgress: number;
    dailyLimit: number;
    weeklyProgress: number;
    weeklyLimit: number;
    currentProgress: number;
    level: number;
    levelCap: number;
    stepIndex: number;
    progressToNextLevel: number;
    nextLevelAt: number;
  };
  baseCharacterLevel: number;
  percentToNextLevel: number;
  titleRecordHash?: number;
}

// Item component
export interface DestinyItemComponent {
  itemHash: number;
  itemInstanceId?: string;
  quantity: number;
  bindStatus: number;
  location: number;
  bucketHash: number;
  transferStatus: number;
  lockable: boolean;
  state: number;
  dismantlePermission: number;
  overrideStyleItemHash?: number;
  expirationDate?: string;
  isWrapper: boolean;
  tooltipNotificationIndexes?: number[];
  versionNumber?: number;
}

// Activity history entry
export interface DestinyActivityHistoryEntry {
  period: string;
  activityDetails: {
    referenceId: number;
    directorActivityHash: number;
    instanceId: string;
    mode: DestinyActivityModeType;
    modes: DestinyActivityModeType[];
    isPrivate: boolean;
    membershipType: BungieMembershipType;
  };
  values: Record<
    string,
    {
      statId: string;
      basic: {
        value: number;
        displayValue: string;
      };
    }
  >;
}

// Post-game carnage report
export interface DestinyPostGameCarnageReportData {
  period: string;
  startingPhaseIndex?: number;
  activityWasStartedFromBeginning?: boolean;
  activityDetails: {
    referenceId: number;
    directorActivityHash: number;
    instanceId: string;
    mode: DestinyActivityModeType;
    modes: DestinyActivityModeType[];
    isPrivate: boolean;
    membershipType: BungieMembershipType;
  };
  entries: DestinyPostGameCarnageReportEntry[];
  teams: DestinyPostGameCarnageReportTeamEntry[];
}

export interface DestinyPostGameCarnageReportEntry {
  standing: number;
  score: {
    basic: { value: number; displayValue: string };
  };
  player: {
    destinyUserInfo: UserInfoCard;
    characterClass?: string;
    classHash: number;
    raceHash: number;
    genderHash: number;
    characterLevel: number;
    lightLevel: number;
    emblemHash: number;
  };
  characterId: string;
  values: Record<
    string,
    {
      statId: string;
      basic: { value: number; displayValue: string };
    }
  >;
  extended?: {
    weapons?: Array<{
      referenceId: number;
      values: Record<string, { basic: { value: number; displayValue: string } }>;
    }>;
  };
}

export interface DestinyPostGameCarnageReportTeamEntry {
  teamId: number;
  standing: { basic: { value: number; displayValue: string } };
  score: { basic: { value: number; displayValue: string } };
  teamName: string;
}

// Manifest response
export interface DestinyManifest {
  version: string;
  mobileAssetContentPath: string;
  mobileGearAssetDataBases: Array<{ version: number; path: string }>;
  mobileWorldContentPaths: Record<string, string>;
  jsonWorldContentPaths: Record<string, string>;
  jsonWorldComponentContentPaths: Record<string, Record<string, string>>;
  mobileClanBannerDatabasePath: string;
  mobileGearCDN: Record<string, string>;
  iconImagePyramidInfo: Array<unknown>;
}

// Entity definition (generic for manifest lookups)
export interface DestinyEntityDefinition {
  displayProperties: {
    description: string;
    name: string;
    icon?: string;
    iconSequences?: Array<{ frames: string[] }>;
    highResIcon?: string;
    hasIcon: boolean;
  };
  hash: number;
  index: number;
  redacted: boolean;
  blacklisted: boolean;
}

// Search result for player search
export interface UserSearchResponse {
  searchResults: Array<{
    destinyMemberships: UserInfoCard[];
    bungieGlobalDisplayName: string;
    bungieGlobalDisplayNameCode: number;
  }>;
  page: number;
  hasMore: boolean;
}
