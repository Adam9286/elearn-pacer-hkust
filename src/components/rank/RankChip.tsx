import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getRankForId, type UserRankSnapshot } from "@/utils/rankSystem";

interface RankChipProps {
  snapshot?: UserRankSnapshot | null;
  className?: string;
  size?: "sm" | "md";
  showRankName?: boolean;
  onClick?: () => void;
}

const RankChip = ({
  snapshot,
  className,
  size = "sm",
  showRankName = true,
  onClick,
}: RankChipProps) => {
  if (!snapshot) return null;

  const rank = getRankForId(snapshot.rankId);
  const iconWrapSize = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const iconSize = size === "md" ? "h-6 w-6" : "h-[18px] w-[18px]";

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-2 border-border/70 bg-background/50 px-2 py-1 text-muted-foreground",
        onClick && "cursor-pointer transition hover:border-primary/40 hover:bg-background/80 hover:text-foreground",
        className,
      )}
      title={`${snapshot.rankName} Level ${snapshot.level}${onClick ? " — view all ranks" : ""}`}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-white/10 bg-background/60 shadow-glow",
          iconWrapSize,
        )}
      >
        <img
          src={rank.icon}
          alt=""
          aria-hidden="true"
          className={cn("object-contain", iconSize)}
        />
      </span>
      <span className="font-semibold text-foreground">Lv. {snapshot.level}</span>
      {showRankName ? <span>{snapshot.rankName}</span> : null}
    </Badge>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label="View all ranks"
      >
        {badgeContent}
      </button>
    );
  }

  return badgeContent;
};

export default RankChip;
