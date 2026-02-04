import { useState } from 'react';
import { Book, FileText, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ParsedCitation, RetrievedMaterial } from '@/types/chatTypes';
import { MaterialPreview } from './MaterialPreview';
import { SourceDetailDialog } from './SourceDetailDialog';
import { getMaterialContent } from '@/utils/citationParser';

interface CitationCardProps {
  citation: ParsedCitation;
  material?: RetrievedMaterial | null;
}

export const CitationCard = ({ citation, material }: CitationCardProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const Icon = citation.sourceType === 'textbook' ? Book : FileText;
  const locationLabel = citation.pageNumber 
    ? `Page ${citation.pageNumber}` 
    : citation.slideNumber 
      ? `Slide ${citation.slideNumber}` 
      : null;

  const hasContent = material && getMaterialContent(material);

  return (
    <>
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
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {locationLabel && (
              <Badge 
                variant="secondary" 
                className="text-[11px] px-2 py-0.5 bg-primary/10 text-primary border-0 font-medium"
              >
                {locationLabel}
              </Badge>
            )}
            
            {hasContent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
        
        {/* "Why this source?" expandable section */}
        {material && (
          <MaterialPreview material={material} />
        )}
      </div>

      {/* Full detail dialog */}
      {material && (
        <SourceDetailDialog 
          open={dialogOpen} 
          onOpenChange={setDialogOpen} 
          material={material} 
        />
      )}
    </>
  );
};
