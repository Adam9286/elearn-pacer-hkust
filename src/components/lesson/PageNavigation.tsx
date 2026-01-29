// Page Navigation Component
// Simplified top navigation bar with Page terminology and page jump dropdown

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageNavigationProps {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPageJump: (page: number) => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLoading: boolean;
}

/**
 * PageNavigation - Clean top navigation for AI Tutor
 * Uses "Page" terminology with dropdown for direct page jumps
 */
const PageNavigation = ({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
  onPageJump,
  canGoPrevious,
  canGoNext,
  isLoading
}: PageNavigationProps) => {
  // Generate page options
  const pageOptions = Array.from({ length: totalPages }, (_, i) => i + 1);

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
      
      {/* Page indicator with dropdown */}
      <div className="flex items-center gap-2">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <span className="text-sm font-medium">Page</span>
        <Select
          value={currentPage.toString()}
          onValueChange={(value) => onPageJump(parseInt(value, 10))}
          disabled={isLoading}
        >
          <SelectTrigger className="w-16 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-60 bg-popover">
            {pageOptions.map((page) => (
              <SelectItem key={page} value={page.toString()}>
                {page}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm font-medium">of {totalPages}</span>
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
