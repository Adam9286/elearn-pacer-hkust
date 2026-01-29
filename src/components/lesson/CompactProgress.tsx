// Compact Progress Bar Component
// Simplified progress display with page count and question stats

import { Progress } from "@/components/ui/progress";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactProgressProps {
  currentPage: number;
  totalPages: number;
  questionsAnswered: number;
  questionsShown: number;
  questionsCorrect: number;
  className?: string;
}

/**
 * CompactProgress - Minimal progress bar for AI Tutor
 * Shows page progress and optional question stats in a single line
 */
const CompactProgress = ({
  currentPage,
  totalPages,
  questionsAnswered,
  questionsShown,
  questionsCorrect,
  className
}: CompactProgressProps) => {
  const progressPercent = totalPages > 0 
    ? Math.round((currentPage / totalPages) * 100) 
    : 0;
  
  const accuracy = questionsAnswered > 0 
    ? Math.round((questionsCorrect / questionsAnswered) * 100) 
    : 0;

  return (
    <div className={cn(
      "flex items-center justify-between gap-4 px-4 py-3 bg-muted/30 rounded-lg",
      className
    )}>
      {/* Progress section */}
      <div className="flex items-center gap-3 flex-1">
        <Progress value={progressPercent} className="h-2 flex-1 max-w-[200px]" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      {/* Question stats - only show if questions have been shown */}
      {questionsShown > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <HelpCircle className="h-4 w-4" />
          <span>
            {questionsAnswered}/{questionsShown} answered
            {questionsAnswered > 0 && (
              <span className={cn(
                "ml-1",
                accuracy >= 70 ? "text-green-600 dark:text-green-400" :
                accuracy >= 40 ? "text-yellow-600 dark:text-yellow-400" :
                "text-red-600 dark:text-red-400"
              )}>
                ({accuracy}%)
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default CompactProgress;
