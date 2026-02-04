import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RetrievedMaterial } from '@/types/chatTypes';
import { parseCitation, matchMaterialToCitation, isNoCitationMessage } from '@/utils/citationParser';
import { CitationCard } from './CitationCard';

interface CitationSectionProps {
  citations: string[];
  retrievedMaterials?: RetrievedMaterial[];
}

export const CitationSection = ({ citations, retrievedMaterials = [] }: CitationSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if no citations or if it's a "no materials" message
  if (!citations || citations.length === 0 || isNoCitationMessage(citations)) {
    return null;
  }

  // Parse all citations
  const parsedCitations = citations.map(raw => parseCitation(raw));

  return (
    <div className="mt-4 pt-3 border-t border-border/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full group">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="font-medium uppercase tracking-wide">Sources</span>
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0"
          >
            {parsedCitations.length}
          </Badge>
          <ChevronDown 
            className={cn(
              "w-3.5 h-3.5 ml-auto transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3 space-y-2">
          {parsedCitations.map((citation, index) => {
            const matchedMaterial = matchMaterialToCitation(citation, retrievedMaterials);
            
            return (
              <CitationCard 
                key={`${citation.documentTitle}-${citation.pageNumber || citation.slideNumber || index}`}
                citation={citation}
                material={matchedMaterial}
              />
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
