import { useState } from 'react';
import { ChevronDown, BookOpen, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export interface RetrievedMaterial {
  lecture_id: string;
  lecture_title?: string;
  slide_number: number;
  slide_text?: string;
  similarity?: number;
}

interface LectureReferencesProps {
  materials: RetrievedMaterial[];
}

export const LectureReferences = ({ materials }: LectureReferencesProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!materials || materials.length === 0) return null;

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '…';
  };

  const formatSimilarity = (similarity?: number) => {
    if (similarity === undefined) return null;
    return `${Math.round(similarity * 100)}%`;
  };

  return (
    <div className="mt-3 pt-2 border-t border-border/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
          <BookOpen className="w-3.5 h-3.5" />
          <span className="font-medium">Lecture References</span>
          <Badge 
            variant="secondary" 
            className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-0"
          >
            {materials.length}
          </Badge>
          <ChevronDown 
            className={cn(
              "w-3.5 h-3.5 ml-auto transition-transform duration-200",
              isOpen && "rotate-180"
            )} 
          />
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2 space-y-2">
          {materials.map((material, index) => (
            <div
              key={`${material.lecture_id}-${material.slide_number}-${index}`}
              className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <FileText className="w-3 h-3 text-primary" />
                  <span>
                    {material.lecture_title || material.lecture_id}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">
                    Slide {material.slide_number}
                  </span>
                </div>
                {material.similarity !== undefined && (
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 font-mono bg-accent/10 text-accent-foreground border-accent/30"
                  >
                    {formatSimilarity(material.similarity)} match
                  </Badge>
                )}
              </div>
              
              {material.slide_text && (
                <p className="mt-1.5 text-[11px] text-muted-foreground italic leading-relaxed">
                  "{truncateText(material.slide_text)}"
                </p>
              )}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
