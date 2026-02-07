import { useState } from 'react';
import { ChevronDown, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { RetrievedMaterial } from '@/types/chatTypes';
import { parseCitation, matchMaterialToCitation, isNoCitationMessage, buildCitationFromMaterial, getCitationDedupeKey } from '@/utils/citationParser';
import { CitationCard } from './CitationCard';

interface CitationSectionProps {
  citations: string[];
  retrievedMaterials?: RetrievedMaterial[];
}

export const CitationSection = ({ citations, retrievedMaterials = [] }: CitationSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize: API may send string[] or mixed (e.g. objects); only use strings for parsing
  const citationStrings = Array.isArray(citations)
    ? citations.filter((c): c is string => typeof c === 'string')
    : [];

  const hasCitations = citationStrings.length > 0 && !isNoCitationMessage(citationStrings);

  // Parse citation strings and match to materials
  const parsedCitations = hasCitations
    ? citationStrings.map((raw) => {
        const parsed = parseCitation(raw);
        const material = matchMaterialToCitation(parsed, retrievedMaterials);
        return { parsed, material };
      })
    : [];

  // Find materials that weren't matched to any citation string
  const matchedMaterialIds = new Set(
    parsedCitations
      .filter(c => c.material)
      .map(c => {
        const m = c.material!;
        return `${m.document_title || ''}-${m.page_number ?? ''}-${m.slide_number ?? ''}`;
      })
  );

  const unmatchedMaterials = (retrievedMaterials || []).filter(m => {
    if (!m || !m.document_title) return false;
    const key = `${m.document_title}-${m.page_number ?? ''}-${m.slide_number ?? ''}`;
    return !matchedMaterialIds.has(key);
  });

  // Build citation cards for unmatched materials (they have full data, just no citation string)
  const unmatchedCards = unmatchedMaterials.map(m => ({
    parsed: buildCitationFromMaterial(m),
    material: m,
  }));

  // Combine: parsed citations first, then unmatched materials
  const combinedCards = [...parsedCitations, ...unmatchedCards];

  // Dedupe by exact same source + slide/page + content (keep first occurrence)
  const seenKeys = new Set<string>();
  const allCards = combinedCards.filter((card) => {
    const key = getCitationDedupeKey(card.parsed, card.material);
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  // Don't render if nothing to show
  if (allCards.length === 0) {
    return null;
  }

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
            {allCards.length}
          </Badge>
          <ChevronDown 
            className={cn(
              "w-3.5 h-3.5 ml-auto transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3 space-y-2">
          {allCards.map((card, index) => (
            <CitationCard 
              key={`${card.parsed.documentTitle}-${card.parsed.pageNumber || card.parsed.slideNumber || index}`}
              citation={card.parsed}
              material={card.material}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
