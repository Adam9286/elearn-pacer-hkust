// Test Yourself Card Component
// Inline comprehension check triggered by user action

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Sparkles 
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComprehensionQuestion } from "./ComprehensionCheck";

interface TestYourselfCardProps {
  question: ComprehensionQuestion | null;
  pageNumber: number;
  onAnswer: (correct: boolean) => void;
  className?: string;
}

/**
 * TestYourselfCard - Inline comprehension check
 * 
 * Shows a collapsible card with the current page's question.
 * User must click to expand and answer - no auto-popup.
 */
const TestYourselfCard = ({
  question,
  pageNumber,
  onAnswer,
  className
}: TestYourselfCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setIsExpanded(false);
  }, [question?.question, pageNumber]);

  if (!question) {
    return null;
  }

  const handleSubmit = () => {
    if (!selectedOption) return;
    
    const selectedIndex = selectedOption.charCodeAt(0) - 65; // A=0, B=1, etc.
    const correct = selectedIndex === question.correctIndex;
    setIsCorrect(correct);
    setHasSubmitted(true);
    onAnswer(correct);
  };

  return (
    <Card className={cn(
      "border-primary/20 transition-all",
      isExpanded && "ring-1 ring-primary/20",
      className
    )}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Test Yourself
              {hasSubmitted && (
                <Badge 
                  variant={isCorrect ? "default" : "destructive"}
                  className="ml-2"
                >
                  {isCorrect ? "Correct!" : "Review needed"}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Page {pageNumber}
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
          {!isExpanded && !hasSubmitted && (
            <p className="text-sm text-muted-foreground text-left mt-1">
              Click to test your understanding of this page
            </p>
          )}
        </CardHeader>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Question */}
          <p className="font-medium text-foreground">
            {question.question}
          </p>

          {/* Options */}
          <RadioGroup
            value={selectedOption || undefined}
            onValueChange={setSelectedOption}
            disabled={hasSubmitted}
            className="space-y-2"
          >
            {question.options.map((option, index) => {
              const optionLetter = String.fromCharCode(65 + index);
              const isSelected = selectedOption === optionLetter;
              const isThisCorrect = question.correctIndex === index;
              
              return (
                <div
                  key={optionLetter}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg border p-3 transition-colors",
                    !hasSubmitted && "hover:bg-muted/50 cursor-pointer",
                    hasSubmitted && isThisCorrect && "border-green-500 bg-green-500/10",
                    hasSubmitted && isSelected && !isThisCorrect && "border-red-500 bg-red-500/10"
                  )}
                >
                  <RadioGroupItem value={optionLetter} id={`option-${optionLetter}`} />
                  <Label 
                    htmlFor={`option-${optionLetter}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    <span className="font-medium mr-2">{optionLetter}.</span>
                    {option}
                  </Label>
                  {hasSubmitted && isThisCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  )}
                  {hasSubmitted && isSelected && !isThisCorrect && (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </RadioGroup>

          {/* Submit / Explanation */}
          {!hasSubmitted ? (
            <Button 
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="w-full"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Check Answer
            </Button>
          ) : (
            <div className={cn(
              "rounded-lg p-4",
              isCorrect ? "bg-green-500/10" : "bg-amber-500/10"
            )}>
              <p className={cn(
                "font-medium mb-2",
                isCorrect ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
              )}>
                {isCorrect ? "Great job!" : "Not quite right"}
              </p>
              <p className="text-sm text-muted-foreground">
                {question.explanation}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default TestYourselfCard;
