import { Check, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getLevelProgressPercent,
  getRankForId,
  getXpForCurrentLevel,
  getXpToNextLevel,
  LEVEL_XP_STEP,
  MAX_LEVEL,
  rankDefinitions,
  XP_CAPS,
  XP_REWARDS,
  type RankDefinition,
  type UserRankSnapshot,
} from "@/utils/rankSystem";

interface RankLadderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: UserRankSnapshot | null;
}

type RankRowState = "locked" | "current" | "unlocked";

const getRowState = (rank: RankDefinition, currentLevel: number): RankRowState => {
  if (currentLevel >= rank.minLevel && currentLevel <= rank.maxLevel) return "current";
  if (currentLevel > rank.maxLevel) return "unlocked";
  return "locked";
};

const xpEarningTips = [
  { label: "Complete a lesson", value: `+${XP_REWARDS.completedLesson} XP` },
  { label: "Complete a section", value: `+${XP_REWARDS.completedSection} XP` },
  {
    label: "Quick practice (per attempt)",
    value: `+${XP_REWARDS.quickPracticeBase}–${XP_REWARDS.quickPracticeBase + 100} XP · cap ${XP_CAPS.quickPractice.toLocaleString()}`,
  },
  {
    label: "Exam simulation (per attempt)",
    value: `+${XP_REWARDS.examSimulation} XP · cap ${XP_CAPS.examSimulation.toLocaleString()}`,
  },
  {
    label: "Share a useful mock exam",
    value: `+${XP_REWARDS.sharedExam} XP · cap ${XP_CAPS.sharedExam.toLocaleString()}`,
  },
  {
    label: "Others use your shared exam",
    value: `+${XP_REWARDS.sharedExamUse} XP each · cap ${XP_CAPS.sharedExamUse.toLocaleString()}`,
  },
];

const RankLadderDialog = ({ open, onOpenChange, snapshot }: RankLadderDialogProps) => {
  const currentLevel = snapshot?.level ?? 0;
  const totalXp = snapshot?.totalXp ?? 0;
  const xpInLevel = getXpForCurrentLevel(totalXp);
  const xpToNext = getXpToNextLevel(totalXp);
  const levelProgress = getLevelProgressPercent(totalXp);
  const isMaxLevel = currentLevel >= MAX_LEVEL;
  const currentRank = snapshot ? getRankForId(snapshot.rankId) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <DialogTitle>Learning Ranks</DialogTitle>
          <DialogDescription>
            Earn XP by studying ELEC3120 — climb from Novice to Legend across {MAX_LEVEL} levels.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-2 px-6 py-4">
            {rankDefinitions.map((rank) => {
              const state = currentLevel > 0 ? getRowState(rank, currentLevel) : "locked";
              const isCurrent = state === "current";

              return (
                <div
                  key={rank.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-3 transition",
                    isCurrent
                      ? "border-primary/50 bg-primary/5 shadow-glow"
                      : state === "unlocked"
                        ? "border-border/70 bg-background/40"
                        : "border-border/40 bg-background/20 opacity-70",
                  )}
                >
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-0",
                      `bg-gradient-to-br ${rank.tone}`,
                      isCurrent ? "opacity-15" : "opacity-5",
                    )}
                  />
                  <div className="relative flex items-center gap-3">
                    <span
                      className={cn(
                        "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-background/60 shadow-glow",
                        state === "locked" && "grayscale",
                      )}
                    >
                      <img
                        src={rank.icon}
                        alt=""
                        aria-hidden="true"
                        className="h-9 w-9 object-contain"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{rank.name}</p>
                        {state === "current" ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                            Current
                          </span>
                        ) : state === "unlocked" ? (
                          <Check className="h-4 w-4 text-emerald-400" aria-label="Unlocked" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" aria-label="Locked" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lv. {rank.minLevel} – {rank.maxLevel}
                      </p>

                      {isCurrent && currentRank ? (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>
                              Level {currentLevel - rank.minLevel + 1} of{" "}
                              {rank.maxLevel - rank.minLevel + 1} in {rank.name}
                            </span>
                            <span>
                              {isMaxLevel
                                ? "Max level"
                                : `${xpInLevel}/${LEVEL_XP_STEP} XP this level`}
                            </span>
                          </div>
                          <Progress value={levelProgress} className="h-1.5" />
                          <p className="text-[11px] text-muted-foreground">
                            {isMaxLevel
                              ? "Legend complete"
                              : `${xpToNext} XP to Lv. ${currentLevel + 1}`}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border/60 bg-background/40 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              How to earn XP
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {xpEarningTips.map((tip) => (
                <li key={tip.label} className="flex items-start justify-between gap-3">
                  <span className="text-foreground">{tip.label}</span>
                  <span className="shrink-0 text-muted-foreground">{tip.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default RankLadderDialog;
