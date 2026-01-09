import { Award, TrendingUp, Footprints, Wifi, Truck, Star, Shield, Trophy } from "lucide-react";
import { useUserProgress } from "@/contexts/UserProgressContext";
import { chapters } from "@/data/courseContent";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Badge definitions
const BADGES = [
  { id: "first_steps", name: "First Steps", icon: Footprints, requirement: "Complete your first lesson" },
  { id: "network_novice", name: "Network Novice", icon: Wifi, requirement: "Complete Section 1" },
  { id: "transport_expert", name: "Transport Expert", icon: Truck, requirement: "Complete Section 2" },
  { id: "halfway_hero", name: "Halfway Hero", icon: Star, requirement: "Complete 50% of lessons" },
  { id: "security_sentinel", name: "Security Sentinel", icon: Shield, requirement: "Complete Section 10" },
  { id: "course_champion", name: "Course Champion", icon: Trophy, requirement: "Complete all sections" },
];

// Calculate total lessons across all chapters
const TOTAL_LESSONS = chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
const TOTAL_SECTIONS = chapters.length;

const UserStats = () => {
  const { progress, loading } = useUserProgress();
  const [displayedXP, setDisplayedXP] = useState(0);

  // Calculate total lessons completed
  const totalLessonsCompleted = progress.reduce(
    (acc, p) => acc + (p.lessons_completed?.length || 0),
    0
  );

  // Calculate sections completed
  const sectionsCompleted = chapters.filter((ch) => {
    const chProgress = progress.find((p) => p.chapter_id === ch.id);
    return chProgress && (chProgress.lessons_completed?.length || 0) >= ch.lessons.length;
  }).length;

  // XP Calculation: 50 per lesson + 100 per section + 500 bonus for all
  const lessonXP = totalLessonsCompleted * 50;
  const sectionXP = sectionsCompleted * 100;
  const bonusXP = sectionsCompleted === TOTAL_SECTIONS ? 500 : 0;
  const totalXP = lessonXP + sectionXP + bonusXP;

  // Badge calculation
  const earnedBadges = BADGES.filter((badge) => {
    switch (badge.id) {
      case "first_steps":
        return totalLessonsCompleted >= 1;
      case "network_novice":
        return progress.some(
          (p) => p.chapter_id === 1 && (p.lessons_completed?.length || 0) >= chapters[0].lessons.length
        );
      case "transport_expert":
        return progress.some(
          (p) => p.chapter_id === 2 && (p.lessons_completed?.length || 0) >= chapters[1].lessons.length
        );
      case "halfway_hero":
        return totalLessonsCompleted >= Math.ceil(TOTAL_LESSONS / 2);
      case "security_sentinel":
        return progress.some(
          (p) => p.chapter_id === 10 && (p.lessons_completed?.length || 0) >= chapters[9].lessons.length
        );
      case "course_champion":
        return sectionsCompleted === TOTAL_SECTIONS;
      default:
        return false;
    }
  });

  // Animate XP counter
  useEffect(() => {
    if (loading) return;
    
    const duration = 1000;
    const startTime = Date.now();
    const startValue = displayedXP;
    const endValue = totalXP;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplayedXP(Math.round(startValue + (endValue - startValue) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [totalXP, loading]);

  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-28 rounded-full" />
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* XP Display */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-electric-cyan/15 to-neon-blue/15 border border-electric-cyan/20 hover:border-electric-cyan/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all duration-300 backdrop-blur-sm cursor-help"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <TrendingUp className="w-4 h-4 text-electric-cyan dark:drop-shadow-[0_0_6px_rgba(0,255,255,0.6)]" />
              <span className="text-sm font-semibold dark:text-white text-foreground tabular-nums">
                {displayedXP.toLocaleString()} XP
              </span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-sm mb-2">XP Breakdown</p>
              <p>📚 Lessons: {totalLessonsCompleted} × 50 = <span className="font-medium">{lessonXP} XP</span></p>
              <p>✅ Sections: {sectionsCompleted} × 100 = <span className="font-medium">{sectionXP} XP</span></p>
              {bonusXP > 0 && (
                <p>🏆 Completion Bonus: <span className="font-medium text-accent">{bonusXP} XP</span></p>
              )}
              <hr className="my-1 border-border/50" />
              <p className="font-semibold">Total: {totalXP.toLocaleString()} XP</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Badges Display */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-neon-purple/15 to-cyber-pink/15 border border-neon-purple/20 hover:border-neon-purple/40 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all duration-300 backdrop-blur-sm cursor-help"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Award className="w-4 h-4 text-neon-purple dark:drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
              <span className="text-sm font-semibold dark:text-white text-foreground">
                {earnedBadges.length} Badge{earnedBadges.length !== 1 ? "s" : ""}
              </span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold text-sm mb-2">Badges ({earnedBadges.length}/{BADGES.length})</p>
              {BADGES.map((badge) => {
                const earned = earnedBadges.some((b) => b.id === badge.id);
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center gap-2 text-xs ${earned ? "opacity-100" : "opacity-40"}`}
                  >
                    <Icon className={`w-4 h-4 ${earned ? "text-accent" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-medium">{badge.name}</p>
                      <p className="text-muted-foreground text-[10px]">{badge.requirement}</p>
                    </div>
                    {earned && <span className="ml-auto text-accent">✓</span>}
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default UserStats;
