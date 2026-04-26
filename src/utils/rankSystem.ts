export const LEVEL_XP_STEP = 100;
export const MAX_LEVEL = 100;

export const XP_REWARDS = {
  completedLesson: 100,
  completedSection: 250,
  quickPracticeBase: 100,
  examSimulation: 100,
  sharedExam: 150,
  sharedExamUse: 25,
} as const;

export const XP_CAPS = {
  quickPractice: 3000,
  examSimulation: 1000,
  sharedExam: 1500,
  sharedExamUse: 500,
} as const;

export const rankDefinitions = [
  {
    id: "novice",
    name: "Novice",
    minLevel: 1,
    maxLevel: 10,
    icon: "/ranks/novice.svg",
    tone: "from-zinc-300 to-slate-500",
  },
  {
    id: "bronze",
    name: "Bronze",
    minLevel: 11,
    maxLevel: 20,
    icon: "/ranks/bronze.svg",
    tone: "from-orange-300 to-amber-700",
  },
  {
    id: "silver",
    name: "Silver",
    minLevel: 21,
    maxLevel: 30,
    icon: "/ranks/silver.svg",
    tone: "from-sky-100 to-slate-400",
  },
  {
    id: "gold",
    name: "Gold",
    minLevel: 31,
    maxLevel: 40,
    icon: "/ranks/gold.svg",
    tone: "from-yellow-200 to-amber-500",
  },
  {
    id: "platinum",
    name: "Platinum",
    minLevel: 41,
    maxLevel: 50,
    icon: "/ranks/platinum.svg",
    tone: "from-cyan-200 to-teal-500",
  },
  {
    id: "diamond",
    name: "Diamond",
    minLevel: 51,
    maxLevel: 60,
    icon: "/ranks/diamond.svg",
    tone: "from-blue-200 to-sky-600",
  },
  {
    id: "master",
    name: "Master",
    minLevel: 61,
    maxLevel: 70,
    icon: "/ranks/master.svg",
    tone: "from-fuchsia-200 to-violet-600",
  },
  {
    id: "grandmaster",
    name: "Grandmaster",
    minLevel: 71,
    maxLevel: 80,
    icon: "/ranks/grandmaster.svg",
    tone: "from-red-300 to-orange-600",
  },
  {
    id: "ascendant",
    name: "Ascendant",
    minLevel: 81,
    maxLevel: 90,
    icon: "/ranks/ascendant.svg",
    tone: "from-amber-100 to-yellow-500",
  },
  {
    id: "legend",
    name: "Legend",
    minLevel: 91,
    maxLevel: 100,
    icon: "/ranks/legend.svg",
    tone: "from-indigo-200 to-purple-600",
  },
] as const;

export type RankId = (typeof rankDefinitions)[number]["id"];
export type RankDefinition = (typeof rankDefinitions)[number];

export interface UserRankSnapshot {
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
  rankId: RankId;
  rankName: string;
  updatedAt: string | null;
}

export const getClampedXp = (totalXp: number) => Math.max(0, Math.floor(Number(totalXp) || 0));

export const getLevelFromXp = (totalXp: number) => {
  const safeXp = getClampedXp(totalXp);
  return Math.min(MAX_LEVEL, Math.floor(safeXp / LEVEL_XP_STEP) + 1);
};

export const getTotalXpForLevel = (level: number) => {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
  return (safeLevel - 1) * LEVEL_XP_STEP;
};

export const getRankForLevel = (level: number): RankDefinition => {
  const safeLevel = Math.min(MAX_LEVEL, Math.max(1, Math.floor(Number(level) || 1)));
  return (
    rankDefinitions.find((rank) => safeLevel >= rank.minLevel && safeLevel <= rank.maxLevel) ??
    rankDefinitions[0]
  );
};

export const getRankForId = (rankId: string | null | undefined): RankDefinition =>
  rankDefinitions.find((rank) => rank.id === rankId) ?? rankDefinitions[0];

export const getXpForCurrentLevel = (totalXp: number) => {
  const level = getLevelFromXp(totalXp);
  if (level >= MAX_LEVEL) return LEVEL_XP_STEP;
  return getClampedXp(totalXp) % LEVEL_XP_STEP;
};

export const getXpToNextLevel = (totalXp: number) => {
  const level = getLevelFromXp(totalXp);
  if (level >= MAX_LEVEL) return 0;
  return LEVEL_XP_STEP - getXpForCurrentLevel(totalXp);
};

export const getLevelProgressPercent = (totalXp: number) => {
  if (getLevelFromXp(totalXp) >= MAX_LEVEL) return 100;
  return Math.round((getXpForCurrentLevel(totalXp) / LEVEL_XP_STEP) * 100);
};

export const getRankIconSrc = (rankId: string | null | undefined) => getRankForId(rankId).icon;

export const createRankSnapshotFromXp = (
  userId: string,
  displayName: string,
  totalXp: number,
  updatedAt: string | null = null,
): UserRankSnapshot => {
  const safeXp = getClampedXp(totalXp);
  const level = getLevelFromXp(safeXp);
  const rank = getRankForLevel(level);

  return {
    userId,
    displayName: displayName.trim() || "Student",
    totalXp: safeXp,
    level,
    rankId: rank.id,
    rankName: rank.name,
    updatedAt,
  };
};

export const createFallbackRankSnapshot = (
  userId: string,
  displayName = "Student",
): UserRankSnapshot => createRankSnapshotFromXp(userId, displayName, 0, null);
