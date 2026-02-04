import { Book, FileText, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RetrievedMaterial } from '@/types/chatTypes';
import { formatSimilarity, getMaterialContent } from '@/utils/citationParser';

interface SourceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: RetrievedMaterial;
}

export const SourceDetailDialog = ({ open, onOpenChange, material }: SourceDetailDialogProps) => {
  const isTextbook = material.document_title?.toLowerCase().includes('textbook');
  const Icon = isTextbook ? Book : FileText;
  const sourceType = isTextbook ? 'Textbook' : 'Lecture Slides';
  const similarity = formatSimilarity(material.similarity);
  const content = getMaterialContent(material);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Icon className="w-5 h-5 text-primary" />
            Source Details
          </DialogTitle>
        </DialogHeader>

        {/* Metadata Section */}
        <div className="flex-shrink-0 space-y-3 border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">
                {material.document_title || 'Unknown Document'}
              </p>
              {material.chapter && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {material.chapter}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
              {sourceType}
            </Badge>
            {material.page_number && String(material.page_number) !== 'unknown' && (
              <Badge variant="outline" className="text-xs">
                Page {material.page_number}
              </Badge>
            )}
            {similarity && (
              <Badge 
                variant="outline" 
                className="text-xs font-mono bg-accent/10 text-accent-foreground border-accent/30"
              >
                {similarity} match
              </Badge>
            )}
          </div>
        </div>

        {/* Full Excerpt Section */}
        <div className="flex-1 min-h-0 pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Retrieved Excerpt
          </p>
          <ScrollArea className="h-[300px] rounded-md border border-border/50 bg-muted/20 p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {content || 'No content available'}
            </p>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
