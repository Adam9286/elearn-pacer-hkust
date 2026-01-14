// AI Explanation Panel Component
// Displays AI-generated explanations with explicit contentState handling

import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ContentState } from "@/types/courseTypes";

interface ExplanationPanelProps {
  slideNumber: number;
  contentState: ContentState;   // Explicit state: idle | loading | ready | error
  explanation?: string;
  keyPoints?: string[];
  errorMessage?: string;        // Per-slide error message
  onRetry: () => void;
  className?: string;
}

/**
 * ExplanationPanel - Displays AI-generated slide explanations
 * 
 * Uses explicit contentState for deterministic rendering:
 * - idle: Placeholder waiting for fetch
 * - loading: Skeleton with spinner
 * - error: Error message + Retry button
 * - ready: Full explanation + key points
 */
const ExplanationPanel = ({
  slideNumber,
  contentState,
  explanation,
  keyPoints,
  errorMessage,
  onRetry,
  className
}: ExplanationPanelProps) => {
  return (
    <Card className={cn(
      "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent",
      className
    )}>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">AI Tutor</span>
          <Badge variant="secondary" className="text-xs">
            Section {slideNumber}
          </Badge>
        </div>

        {/* Loading State */}
        {contentState === 'loading' && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[85%]" />
            <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating explanation...
            </div>
          </div>
        )}

        {/* Error State */}
        {contentState === 'error' && (
          <div className="flex items-start gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Failed to load explanation</p>
              <p className="text-sm text-muted-foreground mt-1">
                {errorMessage || 'An unexpected error occurred'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={onRetry}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Idle State - Placeholder */}
        {contentState === 'idle' && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>AI explanation will appear here</p>
            <p className="text-sm mt-1">Navigate to a section to get started</p>
          </div>
        )}

        {/* Ready State - Explanation + Key Points */}
        {contentState === 'ready' && explanation && (
          <div className="space-y-4">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {explanation}
            </p>

            {keyPoints && keyPoints.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                  Key Points
                </h4>
                <ul className="space-y-2">
                  {keyPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-primary font-bold shrink-0">•</span>
                      <span className="text-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExplanationPanel;
