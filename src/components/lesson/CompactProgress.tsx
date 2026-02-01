// Compact Progress Bar Component
// Shows page progress and mastery percentage for lecture completion

import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactProgressProps {
  currentPage: number;
  totalPages: number;
  questionsAnswered: number;
  questionsCorrect: number;
  requiredCorrect: number;
  hasPassed: boolean;
  className?: string;
}

/**
 * CompactProgress - Progress bar with mastery tracking
 * Shows page progress and accuracy needed to complete lecture
 */
const CompactProgress = ({
  currentPage,
  totalPages,
  questionsAnswered,
  questionsCorrect,
  requiredCorrect,
  hasPassed,
  className
}: CompactProgressProps) => {
  const progressPercent = totalPages > 0 
    ? Math.round((currentPage / totalPages) * 100) 
    : 0;

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-muted/30 rounded-lg",
      className
    )}>
      {/* Page progress section */}
      <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
        <Progress value={progressPercent} className="h-2 flex-1 max-w-[200px]" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      {/* Mastery section - count-based progress */}
      <div className="flex items-center gap-4">
        {requiredCorrect > 0 && (
          <div className={cn(
            "flex items-center gap-2 text-sm font-medium",
            hasPassed 
              ? "text-green-600 dark:text-green-400" 
              : "text-muted-foreground"
          )}>
            {hasPassed ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Target className="h-4 w-4" />
            )}
            <span>
              {questionsCorrect}/{requiredCorrect} correct
            </span>
            {hasPassed ? (
              <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                Complete
              </span>
            ) : (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                ({requiredCorrect - questionsCorrect} more needed)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactProgress;
