import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useUserProgress } from "@/contexts/UserProgressContext";
import { cn } from "@/lib/utils";
import { getRankForId } from "@/utils/rankSystem";

const AUTO_DISMISS_MS = 3000;

const RankUpOverlay = () => {
  const { rankUpEvent, dismissRankUp } = useUserProgress();

  useEffect(() => {
    if (!rankUpEvent) return;
    const timeoutId = window.setTimeout(() => {
      dismissRankUp();
    }, AUTO_DISMISS_MS);

    return () => window.clearTimeout(timeoutId);
  }, [rankUpEvent, dismissRankUp]);

  return (
    <AnimatePresence>
      {rankUpEvent ? (
        <motion.div
          key={rankUpEvent.triggeredAt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/40 backdrop-blur-sm"
          onClick={dismissRankUp}
          role="presentation"
        >
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative overflow-hidden rounded-3xl border border-border/70 bg-card/95 px-10 py-8 text-center shadow-glow"
            onClick={(event) => event.stopPropagation()}
          >
            <RankUpContent rankUpEvent={rankUpEvent} />
            <button
              type="button"
              onClick={dismissRankUp}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-border/70 bg-background/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-background/90 hover:text-foreground"
            >
              Continue
            </button>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

interface RankUpContentProps {
  rankUpEvent: NonNullable<ReturnType<typeof useUserProgress>["rankUpEvent"]>;
}

const RankUpContent = ({ rankUpEvent }: RankUpContentProps) => {
  const rank = getRankForId(rankUpEvent.rankId);

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-25",
          `bg-gradient-to-br ${rank.tone}`,
        )}
      />
      <div className="relative flex flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Rank Up
        </p>
        <div className="flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-background/40 shadow-glow">
          <img
            src={rank.icon}
            alt={`${rank.name} rank icon`}
            className="h-24 w-24 object-contain"
          />
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-3xl font-semibold text-foreground">
            {rank.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            You reached Level {rankUpEvent.level}.
          </p>
        </div>
      </div>
    </>
  );
};

export default RankUpOverlay;
