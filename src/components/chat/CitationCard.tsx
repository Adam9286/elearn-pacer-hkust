import { Book, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ParsedCitation, RetrievedMaterial } from '@/types/chatTypes';
import { getMaterialContent, isValidQuote, formatLectureName, truncateText } from '@/utils/citationParser';

interface CitationCardProps {
  citation: ParsedCitation;
  material?: RetrievedMaterial | null;
}

export const CitationCard = ({ citation, material }: CitationCardProps) => {
  const Icon = citation.sourceType === 'textbook' ? Book : FileText;
  
  // Get clean lecture/source name
  const sourceName = formatLectureName(citation.documentTitle, material);
  
  // Get page/slide location
  const location = citation.pageNumber 
    ? `Page ${citation.pageNumber}` 
    : citation.slideNumber 
      ? `Slide ${citation.slideNumber}` 
      : null;
  
  // Get quote content if valid (not JSON, not too short)
  const rawContent = getMaterialContent(material);
  const quote = isValidQuote(rawContent) ? truncateText(rawContent, 150) : null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
      {/* Source header: Icon + Name + Page badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {sourceName}
          </span>
        </div>
        
        {location && (
          <Badge 
            variant="secondary" 
            className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary border-0 font-medium"
          >
            {location}
          </Badge>
        )}
      </div>
      
      {/* Quote - only shown if valid readable content */}
      {quote && (
        <p className="text-xs text-muted-foreground italic mt-2 leading-relaxed">
          "{quote}"
        </p>
      )}
    </div>
  );
};
