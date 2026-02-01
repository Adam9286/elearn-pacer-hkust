// Compact Progress Bar Component
// Shows page progress and mastery percentage for lecture completion

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Target, CheckCircle2, Flame, HelpCircle } from "lucide-react";
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

  const remaining = requiredCorrect - questionsCorrect;
  const isAlmostThere = remaining > 0 && remaining <= 10;

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
            <span className="flex items-center gap-1">
              {questionsCorrect}/{requiredCorrect} correct
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="inline-flex items-center" type="button">
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px] text-center">
                    <p className="text-sm">
                      Answer 80% of the questions correctly to master this lecture.
                      <br />
                      <span className="text-muted-foreground text-xs">
                        ({requiredCorrect} out of {totalPages} total pages)
                      </span>
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            {hasPassed ? (
              <Badge variant="default" className="bg-green-600 text-white">
                ✓ Lecture Mastered
              </Badge>
            ) : isAlmostThere ? (
              <Badge variant="secondary" className="animate-pulse bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30">
                <Flame className="h-3 w-3 mr-1" />
                Almost there! 🎯
              </Badge>
            ) : (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                ({remaining} more needed)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompactProgress;
