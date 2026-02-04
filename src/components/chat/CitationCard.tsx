import { Book, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ParsedCitation, RetrievedMaterial } from '@/types/chatTypes';
import { MaterialPreview } from './MaterialPreview';

interface CitationCardProps {
  citation: ParsedCitation;
  material?: RetrievedMaterial | null;
}

export const CitationCard = ({ citation, material }: CitationCardProps) => {
  const Icon = citation.sourceType === 'textbook' ? Book : FileText;
  const locationLabel = citation.pageNumber 
    ? `Page ${citation.pageNumber}` 
    : citation.slideNumber 
      ? `Slide ${citation.slideNumber}` 
      : null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              {citation.documentTitle}
            </p>
            {citation.chapter && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {citation.chapter}
              </p>
            )}
          </div>
        </div>
        
        {locationLabel && (
          <Badge 
            variant="secondary" 
            className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary border-0 font-medium flex-shrink-0"
          >
            {locationLabel}
          </Badge>
        )}
      </div>
      
      {/* "Why this source?" expandable section */}
      {material && (
        <MaterialPreview material={material} />
      )}
    </div>
  );
};
