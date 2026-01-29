// Slide list sidebar for admin review page - shows ALL slides including missing content

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, XCircle, Sparkles } from 'lucide-react';
import type { SlideExplanation, SlideStatus } from '@/services/adminApi';

interface SlideListProps {
  slides: SlideExplanation[];
  allSlideNumbers: number[];
  selectedSlideNumber: number | null;
  onSelectSlideNumber: (slideNumber: number) => void;
}

const statusIcon: Record<SlideStatus | 'missing', React.ReactNode> = {
  draft: <Circle className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
  missing: <Sparkles className="h-4 w-4 text-muted-foreground" />,
};

export function SlideList({ 
  slides, 
  allSlideNumbers, 
  selectedSlideNumber, 
  onSelectSlideNumber 
}: SlideListProps) {
  // Create a map of slide number to explanation for quick lookup
  const slideMap = new Map(slides.map(s => [s.slide_number, s]));

  const counts = {
    total: allSlideNumbers.length,
    missing: allSlideNumbers.length - slides.length,
    draft: slides.filter(s => s.status === 'draft').length,
    approved: slides.filter(s => s.status === 'approved').length,
    rejected: slides.filter(s => s.status === 'rejected').length,
  };

  return (
    <div className="flex flex-col h-full border-r">
      {/* Summary header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Slides ({counts.total})</span>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="default" className="bg-green-600 text-xs">
            {counts.approved} ✓
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {counts.draft} draft
          </Badge>
          {counts.missing > 0 && (
            <Badge variant="outline" className="text-xs">
              {counts.missing} empty
            </Badge>
          )}
          {counts.rejected > 0 && (
            <Badge variant="destructive" className="text-xs">
              {counts.rejected} ✗
            </Badge>
          )}
        </div>
      </div>

      {/* Slide list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {allSlideNumbers.map(slideNumber => {
            const explanation = slideMap.get(slideNumber);
            const status = explanation?.status || 'missing';
            const hasContent = explanation && explanation.explanation?.trim();

            return (
              <button
                key={slideNumber}
                onClick={() => onSelectSlideNumber(slideNumber)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                  'hover:bg-accent',
                  selectedSlideNumber === slideNumber && 'bg-accent'
                )}
              >
                {hasContent ? statusIcon[status] : statusIcon.missing}
                <span className="flex-1 text-sm">
                  Slide {slideNumber}
                </span>
                {!hasContent && (
                  <span className="text-xs text-muted-foreground">empty</span>
                )}
              </button>
            );
          })}
          {allSlideNumbers.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No slides found for this lecture
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
