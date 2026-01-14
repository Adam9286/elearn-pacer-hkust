import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideProgressProps {
  currentSlide: number;
  totalSlides: number;
  questionsAnswered: number;
  questionsCorrect: number;
  questionsShown: number;
}

const SlideProgress = ({
  currentSlide,
  totalSlides,
  questionsAnswered,
  questionsCorrect,
  questionsShown,
}: SlideProgressProps) => {
  const progressPercent = totalSlides > 0 ? Math.round((currentSlide / totalSlides) * 100) : 0;
  const accuracy = questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Main Progress */}
      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Slide Progress</span>
          <span className="font-medium">
            {currentSlide} / {totalSlides}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Comprehension Stats */}
      {questionsShown > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {questionsAnswered}/{questionsShown} answered
            </span>
          </div>
          {questionsAnswered > 0 && (
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "h-2 w-2 rounded-full",
                accuracy >= 70 ? "bg-green-500" : accuracy >= 40 ? "bg-yellow-500" : "bg-red-500"
              )} />
              <span className="text-muted-foreground">
                {accuracy}% accuracy
              </span>
            </div>
          )}
        </div>
      )}

      {/* Slide Indicators */}
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: Math.min(totalSlides, 20) }, (_, i) => {
          const slideNum = i + 1;
          const isViewed = slideNum <= currentSlide;
          const isCurrent = slideNum === currentSlide;
          
          return (
            <div
              key={slideNum}
              className={cn(
                "h-2 w-2 rounded-full transition-all",
                isCurrent ? "bg-primary scale-125" : isViewed ? "bg-primary/60" : "bg-muted"
              )}
            />
          );
        })}
        {totalSlides > 20 && (
          <span className="text-xs text-muted-foreground">+{totalSlides - 20} more</span>
        )}
      </div>
    </div>
  );
};

export default SlideProgress;
