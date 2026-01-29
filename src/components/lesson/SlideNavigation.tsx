// Slide Navigation Component
// Controls for navigating between slides with toggle options

import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SlideNavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  onSkipToEnd?: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading: boolean;
  questionsEnabled: boolean;
  onQuestionsToggle: (enabled: boolean) => void;
}

/**
 * SlideNavigation - Header controls for slide navigation
 * 
 * Layout: [<] Slide X of Y [>]     Questions [toggle]  Skip to End
 */
const SlideNavigation = ({
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  onSkipToEnd,
  canGoNext,
  canGoPrevious,
  isLoading,
  questionsEnabled,
  onQuestionsToggle
}: SlideNavigationProps) => {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          disabled={!canGoPrevious || isLoading}
          aria-label="Previous section"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium px-3 min-w-[100px] text-center">
          Section {currentSlide} of {totalSlides}
        </span>
        
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={!canGoNext || isLoading}
          aria-label="Next section"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Options */}
      <div className="flex items-center gap-4">
        {/* Popup Questions Toggle */}
        <div className="flex items-center gap-2">
          <Switch 
            id="questions-toggle"
            checked={questionsEnabled}
            onCheckedChange={onQuestionsToggle}
          />
          <Label htmlFor="questions-toggle" className="text-sm cursor-pointer">
            Popup Questions
          </Label>
        </div>
        
        {/* Skip to End */}
        {onSkipToEnd && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSkipToEnd} 
            disabled={isLoading || currentSlide === totalSlides}
          >
            <SkipForward className="mr-2 h-4 w-4" />
            Skip to End
          </Button>
        )}
      </div>
    </div>
  );
};

export default SlideNavigation;
