import { motion, AnimatePresence } from "framer-motion";
import { Brain, Search, FileText, Sparkles, Lightbulb } from "lucide-react";
import { useState, useEffect } from "react";

interface AIThinkingIndicatorProps {
  isActive: boolean;
}

const stages = [
  { icon: Brain, label: "Thinking..." },
  { icon: Search, label: "Searching course materials" },
  { icon: FileText, label: "Reading relevant content" },
  { icon: Sparkles, label: "Crafting response" },
];

const tips = [
  "Looking through your course materials...",
  "Checking lecture notes and slides...",
  "Finding the most relevant information...",
  "Almost there, putting it together...",
];

export const AIThinkingIndicator = ({ isActive }: AIThinkingIndicatorProps) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Cycle through stages every 4 seconds
  useEffect(() => {
    if (!isActive) {
      setStageIndex(0);
      setElapsedSeconds(0);
      return;
    }

    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % stages.length);
    }, 4000);

    return () => clearInterval(stageInterval);
  }, [isActive]);

  // Cycle through tips every 5 seconds
  useEffect(() => {
    if (!isActive) {
      setTipIndex(0);
      return;
    }

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(tipInterval);
  }, [isActive]);

  // Elapsed time counter
  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0);
      return;
    }

    const timeInterval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [isActive]);

  if (!isActive) return null;

  const CurrentIcon = stages[stageIndex].icon;

  return (
    <div className="space-y-3 py-2">
      {/* Brain icon with bouncing dots */}
      <div className="flex items-center gap-3">
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="text-electric-cyan"
        >
          <Brain className="w-5 h-5" />
        </motion.div>
        
        {/* Bouncing dots */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-electric-cyan to-neon-purple"
            />
          ))}
        </div>
      </div>

      {/* Animated stage label */}
      <div className="flex items-center gap-2 min-h-[24px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stageIndex}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <CurrentIcon className="w-4 h-4 text-electric-cyan" />
            <span className="text-sm font-medium text-foreground">
              {stages[stageIndex].label}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Indeterminate shimmer progress bar */}
      <div className="relative h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-electric-cyan to-transparent"
          animate={{
            x: ["-100%", "400%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Rotating tip */}
      <div className="flex items-start gap-2 min-h-[20px]">
        <Lightbulb className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs text-muted-foreground italic"
          >
            {tips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Elapsed time */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-muted-foreground text-center"
      >
        Thinking for {elapsedSeconds}s
      </motion.p>
    </div>
  );
};
