// Slide list sidebar for admin review page

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, Circle, XCircle } from 'lucide-react';
import type { SlideExplanation, SlideStatus } from '@/services/adminApi';

interface SlideListProps {
  slides: SlideExplanation[];
  selectedId: string | null;
  onSelect: (slide: SlideExplanation) => void;
}

const statusIcon: Record<SlideStatus, React.ReactNode> = {
  draft: <Circle className="h-4 w-4 text-yellow-500" />,
  approved: <CheckCircle className="h-4 w-4 text-green-500" />,
  rejected: <XCircle className="h-4 w-4 text-red-500" />,
};

export function SlideList({ slides, selectedId, onSelect }: SlideListProps) {
  const counts = {
    total: slides.length,
    draft: slides.filter(s => s.status === 'draft').length,
    approved: slides.filter(s => s.status === 'approved').length,
    rejected: slides.filter(s => s.status === 'rejected').length,
  };

  return (
    <div className="flex flex-col h-full border-r">
      {/* Summary header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="font-medium">Slides ({counts.total})</span>
          <div className="flex gap-1">
            <Badge variant="default" className="bg-green-600 text-xs">
              {counts.approved}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {counts.draft}
            </Badge>
            {counts.rejected > 0 && (
              <Badge variant="destructive" className="text-xs">
                {counts.rejected}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Slide list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {slides.map(slide => (
            <button
              key={slide.id}
              onClick={() => onSelect(slide)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors',
                'hover:bg-accent',
                selectedId === slide.id && 'bg-accent'
              )}
            >
              {statusIcon[slide.status]}
              <span className="flex-1 text-sm">
                Slide {slide.slide_number}
              </span>
            </button>
          ))}
          {slides.length === 0 && (
            <p className="text-sm text-muted-foreground p-4 text-center">
              No slides generated yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
