import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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

const CompactProgress = ({
  currentPage,
  totalPages,
  questionsAnswered,
  questionsCorrect,
  requiredCorrect,
  hasPassed,
  className,
}: CompactProgressProps) => {
  const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;
  const remaining = requiredCorrect - questionsCorrect;
  const isAlmostThere = remaining > 0 && remaining <= 10;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-[22px] border border-white/6 bg-white/[0.03] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex w-full flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-foreground">Slide progress</span>
          <span className="whitespace-nowrap text-muted-foreground">
            Slide {currentPage} of {totalPages}
          </span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-white/8" />
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <div
          className={cn(
            "flex items-center gap-2 font-medium",
            hasPassed ? "text-green-400" : "text-foreground/90"
          )}
        >
          {hasPassed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Target className="h-4 w-4 text-muted-foreground" />
          )}
          <span>Practice progress: {questionsCorrect}/{requiredCorrect} correct</span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="inline-flex items-center text-muted-foreground transition-colors hover:text-foreground"
                type="button"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[250px] text-center">
              <p className="text-sm">
                Track your progress answering slide questions.
                <br />
                <span className="text-xs text-muted-foreground">
                  {questionsCorrect} correct out of {questionsAnswered} answered
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {requiredCorrect > 0 &&
          (hasPassed ? (
            <Badge
              variant="secondary"
              className="rounded-full border border-green-500/25 bg-green-500/10 text-green-400"
            >
              Mastered
            </Badge>
          ) : isAlmostThere ? (
            <Badge
              variant="secondary"
              className="rounded-full border border-orange-500/25 bg-orange-500/10 text-orange-300"
            >
              <Flame className="mr-1 h-3 w-3" />
              Almost there
            </Badge>
          ) : (
            <span className="whitespace-nowrap text-xs text-muted-foreground">
              {remaining} more correct to master this lesson
            </span>
          ))}
      </div>
    </div>
  );
};

export default CompactProgress;
