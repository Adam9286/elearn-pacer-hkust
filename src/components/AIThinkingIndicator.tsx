import { motion } from "framer-motion";
import { Brain, Upload, Search, FileText, Sparkles } from "lucide-react";

interface AIThinkingIndicatorProps {
  progress: number;
  stage: string;
  estimatedTime: number;
}

const stages = [
  { icon: Upload, label: "Uploading files", range: [0, 20] },
  { icon: Brain, label: "Understanding question", range: [20, 40] },
  { icon: Search, label: "Searching course materials", range: [40, 70] },
  { icon: FileText, label: "Generating response", range: [70, 90] },
  { icon: Sparkles, label: "Finalizing answer", range: [90, 100] },
];

export const AIThinkingIndicator = ({ progress, stage, estimatedTime }: AIThinkingIndicatorProps) => {
  const currentStageIndex = stages.findIndex(s => s.label === stage);
  const CurrentIcon = stages[currentStageIndex]?.icon || Brain;

  return (
    <div className="space-y-3">
      {/* Animated dots sequence */}
      <div className="flex items-center gap-2">
        {stages.map((s, idx) => {
          const isActive = idx === currentStageIndex;
          const isComplete = idx < currentStageIndex;
          
          return (
            <motion.div
              key={idx}
              animate={{
                scale: isActive ? [1, 1.3, 1] : 1,
                opacity: isComplete ? 1 : isActive ? 1 : 0.3,
              }}
              transition={{
                duration: 0.6,
                repeat: isActive ? Infinity : 0,
                ease: "easeInOut",
              }}
              className={`w-2 h-2 rounded-full ${
                isComplete
                  ? "bg-electric-cyan glow-cyan"
                  : isActive
                  ? "bg-gradient-to-r from-electric-cyan to-neon-purple"
                  : "bg-gray-400/30"
              }`}
            />
          );
        })}
      </div>

      {/* Progress percentage and stage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <CurrentIcon className="w-4 h-4 text-electric-cyan" />
          </motion.div>
          <span className="text-sm font-medium text-foreground">{stage}...</span>
        </div>
        <motion.span
          key={progress}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-lg font-bold text-electric-cyan tracking-wider"
        >
          {progress}%
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-electric-cyan via-neon-purple to-electric-cyan animate-shimmer"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Time estimate */}
      {estimatedTime > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground italic text-center"
        >
          ~{estimatedTime} seconds remaining
        </motion.p>
      )}
    </div>
  );
};
