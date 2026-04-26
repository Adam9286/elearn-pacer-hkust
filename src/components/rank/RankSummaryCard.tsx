import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getLevelProgressPercent,
  getRankForId,
  getXpForCurrentLevel,
  getXpToNextLevel,
  MAX_LEVEL,
  type UserRankSnapshot,
} from "@/utils/rankSystem";

interface RankSummaryCardProps {
  snapshot: UserRankSnapshot;
  className?: string;
  compact?: boolean;
}

const RankSummaryCard = ({ snapshot, className, compact = false }: RankSummaryCardProps) => {
  const rank = getRankForId(snapshot.rankId);
  const levelProgress = getLevelProgressPercent(snapshot.totalXp);
  const xpIntoLevel = getXpForCurrentLevel(snapshot.totalXp);
  const xpToNextLevel = getXpToNextLevel(snapshot.totalXp);
  const isMaxLevel = snapshot.level >= MAX_LEVEL;

  return (
    <Card className={cn("overflow-hidden border-border/70 bg-card/85", className)}>
      <CardContent className={cn("relative", compact ? "p-4" : "p-5")}>
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-20",
            `bg-gradient-to-br ${rank.tone}`,
          )}
        />
        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col items-center text-center">
            <div
              className={cn(
                "flex items-center justify-center rounded-full border border-white/10 bg-background/35 shadow-glow",
                compact ? "h-24 w-24" : "h-32 w-32",
              )}
            >
              <img
                src={rank.icon}
                alt={`${rank.name} rank icon`}
                className={cn("object-contain", compact ? "h-16 w-16" : "h-24 w-24")}
              />
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Learning Rank
              </p>
              <div className="space-y-1">
                <h3 className={cn("font-display font-semibold text-foreground", compact ? "text-xl" : "text-3xl")}>
                  Lv. {snapshot.level} {snapshot.rankName}
                </h3>
                <p className="text-xs font-medium text-muted-foreground">
                  Level {snapshot.level - rank.minLevel + 1} of {rank.maxLevel - rank.minLevel + 1} in {rank.name}
                </p>
                <p className="text-sm text-muted-foreground">{snapshot.totalXp.toLocaleString()} XP</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{isMaxLevel ? "Maximum level reached" : `${xpIntoLevel}/100 XP this level`}</span>
              <span>{isMaxLevel ? "Legend complete" : `${xpToNextLevel} XP to next level`}</span>
            </div>
            <Progress value={levelProgress} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RankSummaryCard;
