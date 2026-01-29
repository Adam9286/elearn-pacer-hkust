// Page Navigation Component
// Simplified top navigation bar with Page terminology

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading: boolean;
}

/**
 * PageNavigation - Clean top navigation for AI Tutor
 * Uses "Page" terminology for clarity
 */
const PageNavigation = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  isLoading
}: PageNavigationProps) => {
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-2">
      {/* Previous button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onPrevious}
        disabled={!canGoPrevious || isLoading}
        className="gap-2"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous Page</span>
      </Button>
      
      {/* Page indicator */}
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <span className="text-sm font-medium">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      {/* Next button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onNext}
        disabled={!canGoNext || isLoading}
        className="gap-2"
      >
        <span className="hidden sm:inline">
          {currentPage === totalPages ? 'Complete' : 'Next Page'}
        </span>
        {currentPage < totalPages && <ChevronRight className="h-4 w-4" />}
      </Button>
    </div>
  );
};

export default PageNavigation;
