import {
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ContentState } from "@/types/courseTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExplanationPanelProps {
  slideNumber: number;
  totalSlides: number;
  contentState: ContentState;
  explanation?: string;
  keyPoints?: string[];
  errorMessage?: string;
  onRetry: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSlideJump: (page: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading: boolean;
  className?: string;
}

const ExplanationPanel = ({
  slideNumber,
  totalSlides,
  contentState,
  explanation,
  keyPoints,
  errorMessage,
  onRetry,
  onPrevious,
  onNext,
  onSlideJump,
  canGoNext,
  canGoPrevious,
  isLoading,
  className,
}: ExplanationPanelProps) => {
  const slideOptions = Array.from({ length: totalSlides }, (_, i) => i + 1);

  return (
    <section
      className={cn(
        "flex min-h-[300px] flex-col rounded-[24px] border border-white/6 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className
      )}
    >
      <div className="border-b border-white/6 pb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary/80" />
                AI Tutor
              </div>
              <h3 className="text-xl font-semibold text-foreground">
                Explaining Slide {slideNumber} of {totalSlides}
              </h3>
            </div>

            <div className="inline-flex w-full items-center justify-between gap-2 rounded-full border border-white/8 bg-black/10 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:w-auto sm:justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={onPrevious}
                disabled={!canGoPrevious || isLoading}
                aria-label="Previous slide"
                className="h-10 w-10 shrink-0 rounded-full border border-white/8 bg-transparent p-0 text-foreground/85 hover:bg-white/[0.06] hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex min-w-0 items-center gap-2 px-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Slide
                </span>
                <Select
                  value={slideNumber.toString()}
                  onValueChange={(value) => onSlideJump(parseInt(value, 10))}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-8 w-[88px] rounded-full border-white/10 bg-transparent text-sm font-semibold shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 bg-popover">
                    {slideOptions.map((slide) => (
                      <SelectItem key={slide} value={slide.toString()}>
                        {slide}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="shrink-0 text-sm font-medium text-foreground/90">of {totalSlides}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={onNext}
                disabled={!canGoNext || isLoading}
                aria-label={slideNumber === totalSlides ? "Finish lesson" : "Next slide"}
                className="h-10 shrink-0 rounded-full border border-white/8 bg-transparent px-3 text-sm font-medium text-foreground/85 hover:bg-white/[0.06] hover:text-foreground"
              >
                {slideNumber < totalSlides ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">Finish</span>
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>

      <div className="flex-1 pt-4">
        {contentState === "loading" && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-white/8" />
            <Skeleton className="h-4 w-[90%] bg-white/8" />
            <Skeleton className="h-4 w-[80%] bg-white/8" />
            <Skeleton className="h-4 w-[85%] bg-white/8" />
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating explanation for Slide {slideNumber}...
            </div>
          </div>
        )}

        {contentState === "error" && (
          <div className="flex items-start gap-3 rounded-[20px] border border-destructive/20 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load explanation</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage || "An unexpected error occurred"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-destructive/30 hover:bg-destructive/10"
                onClick={onRetry}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {contentState === "idle" && (
          <div className="py-10 text-center text-muted-foreground">
            <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
            <p>AI Tutor explanation will appear here</p>
            <p className="mt-1 text-sm">
              Choose a slide to start learning with AI guidance.
            </p>
          </div>
        )}

        {contentState === "ready" && explanation && (
          <div className="space-y-5">
            <p className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">
              {explanation}
            </p>

            {keyPoints && keyPoints.length > 0 && (
              <div className="space-y-3 border-t border-white/6 pt-4">
                <h4 className="text-sm font-semibold text-foreground/90">Key Points</h4>
                <ul className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <span className="text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ExplanationPanel;
