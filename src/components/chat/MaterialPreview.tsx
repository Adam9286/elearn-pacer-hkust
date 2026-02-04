import { useState } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RetrievedMaterial } from '@/types/chatTypes';
import { truncateText, formatSimilarity, getMaterialContent } from '@/utils/citationParser';

interface MaterialPreviewProps {
  material: RetrievedMaterial;
}

export const MaterialPreview = ({ material }: MaterialPreviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const content = getMaterialContent(material);

  if (!content) return null;

  const similarity = formatSimilarity(material.similarity);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mt-1.5">
        <ChevronRight 
          className={cn(
            "w-3 h-3 transition-transform duration-200",
            isOpen && "rotate-90"
          )} 
        />
        <span>Why this source?</span>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="mt-2">
        <div className="rounded-md bg-muted/50 border border-border/30 p-2.5 text-xs">
          <div className="flex items-start gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
            <p className="text-muted-foreground italic leading-relaxed">
                "{truncateText(content, 200)}"
              </p>
              
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {similarity && (
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 font-mono bg-accent/10 text-accent-foreground border-accent/30"
                  >
                    {similarity} match
                  </Badge>
                )}
                {material.source_url && material.source_url !== 'LOCAL_UPLOAD' && (
                  <span className="text-[10px] text-muted-foreground/70 truncate">
                    Source: {material.source_url}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
