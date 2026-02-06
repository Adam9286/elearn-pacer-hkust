import { useState } from 'react';
import { Book, FileText, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ParsedCitation, RetrievedMaterial } from '@/types/chatTypes';
import { getMaterialContent, isValidQuote, getCollapsedSourceLabel } from '@/utils/citationParser';

interface CitationCardProps {
  citation: ParsedCitation;
  material?: RetrievedMaterial | null;
}

export const CitationCard = ({ citation, material }: CitationCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isTextbook = citation.sourceType === 'textbook' || material?.source_type === 'Textbook';
  const Icon = isTextbook ? Book : FileText;
  
  // Collapsed list: only "lecture number, then the name" (e.g. 15-LAN_Routing)
  const collapsedLabel = getCollapsedSourceLabel(citation, material);

  // For expanded view: page/slide and content
  const slideNum = (material?.slide_number ?? citation.slideNumber);
  const pageNum = (material?.page_number ?? citation.pageNumber);
  const validSlideNum = slideNum != null && slideNum !== 'N/A' && !isNaN(Number(slideNum)) ? Number(slideNum) : null;
  const validPageNum = pageNum != null && pageNum !== 'N/A' && !isNaN(Number(pageNum)) ? Number(pageNum) : null;

  const rawContent = getMaterialContent(material);
  const hasContent = isValidQuote(rawContent);

  return (
    <div 
      role="button"
      tabIndex={0}
      className={cn(
        "rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5 transition-colors cursor-pointer hover:bg-muted/50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      )}
      onClick={() => setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(prev => !prev);
        }
      }}
    >
      {/* Collapsed: only lecture number + name (or Textbook) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {collapsedLabel}
          </span>
        </div>
        <ChevronDown 
          className={cn(
            "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0",
            isExpanded && "rotate-180"
          )} 
        />
      </div>

      {/* Expanded: lecture name, page number, source type, content — clearly formatted */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground font-medium">Source</dt>
            <dd className="text-foreground">{material?.document_title ?? citation.documentTitle}</dd>

            {(validSlideNum != null || validPageNum != null) && (
              <>
                <dt className="text-muted-foreground font-medium">{isTextbook ? 'Page' : 'Slide'}</dt>
                <dd className="text-foreground">{isTextbook ? validPageNum : validSlideNum}</dd>
              </>
            )}

            {(material?.source_type || citation.sourceType) && (
              <>
                <dt className="text-muted-foreground font-medium">Type</dt>
                <dd className="text-foreground">{material?.source_type ?? (citation.sourceType === 'textbook' ? 'Textbook' : citation.sourceType === 'lecture' ? 'Lecture Slides' : 'Unknown')}</dd>
              </>
            )}
          </dl>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Content</div>
            <div className="max-h-52 overflow-y-auto rounded-md bg-background/80 border border-border/30 p-3">
              {hasContent ? (
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {rawContent}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No excerpt available. The n8n &quot;Extract Tool Results&quot; node should pass <code className="text-xs">content</code> in each <code className="text-xs">retrieved_materials</code> item.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
