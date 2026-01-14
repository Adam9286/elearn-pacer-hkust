// Slide Progress Tracker Component
// Visual progress display with slide indicators and comprehension stats

import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SlideProgressStats } from "@/types/courseTypes";

interface SlideProgressTrackerProps extends SlideProgressStats {
  className?: string;
}

/**
 * SlideProgressTracker - Visual progress display
 * 
 * Shows:
 * - Progress bar with percentage
 * - Comprehension stats (questions answered/shown, accuracy)
 * - Individual slide indicators (completed, current, upcoming)
 */
const SlideProgressTracker = ({
  currentSlide,
  totalSlides,
  slidesViewed,
  questionsShown,
  questionsAnswered,
  questionsCorrect,
  className
}: SlideProgressTrackerProps) => {
  const progressPercent = totalSlides > 0 
    ? Math.round((currentSlide / totalSlides) * 100) 
    : 0;
  
  const accuracy = questionsAnswered > 0 
    ? Math.round((questionsCorrect / questionsAnswered) * 100) 
    : 0;

  // Determine accuracy color
  const getAccuracyColor = () => {
    if (accuracy >= 70) return "text-green-600 dark:text-green-400";
    if (accuracy >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getAccuracyDotColor = () => {
    if (accuracy >= 70) return "bg-green-500";
    if (accuracy >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className={cn("", className)}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Main Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Section Progress</span>
              <span className="font-medium text-foreground">
                {currentSlide} / {totalSlides}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Comprehension Stats */}
          {questionsShown > 0 && (
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <div className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  {questionsAnswered}/{questionsShown} answered
                </span>
              </div>
              
              {questionsAnswered > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "h-2 w-2 rounded-full",
                    getAccuracyDotColor()
                  )} />
                  <span className={cn("font-medium", getAccuracyColor())}>
                    {accuracy}% accuracy
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Slide Indicators */}
          <div className="flex flex-wrap gap-1.5 pt-2">
            {Array.from({ length: Math.min(totalSlides, 20) }, (_, i) => {
              const slideNum = i + 1;
              const isViewed = slidesViewed.includes(slideNum);
              const isCurrent = slideNum === currentSlide;
              
              return (
                <div
                  key={slideNum}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-all",
                    isCurrent 
                      ? "bg-primary ring-2 ring-primary/30 scale-125" 
                      : isViewed 
                        ? "bg-primary/60" 
                        : "bg-muted-foreground/30"
                  )}
                  title={`Section ${slideNum}${isCurrent ? ' (current)' : isViewed ? ' (viewed)' : ''}`}
                />
              );
            })}
            {totalSlides > 20 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{totalSlides - 20} more
              </span>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/30" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary/60" />
              <span>Viewed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              <span>Upcoming</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SlideProgressTracker;
